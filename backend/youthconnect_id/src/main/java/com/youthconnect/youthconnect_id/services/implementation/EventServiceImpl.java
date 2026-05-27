package com.youthconnect.youthconnect_id.services.implementation;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youthconnect.youthconnect_id.dto.AttendanceResponse;
import com.youthconnect.youthconnect_id.dto.EventRequest;
import com.youthconnect.youthconnect_id.dto.EventResponse;
import com.youthconnect.youthconnect_id.dto.MarkAttendanceRequest;
import com.youthconnect.youthconnect_id.dto.RsvpRequest;
import com.youthconnect.youthconnect_id.dto.UpdateAttendanceStatusRequest;
import com.youthconnect.youthconnect_id.models.Event;
import com.youthconnect.youthconnect_id.models.EventAttendance;
import com.youthconnect.youthconnect_id.repositories.EventAttendanceRepo;
import com.youthconnect.youthconnect_id.repositories.EventRepo;
import com.youthconnect.youthconnect_id.repositories.UserRepo;
import com.youthconnect.youthconnect_id.repositories.projection.EventRsvpCountProjection;
import com.youthconnect.youthconnect_id.services.EmailService;
import com.youthconnect.youthconnect_id.services.EventService;

@Service
public class EventServiceImpl implements EventService {

    @Autowired
    private EventRepo eventRepo;

    @Autowired
    private EventAttendanceRepo eventAttendanceRepo;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private EmailService emailService;
    
    @Autowired
    private com.youthconnect.youthconnect_id.repositories.YouthProfileRepo youthProfileRepo;

    @Autowired
    private com.youthconnect.youthconnect_id.services.NotificationService notificationService;


    //Helpers
    private EventResponse toEventResponse(Event event, long rsvpCount) {
        long expectedCount = userRepo.countByIsActiveTrue();
        EventResponse response = new EventResponse();
        response.setEventId(event.getEventId());
        response.setTitle(event.getTitle());
        response.setDescription(event.getDescription());
        response.setEventDate(event.getEventDate());
        response.setLocation(event.getLocation());
        response.setCreatedByAdminId(event.getCreatedByAdminId());
        response.setStatus(event.getStatus());
        response.setCreatedAt(event.getCreatedAt());
        response.setUpdatedAt(event.getUpdatedAt());
        response.setRsvpCount(rsvpCount);
        response.setExpectedCount(expectedCount);
        response.setAttendeeLimit(event.getAttendeeLimit());
        return response;
    }

