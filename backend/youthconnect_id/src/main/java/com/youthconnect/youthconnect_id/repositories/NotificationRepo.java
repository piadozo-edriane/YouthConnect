package com.youthconnect.youthconnect_id.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.youthconnect.youthconnect_id.models.Notification;

@Repository
public interface NotificationRepo extends JpaRepository<Notification, Integer> {
    
    /**
     * Get all notifications for a user, ordered by creation date (newest first)
     */
    List<Notification> findByUserIdOrderByCreatedAtDesc(int userId);
    
    /**
     * Get unread notifications for a user
     */
    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(int userId);
    
    /**
     * Get unread notification count for a user
     */
    Long countByUserIdAndIsReadFalse(int userId);
    
    /**
     * Get notifications for an event
     */
    List<Notification> findByRelatedEventIdOrderByCreatedAtDesc(int eventId);
    
    /**
     * Get notifications for a concern
     */
    List<Notification> findByRelatedConcernIdOrderByCreatedAtDesc(int concernId);
    
    /**
     * Find notifications by type and user
     */
    List<Notification> findByUserIdAndTypeOrderByCreatedAtDesc(int userId, String type);

    /**
     * Check if a notification exists for a user about a specific concern with the same message and type
     */
    boolean existsByUserIdAndRelatedConcernIdAndTypeAndMessage(int userId, Integer relatedConcernId, String type, String message);

    /**
     * Check if an attendee decision notification already exists for the same user, event, attendance record, and title.
     */
    boolean existsByUserIdAndRelatedEventIdAndRelatedAttendanceIdAndTypeAndTitle(int userId, int relatedEventId, int relatedAttendanceId, String type, String title);

    /**
     * Delete all notifications linked to a specific event.
     */
    long deleteByRelatedEventId(int eventId);

    /**
     * Delete all notifications linked to a specific concern.
     */
    long deleteByRelatedConcernId(int concernId);
}
