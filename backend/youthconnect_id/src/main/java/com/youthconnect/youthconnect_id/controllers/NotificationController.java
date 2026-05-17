package com.youthconnect.youthconnect_id.controllers;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;

import com.youthconnect.youthconnect_id.dto.NotificationResponse;
import com.youthconnect.youthconnect_id.services.NotificationService;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:4200")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    /**
     * Get all notifications for a youth user (concern updates - legacy endpoint)
     */
    @GetMapping("/youth/{youthId}")
    public ResponseEntity<?> getNotificationsByYouthId(@PathVariable int youthId) {
        try {
            List<NotificationResponse> notifications = notificationService.getNotificationsByYouthId(youthId);
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to fetch notifications: " + e.getMessage());
        }
    }

    /**
     * Get all notifications for a user (new endpoint)
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getNotificationsByUserId(@PathVariable int userId) {
        try {
            List<NotificationResponse> notifications = notificationService.getNotificationsByUserId(userId);
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to fetch notifications: " + e.getMessage());
        }
    }

    /**
     * Get unread notifications for a user
     */
    @GetMapping("/user/{userId}/unread")
    public ResponseEntity<?> getUnreadNotifications(@PathVariable int userId) {
        try {
            List<NotificationResponse> notifications = notificationService.getUnreadNotificationsByUserId(userId);
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to fetch unread notifications: " + e.getMessage());
        }
    }

    /**
     * Get unread notification count for a user
     */
    @GetMapping("/user/{userId}/unread-count")
    public ResponseEntity<?> getUnreadNotificationCount(@PathVariable int userId) {
        try {
            Long count = notificationService.getUnreadNotificationCount(userId);
            Map<String, Object> response = new HashMap<>();
            response.put("unreadCount", count);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to fetch unread notification count: " + e.getMessage());
        }
    }

    /**
     * Get unread notification count for the currently logged-in user
     */
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadNotificationCountForCurrentUser(HttpServletRequest request) {
        try {
            Object userIdAttr = request.getAttribute("userId");
            if (!(userIdAttr instanceof Integer userId)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("User is not authenticated");
            }

            Long count = notificationService.getUnreadNotificationCount(userId);
            Map<String, Object> response = new HashMap<>();
            response.put("unreadCount", count);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to fetch unread notification count: " + e.getMessage());
        }
    }

    /**
     * Mark a notification as read
     */
    @PutMapping("/{notificationId}/read")
    public ResponseEntity<?> markAsRead(@PathVariable int notificationId) {
        try {
            notificationService.markNotificationAsRead(notificationId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Notification marked as read");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to mark notification as read: " + e.getMessage());
        }
    }

    /**
     * Mark all notifications as read for a user
     */
    @PutMapping("/user/{userId}/mark-all-read")
    public ResponseEntity<?> markAllAsRead(@PathVariable int userId) {
        try {
            notificationService.markAllAsRead(userId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "All notifications marked as read");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to mark all notifications as read: " + e.getMessage());
        }
    }
}

