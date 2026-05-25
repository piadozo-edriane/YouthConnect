package com.youthconnect.youthconnect_id.services;

import com.youthconnect.youthconnect_id.models.User;

public interface EmailService {
    void sendApprovalEmail(String to, String firstName);
    void sendRejectionEmail(String to, String firstName, String reason);
    void notifySkOfficialsNewUser(User user, String youthName);
    void sendRegistrationConfirmationEmail(String to, String firstName);
    void sendPasswordResetEmail(String toEmail, String firstName, String resetToken, boolean isSkOfficial);
    void sendNewEventNotification(String toEmail, String userName, String eventTitle, String eventDescription, 
                                   String eventDate, String eventLocation);
    void sendEventStatusChangeNotification(String toEmail, String userName, String eventTitle, String eventDescription,
                                          String eventDate, String eventLocation, String newStatus);
    
    // Async methods for bulk notifications
    void sendNewEventNotificationsAsync(java.util.List<User> users, String eventTitle, String eventDescription,
                                       String eventDate, String eventLocation);
    void sendEventStatusChangeNotificationsAsync(java.util.List<User> users, String eventTitle, String eventDescription,
                                                String eventDate, String eventLocation, String newStatus);
    
    // Task assignment notification (async)
    void sendTaskAssignmentNotificationAsync(String toEmail, String skOfficialName, String taskTitle, 
                                            String taskDescription, String dueDate, String assignedBy);
    
    // Attendee approval/rejection notifications
    void sendAttendeeApprovalEmail(String toEmail, String userName, String eventTitle, String eventDate, String eventLocation);
    void sendAttendeeRejectionEmail(String toEmail, String userName, String eventTitle, String rejectionReason);
}
