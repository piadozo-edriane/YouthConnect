package com.youthconnect.youthconnect_id.services.implementation;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youthconnect.youthconnect_id.dto.NotificationResponse;
import com.youthconnect.youthconnect_id.models.ConcernUpdate;
import com.youthconnect.youthconnect_id.models.Notification;
import com.youthconnect.youthconnect_id.repositories.ConcernRepo;
import com.youthconnect.youthconnect_id.repositories.ConcernUpdateRepo;
import com.youthconnect.youthconnect_id.repositories.EventAttendanceRepo;
import com.youthconnect.youthconnect_id.repositories.NotificationRepo;
import com.youthconnect.youthconnect_id.repositories.SkOfficialRepo;
import com.youthconnect.youthconnect_id.repositories.UserRepo;
import com.youthconnect.youthconnect_id.services.NotificationService;

@Service
public class NotificationServiceImpl implements NotificationService {

    @Autowired
    private NotificationRepo notificationRepo;

    @Autowired
    private ConcernUpdateRepo concernUpdateRepo;

    @Autowired
    private ConcernRepo concernRepo;

    @Autowired
    private SkOfficialRepo skOfficialRepo;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private EventAttendanceRepo eventAttendanceRepo;

    /**
     * Get all notifications for a youth user (from concern updates - backward compatibility)
     */
    @Override
    public List<NotificationResponse> getNotificationsByYouthId(int youthId) {
        List<ConcernUpdate> updates = concernUpdateRepo.findByYouthId(youthId);
        
        return updates.stream()
                .sorted((u1, u2) -> u2.getCreatedAt().compareTo(u1.getCreatedAt())) // Latest first
                .map(update -> {
            NotificationResponse response = new NotificationResponse();
            response.setUpdateId(update.getUpdateId());
            response.setConcernId(update.getConcernId());
            response.setUpdateText(update.getUpdateText());
            response.setCreatedAt(update.getCreatedAt());
            response.setType(Notification.TYPE_CONCERN_UPDATE);
            
            // Get concern title
            concernRepo.findById(update.getConcernId()).ifPresent(concern -> {
                response.setConcernTitle(concern.getTitle());
            });
            
            // Get admin name
            if (update.getUpdatedByAdminId() != null) {
                skOfficialRepo.findById(update.getUpdatedByAdminId()).ifPresent(admin -> {
                    String adminName = admin.getFirstName() + " " + admin.getLastName();
                    response.setUpdatedByAdminName(adminName);
                });
            }
            
            return response;
        }).collect(Collectors.toList());
    }

