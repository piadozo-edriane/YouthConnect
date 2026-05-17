package com.youthconnect.youthconnect_id.services;

import java.util.List;

import com.youthconnect.youthconnect_id.dto.NotificationResponse;

public interface NotificationService {
    // Get notifications
    List<NotificationResponse> getNotificationsByYouthId(int youthId);
    List<NotificationResponse> getNotificationsByUserId(int userId);
    List<NotificationResponse> getUnreadNotificationsByUserId(int userId);
    Long getUnreadNotificationCount(int userId);
    
    // Create notifications
    void createNewEventNotification(int eventId, String eventTitle);
    void createEventStatusNotification(int eventId, String eventTitle, String newStatus, List<Integer> userIds);
    void createConcernUpdateNotification(int concernId, int youthId, String status, String updateText);
    
    // Mark as read
    void markNotificationAsRead(int notificationId);
    void markAllAsRead(int userId);
}