    private Map<Integer, Long> getRsvpCountsByEventIds(List<Integer> eventIds) {
        if (eventIds == null || eventIds.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<Integer, Long> counts = new HashMap<>();
        List<EventRsvpCountProjection> groupedCounts = eventAttendanceRepo.countRsvpsByEventIds(eventIds);
        for (EventRsvpCountProjection groupedCount : groupedCounts) {
            counts.put(groupedCount.getEventId(), groupedCount.getRsvpCount());
        }
        return counts;
    }

    private AttendanceResponse toAttendanceResponse(EventAttendance attendance) {
        AttendanceResponse response = new AttendanceResponse();
        response.setAttendanceId(attendance.getAttendanceId());
        response.setEventId(attendance.getEventId());
        response.setUserId(attendance.getUserId());
        response.setAttended(attendance.isAttended());
        response.setApprovalStatus(attendance.getApprovalStatus() != null ? attendance.getApprovalStatus() : "pending");
        response.setRejectionReason(attendance.getRejectionReason());
        response.setRegisteredAt(attendance.getRegisteredAt());
        response.setAttendedAt(attendance.getAttendedAt());
        return response;
    }

    //SkOfficial
    @Override
    @Transactional
    public EventResponse createEvent(EventRequest request) {
        Event event = new Event();
        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setEventDate(request.getEventDate());
        event.setLocation(request.getLocation());
        event.setCreatedByAdminId(request.getCreatedByAdminId());
        event.setStatus(request.getStatus() != null ? request.getStatus() : "Upcoming");
        event.setCreatedAt(LocalDateTime.now());
        event.setAttendeeLimit(request.getAttendeeLimit());
        
        Event savedEvent = eventRepo.save(event);
        
        // Send email notifications to all approved youth users
        notifyYouthUsersAboutNewEvent(savedEvent);
        
        return toEventResponse(savedEvent, 0L);
    }
    
    private void notifyYouthUsersAboutNewEvent(Event event) {
        try {
            // Get all approved users
            List<com.youthconnect.youthconnect_id.models.User> approvedUsers = userRepo.findByStatus("approved");
            
            if (approvedUsers.isEmpty()) {
                System.out.println("⚠️ No approved users to notify about new event");
                return;
            }
            
            System.out.println("📧 Queuing event notifications for " + approvedUsers.size() + " approved users (async)");
            
            // Format event date
            String formattedDate = event.getEventDate() != null ? 
                event.getEventDate().toString() : "TBA";
            
            // Create DATABASE notifications
            notificationService.createNewEventNotification(event.getEventId(), event.getTitle());
            
            // Also send emails asynchronously in background
            emailService.sendNewEventNotificationsAsync(
                approvedUsers,
                event.getTitle(),
                event.getDescription(),
                formattedDate,
                event.getLocation()
            );
            
            System.out.println("✅ Event notification task queued successfully (will process in background)");
        } catch (Exception e) {
            System.err.println("❌ Error queuing event notifications: " + e.getMessage());
            e.printStackTrace();
            // Don't throw exception - event creation should succeed even if email queuing fails
        }
    }

    @Override
    @Transactional
    public EventResponse editEvent(int eventId, EventRequest request) {
        Event event = eventRepo.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        
        // Store old status to detect changes
        String oldStatus = event.getStatus();
        
        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setEventDate(request.getEventDate());
        event.setLocation(request.getLocation());
        event.setStatus(request.getStatus());
        event.setAttendeeLimit(request.getAttendeeLimit());
        event.setUpdatedAt(LocalDateTime.now());
        Event updated = eventRepo.save(event);
        
        // Check if status changed and notify registered users
        String newStatus = request.getStatus();
        if (newStatus != null && !newStatus.equalsIgnoreCase(oldStatus)) {
            // Only send notifications for specific status changes
            if (newStatus.equalsIgnoreCase("Ongoing") || 
                newStatus.equalsIgnoreCase("Completed") || 
                newStatus.equalsIgnoreCase("Cancelled")) {
                notifyRegisteredUsersAboutStatusChange(updated, newStatus);
            }
        }
        
        long rsvpCount = eventAttendanceRepo.countByEventId(updated.getEventId());
        return toEventResponse(updated, rsvpCount);
    }
    
    private void notifyRegisteredUsersAboutStatusChange(Event event, String newStatus) {
        try {
            // Only approved attendees should receive event status notifications.
            List<EventAttendance> attendances = eventAttendanceRepo
                    .findByEventIdAndApprovalStatusIgnoreCase(event.getEventId(), "approved");
            
            if (attendances.isEmpty()) {
                System.out.println("⚠️ No approved attendees to notify about status change for event: " + event.getTitle());
                return;
            }
            
            System.out.println("📧 Queuing event status change notifications (" + newStatus + ") for " + 
                             attendances.size() + " approved attendees (async)");
            
            // Get user objects from attendances
            List<com.youthconnect.youthconnect_id.models.User> registeredUsers = new java.util.ArrayList<>();
            List<Integer> userIds = new java.util.ArrayList<>();
            for (EventAttendance attendance : attendances) {
                com.youthconnect.youthconnect_id.models.User user = 
                    userRepo.findById(attendance.getUserId()).orElse(null);
                if (user != null) {
                    registeredUsers.add(user);
                    userIds.add(user.getUserId());
                }
            }
            
            if (registeredUsers.isEmpty()) {
                System.out.println("⚠️ No valid users found for status change notification");
                return;
            }
            
            // Format event date
            String formattedDate = event.getEventDate() != null ? 
                event.getEventDate().toString() : "TBA";
            
            // Create DATABASE notifications
            notificationService.createEventStatusNotification(event.getEventId(), event.getTitle(), newStatus, userIds);
            
            // Also send emails asynchronously in background
            emailService.sendEventStatusChangeNotificationsAsync(
                registeredUsers,
                event.getTitle(),
                event.getDescription(),
                formattedDate,
                event.getLocation(),
                newStatus
            );
            
            System.out.println("✅ Status change notification task queued successfully (will process in background)");
        } catch (Exception e) {
            System.err.println("❌ Error queuing event status change notifications: " + e.getMessage());
            e.printStackTrace();
            // Don't throw exception - event update should succeed even if email queuing fails
        }
    }

    @Override
    @Transactional
    public void deleteEvent(int eventId) {
        Event event = eventRepo.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        notificationService.deleteNotificationsByEventId(eventId);
        eventRepo.delete(event);
    }

    @Override
    public List<EventResponse> getAllEvents() {
        List<Event> events = eventRepo.findAll();
        Map<Integer, Long> rsvpCounts = getRsvpCountsByEventIds(events.stream().map(Event::getEventId).collect(Collectors.toList()));

        return events
                .stream()
                .sorted((e1, e2) -> e2.getCreatedAt().compareTo(e1.getCreatedAt())) // Latest first
            .map(event -> toEventResponse(event, rsvpCounts.getOrDefault(event.getEventId(), 0L)))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AttendanceResponse markAttendance(int eventId, MarkAttendanceRequest request) {
        EventAttendance attendance = eventAttendanceRepo
                .findByEventIdAndUserId(eventId, request.getUserId())
                .orElseThrow(() -> new RuntimeException("RSVP not found for this user and event"));

        attendance.setAttended(true);
        attendance.setAttendedAt(LocalDateTime.now());
        return toAttendanceResponse(eventAttendanceRepo.save(attendance));
    }

    //Youth
    @Override
    public EventResponse getEventById(int eventId) {
        Event event = eventRepo.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        long rsvpCount = eventAttendanceRepo.countByEventId(eventId);
        return toEventResponse(event, rsvpCount);
    }

    @Override
    @Transactional
    public AttendanceResponse rsvpEvent(RsvpRequest request) {
        // Check if already RSVP'd
        eventAttendanceRepo.findByEventIdAndUserId(request.getEventId(), request.getUserId())
                .ifPresent(a -> { throw new RuntimeException("Already RSVP'd to this event"); });

        // Check if event exists
        eventRepo.findById(request.getEventId())
                .orElseThrow(() -> new RuntimeException("Event not found"));

        // Check if user exists
        if (!userRepo.existsById(request.getUserId())) {
            throw new RuntimeException("User not found");
        }

        EventAttendance attendance = new EventAttendance();
        attendance.setEventId(request.getEventId());
        attendance.setUserId(request.getUserId());
        attendance.setAttended(false);
        attendance.setRegisteredAt(LocalDateTime.now());

        try {
            return toAttendanceResponse(eventAttendanceRepo.save(attendance));
        } catch (DataIntegrityViolationException ex) {
            // Handles race condition where duplicate RSVP is inserted concurrently.
            throw new RuntimeException("Already RSVP'd to this event");
        }
    }

    @Override
    public void cancelRsvp(int eventId, int userId) {
        EventAttendance attendance = eventAttendanceRepo
                .findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new RuntimeException("RSVP not found"));
        eventAttendanceRepo.delete(attendance);
    }

    @Override
    public List<AttendanceResponse> getOwnRsvps(int userId) {
        return eventAttendanceRepo.findByUserId(userId)
                .stream()
                .map(this::toAttendanceResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<AttendanceResponse> getEventRsvps(int eventId) {
        return eventAttendanceRepo.findByEventId(eventId)
                .stream()
                .map(this::toAttendanceResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AttendanceResponse updateAttendanceStatus(int eventId, int attendanceId, UpdateAttendanceStatusRequest request) {
        System.out.println("=== UPDATE ATTENDANCE STATUS CALLED ===");
        System.out.println("Event ID: " + eventId);
        System.out.println("Attendance ID: " + attendanceId);
        System.out.println("Requested Status: " + request.getApprovalStatus());
        System.out.println("Rejection Reason: " + request.getRejectionReason());
        
        EventAttendance attendance = eventAttendanceRepo.findById(attendanceId)
                .orElseThrow(() -> new RuntimeException("Attendance record not found"));

        if (attendance.getEventId() != eventId) {
            throw new RuntimeException("Attendance record does not belong to this event");
        }

        String status = request.getApprovalStatus();
        if (!"approved".equalsIgnoreCase(status) && !"rejected".equalsIgnoreCase(status) && !"pending".equalsIgnoreCase(status)) {
            throw new RuntimeException("Invalid approval status. Must be 'approved', 'rejected', or 'pending'");
        }

        attendance.setApprovalStatus(status.toLowerCase());
        
        // Save rejection reason if rejecting
        if ("rejected".equalsIgnoreCase(status)) {
            attendance.setRejectionReason(request.getRejectionReason());
        } else {
            // Clear rejection reason if approving
            attendance.setRejectionReason(null);
        }
        
        AttendanceResponse response = toAttendanceResponse(eventAttendanceRepo.save(attendance));
        
        System.out.println("✅ Attendance status updated successfully");
        
        // Send email notification to the attendee
        try {
            System.out.println("=== ATTEMPTING TO SEND EMAIL NOTIFICATION ===");
            
            // Get user and event details
            com.youthconnect.youthconnect_id.models.User user = userRepo.findById(attendance.getUserId())
                    .orElse(null);
            
            if (user == null) {
                System.err.println("❌ User not found with ID: " + attendance.getUserId());
                return response;
            }
            
            System.out.println("✅ User found: " + user.getEmail());
            
            Event event = eventRepo.findById(eventId)
                    .orElse(null);
            
            if (event == null) {
                System.err.println("❌ Event not found with ID: " + eventId);
                return response;
            }
            
            System.out.println("✅ Event found: " + event.getTitle());

            try {
                boolean approved = "approved".equalsIgnoreCase(status);
                notificationService.createAttendeeDecisionNotification(
                        eventId,
                        attendance.getAttendanceId(),
                        user.getUserId(),
                        user.getYouthId(),
                        event.getTitle(),
                        approved,
                        request.getRejectionReason()
                );
                System.out.println("✅ Attendee notification saved successfully");
            } catch (Exception notificationError) {
                System.err.println("❌ Failed to create attendee notification: " + notificationError.getMessage());
                notificationError.printStackTrace();
            }
            
            // Get user's name from youth profile
            com.youthconnect.youthconnect_id.models.YouthProfile profile = 
                youthProfileRepo.findById(user.getYouthId()).orElse(null);
            
            if (profile == null) {
                System.err.println("❌ Youth profile not found for youth ID: " + user.getYouthId());
                return response;
            }
            
            System.out.println("✅ Profile found: " + profile.getFirstName() + " " + profile.getLastName());
            
            String userName = profile.getFirstName();
            String eventDate = event.getEventDate() != null ? event.getEventDate().toString() : "TBA";
            
            if ("approved".equalsIgnoreCase(status)) {
                System.out.println("📧 Sending attendee APPROVAL email to: " + user.getEmail());
                emailService.sendAttendeeApprovalEmail(
                    user.getEmail(),
                    userName,
                    event.getTitle(),
                    eventDate,
                    event.getLocation()
                );
                System.out.println("✅ Approval email sent successfully!");
            } else if ("rejected".equalsIgnoreCase(status)) {
                System.out.println("📧 Sending attendee REJECTION email to: " + user.getEmail());
                String rejectionReason = request.getRejectionReason() != null ? 
                    request.getRejectionReason() : "Not specified";
                emailService.sendAttendeeRejectionEmail(
                    user.getEmail(),
                    userName,
                    event.getTitle(),
                    rejectionReason
                );
                System.out.println("✅ Rejection email sent successfully!");
            }
        } catch (Exception e) {
            System.err.println("❌ Failed to send attendee status email: " + e.getMessage());
            e.printStackTrace();
            // Don't fail the status update if email fails
        }
        
        System.out.println("=== UPDATE ATTENDANCE STATUS COMPLETED ===");
        return response;
    }
}