    /**
     * Get all notifications for a user
     */
    @Override
    public List<NotificationResponse> getNotificationsByUserId(int userId) {
        List<Notification> notifications = notificationRepo.findByUserIdOrderByCreatedAtDesc(userId);
        
        return notifications.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get unread notifications for a user
     */
    @Override
    public List<NotificationResponse> getUnreadNotificationsByUserId(int userId) {
        List<Notification> notifications = notificationRepo.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        
        return notifications.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get count of unread notifications for a user
     */
    @Override
    public Long getUnreadNotificationCount(int userId) {
        return notificationRepo.countByUserIdAndIsReadFalse(userId);
    }

    /**
     * Create a notification for new event (for all approved youth users)
     */
    @Override
    @Transactional
    public void createNewEventNotification(int eventId, String eventTitle) {
        try {
            // Get all approved users
            List<com.youthconnect.youthconnect_id.models.User> approvedUsers = 
                userRepo.findByStatus("approved");
            
            if (approvedUsers.isEmpty()) {
                System.out.println("⚠️ No approved users to create new event notifications");
                return;
            }
            
            String notificationTitle = "New Event Posted";
            String notificationMessage = "A new event has been posted: " + eventTitle;
            
            // Create notification for each approved user
            for (com.youthconnect.youthconnect_id.models.User user : approvedUsers) {
                Notification notification = new Notification();
                notification.setUserId(user.getUserId());
                notification.setYouthId(user.getYouthId());
                notification.setTitle(notificationTitle);
                notification.setMessage(notificationMessage);
                notification.setType(Notification.TYPE_NEW_EVENT);
                notification.setRelatedEventId(eventId);
                notification.setRead(false);
                notification.setCreatedAt(LocalDateTime.now());
                
                notificationRepo.save(notification);
            }
            
            System.out.println("✅ Created new event notifications for " + approvedUsers.size() + " users");
        } catch (Exception e) {
            System.err.println("❌ Error creating new event notifications: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Create notifications for event status change (for registered users)
     */
    @Override
    @Transactional
    public void createEventStatusNotification(int eventId, String eventTitle, String newStatus, 
                                              List<Integer> userIds) {
        try {
            if (userIds == null || userIds.isEmpty()) {
                System.out.println("⚠️ No users to create event status notifications");
                return;
            }

            Set<Integer> approvedUserIds = new HashSet<>(
                    eventAttendanceRepo.findUserIdsByEventIdAndApprovalStatus(eventId, "approved")
            );

            if (approvedUserIds.isEmpty()) {
                System.out.println("⚠️ No approved attendees found for event status notifications");
                return;
            }
            
            String notificationTitle = "Event Status Changed";
            String notificationMessage = "The event '" + eventTitle + "' is now " + newStatus;
            
            int createdCount = 0;

            // Create notification for each user
            for (Integer userId : userIds) {
                if (!approvedUserIds.contains(userId)) {
                    continue;
                }

                com.youthconnect.youthconnect_id.models.User user = userRepo.findById(userId).orElse(null);
                if (user != null) {
                    Notification notification = new Notification();
                    notification.setUserId(user.getUserId());
                    notification.setYouthId(user.getYouthId());
                    notification.setTitle(notificationTitle);
                    notification.setMessage(notificationMessage);
                    notification.setType(Notification.TYPE_EVENT_STATUS);
                    notification.setRelatedEventId(eventId);
                    notification.setRead(false);
                    notification.setCreatedAt(LocalDateTime.now());
                    
                    notificationRepo.save(notification);
                    createdCount++;
                }
            }
            
            System.out.println("✅ Created event status notifications for " + createdCount + " approved attendees");
        } catch (Exception e) {
            System.err.println("❌ Error creating event status notifications: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Create notification for concern update (backward compatibility)
     */
    @Override
    @Transactional
    public void createConcernUpdateNotification(int concernId, int youthId, String status, String updateText) {
        try {
            com.youthconnect.youthconnect_id.models.User user = userRepo.findByYouthId(youthId).orElse(null);
            if (user == null) {
                System.out.println("⚠️ No user found for youthId=" + youthId + " when creating concern update notification");
                return;
            }
            // Format title: CONCERN UPDATE: <STATUS> (replace underscores with spaces)
            String formattedStatus = (status == null) ? "" : status.replace('_', ' ').trim();
            String title = "CONCERN UPDATE" + (formattedStatus.isEmpty() ? "" : ": " + formattedStatus);

            // Prevent duplicate notifications for the same user/concern/type/message
            boolean exists = notificationRepo.existsByUserIdAndRelatedConcernIdAndTypeAndMessage(
                user.getUserId(), concernId, Notification.TYPE_CONCERN_UPDATE, updateText
            );

            if (exists) {
                System.out.println("⚠️ Duplicate concern notification detected for userId=" + user.getUserId() + ", skipping creation");
                return;
            }

            Notification notification = new Notification();
            notification.setUserId(user.getUserId());
            notification.setYouthId(youthId);
            notification.setTitle(title);
            notification.setMessage(updateText);
            notification.setType(Notification.TYPE_CONCERN_UPDATE);
            notification.setRelatedConcernId(concernId);
            notification.setRead(false);
            notification.setCreatedAt(LocalDateTime.now());

            notificationRepo.save(notification);
            System.out.println("✅ Created concern update notification for userId=" + user.getUserId());
        } catch (Exception e) {
            System.err.println("❌ Error creating concern update notification: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Create a notification for a single attendee when their event join request is approved or rejected.
     */
    @Override
    @Transactional
    public void createAttendeeDecisionNotification(int eventId, int attendanceId, int userId, int youthId,
                                                   String eventTitle, boolean approved, String rejectionReason) {
        try {
            String type = approved ? Notification.TYPE_EVENT_JOIN_APPROVED : Notification.TYPE_EVENT_JOIN_REJECTED;
            String title = approved ? "EVENT JOIN REQUEST APPROVED" : "EVENT JOIN REQUEST REJECTED";
            String message = approved
                    ? "Your request to join the event \"" + eventTitle + "\" has been approved."
                    : "Your request to join the event \"" + eventTitle + "\" has been rejected.";

            boolean exists = notificationRepo.existsByUserIdAndRelatedEventIdAndRelatedAttendanceIdAndTypeAndTitle(
                    userId,
                    eventId,
                    attendanceId,
                    type,
                    title
            );

            if (exists) {
                System.out.println("⚠️ Duplicate attendee decision notification detected for userId=" + userId + ", skipping creation");
                return;
            }

            Notification notification = new Notification();
            notification.setUserId(userId);
            notification.setYouthId(youthId);
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setType(type);
            notification.setRelatedEventId(eventId);
            notification.setRelatedAttendanceId(attendanceId);
            notification.setRead(false);
            notification.setCreatedAt(LocalDateTime.now());

            notificationRepo.save(notification);
            System.out.println("✅ Created attendee decision notification for userId=" + userId + ", attendanceId=" + attendanceId);
        } catch (Exception e) {
            System.err.println("❌ Error creating attendee decision notification: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Delete all notifications linked to a specific event.
     */
    @Override
    @Transactional
    public void deleteNotificationsByEventId(int eventId) {
        notificationRepo.deleteByRelatedEventId(eventId);
    }

    /**
     * Delete all notifications linked to a specific concern.
     */
    @Override
    @Transactional
    public void deleteNotificationsByConcernId(int concernId) {
        notificationRepo.deleteByRelatedConcernId(concernId);
    }

    /**
     * Mark a notification as read
     */
    @Override
    @Transactional
    public void markNotificationAsRead(int notificationId) {
        notificationRepo.findById(notificationId).ifPresent(notification -> {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationRepo.save(notification);
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    @Override
    @Transactional
    public void markAllAsRead(int userId) {
        List<Notification> unreadNotifications = 
            notificationRepo.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        
        for (Notification notification : unreadNotifications) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
        }
        
        notificationRepo.saveAll(unreadNotifications);
    }

    /**
     * Convert Notification entity to NotificationResponse DTO
     */
    private NotificationResponse convertToResponse(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.setNotificationId(notification.getNotificationId());
        response.setUserId(notification.getUserId());
        response.setYouthId(notification.getYouthId());
        response.setTitle(notification.getTitle());
        response.setMessage(notification.getMessage());
        response.setType(notification.getType());
        response.setRelatedEventId(notification.getRelatedEventId());
        response.setRelatedAttendanceId(notification.getRelatedAttendanceId());
        response.setRelatedConcernId(notification.getRelatedConcernId());
        response.setRead(notification.isRead());
        response.setCreatedAt(notification.getCreatedAt());
        response.setReadAt(notification.getReadAt());
        return response;
    }
}


