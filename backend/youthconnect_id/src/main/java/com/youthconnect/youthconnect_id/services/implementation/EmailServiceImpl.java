package com.youthconnect.youthconnect_id.services.implementation;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.youthconnect.youthconnect_id.models.User;
import com.youthconnect.youthconnect_id.repositories.SkOfficialRepo;
import com.youthconnect.youthconnect_id.services.EmailService;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailServiceImpl implements EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private SkOfficialRepo skOfficialRepo;
    
    @Autowired
    private com.youthconnect.youthconnect_id.repositories.YouthProfileRepo youthProfileRepo;

    @Value("${app.base.url}")
    private String baseUrl;

    @Value("${spring.mail.properties.mail.smtp.from}")
    private String fromEmail;

    @Override
    public void sendApprovalEmail(String to, String firstName) {
        try {
            System.out.println("📧 Building approval email...");
            System.out.println("From: " + fromEmail);
            System.out.println("To: " + to);
            System.out.println("Subject: YouthConnect - Account Approved");
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "YouthConnect - Barangay 183");
            helper.setTo(to);
            helper.setSubject("YouthConnect - Account Approved");
            helper.setText(buildApprovalEmailTemplate(firstName, baseUrl), true);

            System.out.println("📤 Sending approval email via SMTP...");
            mailSender.send(message);
            System.out.println("✅ Approval email sent successfully!");
        } catch (Exception e) {
            // Log error but don't fail the approval process
            System.err.println("❌ Failed to send approval email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public void sendRejectionEmail(String to, String firstName, String reason) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "YouthConnect - Barangay 183");
            helper.setTo(to);
            helper.setSubject("YouthConnect - Account Application Update");
            helper.setText(buildRejectionEmailTemplate(firstName, reason), true);

            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send rejection email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public void notifySkOfficialsNewUser(User user, String youthName) {
        try {
            List<String> skEmails = skOfficialRepo.findAllActiveEmails();
            
            if (skEmails.isEmpty()) {
                return;
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "YouthConnect - Barangay 183");
            helper.setTo(skEmails.toArray(new String[0]));
            helper.setSubject("YouthConnect - New User Pending Approval");
            helper.setText(buildNewUserNotificationTemplate(youthName, user.getEmail(), 
                user.getCreatedAt().toString(), baseUrl), true);

            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send notification to SK officials: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public void sendRegistrationConfirmationEmail(String to, String firstName) {
        try {
            System.out.println("📧 Building registration confirmation email...");
            System.out.println("From: " + fromEmail);
            System.out.println("To: " + to);
            System.out.println("Subject: YouthConnect - Account Registration Successful!");
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "YouthConnect - Barangay 183");
            helper.setTo(to);
            helper.setSubject("YouthConnect - Account Registration Successful!");
            helper.setText(buildRegistrationConfirmationTemplate(firstName), true);

            System.out.println("📤 Sending email via SMTP...");
            mailSender.send(message);
            System.out.println("✅ Email sent successfully!");
        } catch (Exception e) {
            System.err.println("❌ Failed to send registration confirmation email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String buildApprovalEmailTemplate(String firstName, String loginUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Account Approved!</h1>
                    </div>
                    <div class="content">
                        <p>Hi <strong>%s</strong>,</p>
                        <p>Great news! Your YouthConnect account has been approved by SK officials of Barangay 183.</p>
                        <p>You can now login and access all features of the platform including:</p>
                        <ul>
                            <li>View and register for events</li>
                            <li>Submit concerns and track their status</li>
                            <li>Receive notifications and updates</li>
                            <li>Access youth programs and services</li>
                        </ul>
                        <center>
                            <a href="%s/login" class="button">Login Now</a>
                        </center>
                        <p>Welcome to YouthConnect! We're excited to have you as part of our community.</p>
                    </div>
                    <div class="footer">
                        <p>YouthConnect - Sangguniang Kabataan, Barangay 183</p>
                    </div>
                </div>
            </body>
            </html>
        """.formatted(firstName, loginUrl);
    }

    private String buildRejectionEmailTemplate(String firstName, String reason) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .reason-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Account Application Update</h1>
                    </div>
                    <div class="content">
                        <p>Hi <strong>%s</strong>,</p>
                        <p>Thank you for your interest in YouthConnect. Unfortunately, your account application was not approved at this time.</p>
                        <div class="reason-box">
                            <strong>Reason:</strong> %s
                        </div>
                        <p>If you believe this is a mistake or have questions about this decision, please contact the SK officials at Barangay 183.</p>
                        <p>You may also visit the Barangay 183 office during office hours for assistance.</p>
                    </div>
                    <div class="footer">
                        <p>YouthConnect - Sangguniang Kabataan, Barangay 183</p>
                    </div>
                </div>
            </body>
            </html>
        """.formatted(firstName, reason != null && !reason.isBlank() ? reason : "Not specified");
    }

    private String buildNewUserNotificationTemplate(String youthName, String email, 
            String registeredDate, String adminUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .info-box { background-color: white; border: 1px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 5px; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>New User Pending Approval</h1>
                    </div>
                    <div class="content">
                        <p>A new user has registered on YouthConnect and is waiting for approval:</p>
                        <div class="info-box">
                            <p><strong>Name:</strong> %s</p>
                            <p><strong>Email:</strong> %s</p>
                            <p><strong>Registered:</strong> %s</p>
                        </div>
                        <p>Please review the user's profile and approve or reject their application.</p>
                        <center>
                            <a href="%s/admin/user-management" class="button">Review User</a>
                        </center>
                    </div>
                    <div class="footer">
                        <p>YouthConnect Admin Panel</p>
                    </div>
                </div>
            </body>
            </html>
        """.formatted(youthName, email, registeredDate, adminUrl);
    }

    private String buildRegistrationConfirmationTemplate(String firstName) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .info-box { background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Account Registration Successful!</h1>
                    </div>
                    <div class="content">
                        <p>Hi <strong>%s</strong>,</p>
                        <p>Thank you for registering with YouthConnect!</p>
                        <div class="info-box">
                            <p><strong>✅ Your account has been created successfully.</strong></p>
                            <p>Your account will now be reviewed and approved by the administrator or SK officials.</p>
                            <p>You will receive an email notification once your account is approved.</p>
                        </div>
                        <p>This process typically takes 1-2 business days. Once approved, you'll be able to:</p>
                        <ul>
                            <li>View and register for events</li>
                            <li>Submit concerns and track their status</li>
                            <li>Receive notifications and updates</li>
                            <li>Access youth programs and services</li>
                        </ul>
                        <p>Thank you for joining YouthConnect!</p>
                    </div>
                    <div class="footer">
                        <p>YouthConnect - Sangguniang Kabataan, Barangay 183</p>
                    </div>
                </div>
            </body>
            </html>
        """.formatted(firstName);
    }

    @Override
    public void sendPasswordResetEmail(String toEmail, String firstName, String resetToken, boolean isSkOfficial) {
        try {
            System.out.println("🔐 Building password reset email...");
            System.out.println("From: " + fromEmail);
            System.out.println("To: " + toEmail);
            System.out.println("Subject: YouthConnect - Password Reset Request");
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "YouthConnect - Barangay 183");
            helper.setTo(toEmail);
            helper.setSubject("YouthConnect - Password Reset Request 🔐");
            helper.setText(buildPasswordResetEmailTemplate(firstName, resetToken, isSkOfficial), true);

            System.out.println("📤 Sending password reset email via SMTP...");
            mailSender.send(message);
            System.out.println("✅ Password reset email sent successfully!");

        } catch (Exception e) {
            System.err.println("❌ Failed to send password reset email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String buildPasswordResetEmailTemplate(String firstName, String resetToken, boolean isSkOfficial) {
        String resetUrl = baseUrl + (isSkOfficial ? "/sk-official/reset-password" : "/reset-password") + "?token=" + resetToken;
        
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .warning-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #FF9800; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                    .token-box { background-color: #f5f5f5; border: 1px dashed #999; padding: 15px; margin: 20px 0; font-family: monospace; word-break: break-all; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <p>Hi <strong>%s</strong>,</p>
                        <p>We received a request to reset your password for your YouthConnect account.</p>
                        <p>Click the button below to reset your password:</p>
                        <center>
                            <a href="%s" class="button">Reset Password</a>
                        </center>
                        <p>Or copy and paste this link into your browser:</p>
                        <div class="token-box">%s</div>
                        <div class="warning-box">
                            <p><strong>⚠️ Important:</strong></p>
                            <ul>
                                <li>This link will expire in <strong>1 hour</strong></li>
                                <li>If you didn't request this, please ignore this email</li>
                                <li>Your password won't change until you create a new one</li>
                            </ul>
                        </div>
                        <p>If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
                    </div>
                    <div class="footer">
                        <p>YouthConnect - Sangguniang Kabataan, Barangay 183</p>
                        <p>This is an automated email. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        """.formatted(firstName, resetUrl, resetUrl);
    }



    @Override
    public void sendNewEventNotification(String toEmail, String userName, String eventTitle, 
                                         String eventDescription, String eventDate, String eventLocation) {
        try {
            System.out.println("📧 Building new event notification email...");
            System.out.println("From: " + fromEmail);
            System.out.println("To: " + toEmail);
            System.out.println("Subject: New Event: " + eventTitle);
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "YouthConnect - Barangay 183");
            helper.setTo(toEmail);
            helper.setSubject("YouthConnect - New Event: " + eventTitle + " 🎉");
            helper.setText(buildNewEventNotificationTemplate(userName, eventTitle, eventDescription, 
                                                            eventDate, eventLocation), true);

            System.out.println("📤 Sending new event notification email via SMTP...");
            mailSender.send(message);
            System.out.println("✅ New event notification email sent successfully!");

        } catch (Exception e) {
            System.err.println("❌ Failed to send new event notification email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String buildNewEventNotificationTemplate(String userName, String eventTitle, 
                                                     String eventDescription, String eventDate, String eventLocation) {
        String eventsUrl = baseUrl + "/youth/events";
        
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .event-box { background-color: white; border: 2px solid #4CAF50; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .event-detail { margin: 10px 0; padding: 10px; background-color: #f5f5f5; border-radius: 3px; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>New Event Announcement!</h1>
                    </div>
                    <div class="content">
                        <p>Hi <strong>%s</strong>,</p>
                        <p>A new event has been created by the SK Officials of Barangay 183!</p>
                        <div class="event-box">
                            <h2 style="color: #4CAF50; margin-top: 0;">%s</h2>
                            <div class="event-detail">
                                <strong>📝 Description:</strong><br>
                                %s
                            </div>
                            <div class="event-detail">
                                <strong>📅 Date:</strong> %s
                            </div>
                            <div class="event-detail">
                                <strong>📍 Location:</strong> %s
                            </div>
                        </div>
                        <p>Don't miss out on this exciting opportunity! RSVP now to secure your spot.</p>
                        <center>
                            <a href="%s" class="button">View Event & RSVP</a>
                        </center>
                        <p>We look forward to seeing you there!</p>
                    </div>
                    <div class="footer">
                        <p>YouthConnect - Sangguniang Kabataan, Barangay 183</p>
                        <p>This is an automated notification. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        """.formatted(userName, eventTitle, eventDescription, eventDate, eventLocation, eventsUrl);
    }

    @Override
    public void sendEventStatusChangeNotification(String toEmail, String userName, String eventTitle, 
                                                  String eventDescription, String eventDate, String eventLocation, 
                                                  String newStatus) {
        try {
            System.out.println("📧 Building event status change notification email...");
            System.out.println("From: " + fromEmail);
            System.out.println("To: " + toEmail);
            System.out.println("Status: " + newStatus);
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "YouthConnect - Barangay 183");
            helper.setTo(toEmail);
            
            String subject = switch (newStatus.toLowerCase()) {
                case "ongoing" -> "YouthConnect - Event Starting Now: " + eventTitle + " 🎉";
                case "completed" -> "YouthConnect - Thank You for Attending: " + eventTitle + " ✅";
                case "cancelled" -> "YouthConnect - Event Cancelled: " + eventTitle + " ❌";
                default -> "YouthConnect - Event Update: " + eventTitle;
            };
            
            helper.setSubject(subject);
            helper.setText(buildEventStatusChangeTemplate(userName, eventTitle, eventDescription, 
                                                          eventDate, eventLocation, newStatus), true);

            System.out.println("📤 Sending event status change notification email via SMTP...");
            mailSender.send(message);
            System.out.println("✅ Event status change notification email sent successfully!");

        } catch (Exception e) {
            System.err.println("❌ Failed to send event status change notification email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String buildEventStatusChangeTemplate(String userName, String eventTitle, 
                                                  String eventDescription, String eventDate, 
                                                  String eventLocation, String newStatus) {
        String eventsUrl = baseUrl + "/youth/events";
        
        return switch (newStatus.toLowerCase()) {
            case "ongoing" -> buildOngoingEventTemplate(userName, eventTitle, eventDescription, eventDate, eventLocation, eventsUrl);
            case "completed" -> buildCompletedEventTemplate(userName, eventTitle, eventDescription, eventDate, eventLocation, eventsUrl);
            case "cancelled" -> buildCancelledEventTemplate(userName, eventTitle, eventDescription, eventDate, eventLocation, eventsUrl);
            default -> buildDefaultStatusTemplate(userName, eventTitle, eventDescription, eventDate, eventLocation, newStatus, eventsUrl);
        };
    }

    private String buildOngoingEventTemplate(String userName, String eventTitle, String eventDescription,
                                            String eventDate, String eventLocation, String eventsUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .event-box { background-color: white; border: 2px solid #FF9800; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .event-detail { margin: 10px 0; padding: 10px; background-color: #fff3e0; border-radius: 3px; }
                    .highlight { background-color: #fff3cd; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #FF9800; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Event Starting Now!</h1>
                    </div>
                    <div class="content">
                        <p>Hi <strong>%s</strong>,</p>
                        <div class="highlight">
                            <p style="margin: 0; font-size: 18px;"><strong>⏰ The event you registered for is now ongoing!</strong></p>
                        </div>
                        <p>We're excited to see you at the event. Here are the details:</p>
                        <div class="event-box">
                            <h2 style="color: #FF9800; margin-top: 0;">%s</h2>
                            <div class="event-detail">
                                <strong>📝 Description:</strong><br>
                                %s
                            </div>
                            <div class="event-detail">
                                <strong>📅 Date:</strong> %s
                            </div>
                            <div class="event-detail">
                                <strong>📍 Location:</strong> %s
                            </div>
                        </div>
                        <p><strong>Don't forget to check in when you arrive!</strong></p>
                        <p>We look forward to seeing you there!</p>
                        <center>
                            <a href="%s" class="button">View Event Details</a>
                        </center>
                    </div>
                    <div class="footer">
                        <p>YouthConnect - Sangguniang Kabataan, Barangay 183</p>
                        <p>This is an automated notification. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        """.formatted(userName, eventTitle, eventDescription, eventDate, eventLocation, eventsUrl);
    }

    private String buildCompletedEventTemplate(String userName, String eventTitle, String eventDescription,
                                              String eventDate, String eventLocation, String eventsUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .event-box { background-color: white; border: 2px solid #4CAF50; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .event-detail { margin: 10px 0; padding: 10px; background-color: #f5f5f5; border-radius: 3px; }
                    .thank-you-box { background-color: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Thank You for Participating!</h1>
                    </div>
                    <div class="content">
                        <p>Hi <strong>%s</strong>,</p>
                        <div class="thank-you-box">
                            <p style="margin: 0; font-size: 18px;"><strong>🎉 Thank you for being part of this event!</strong></p>
                        </div>
                        <p>The event has been successfully completed. We hope you had a great experience!</p>
                        <div class="event-box">
                            <h2 style="color: #4CAF50; margin-top: 0;">%s</h2>
                            <div class="event-detail">
                                <strong>📝 Description:</strong><br>
                                %s
                            </div>
                            <div class="event-detail">
                                <strong>📅 Date:</strong> %s
                            </div>
                            <div class="event-detail">
                                <strong>📍 Location:</strong> %s
                            </div>
                        </div>
                        <p>Your participation and support mean a lot to us. Stay tuned for more exciting events from YouthConnect!</p>
                        <center>
                            <a href="%s" class="button">View More Events</a>
                        </center>
                    </div>
                    <div class="footer">
                        <p>YouthConnect - Sangguniang Kabataan, Barangay 183</p>
                        <p>This is an automated notification. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        """.formatted(userName, eventTitle, eventDescription, eventDate, eventLocation, eventsUrl);
    }

    private String buildCancelledEventTemplate(String userName, String eventTitle, String eventDescription,
                                              String eventDate, String eventLocation, String eventsUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .event-box { background-color: white; border: 2px solid #f44336; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .event-detail { margin: 10px 0; padding: 10px; background-color: #f5f5f5; border-radius: 3px; }
                    .warning-box { background-color: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #f44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Event Cancelled</h1>
                    </div>
                    <div class="content">
                        <p>Hi <strong>%s</strong>,</p>
                        <div class="warning-box">
                            <p style="margin: 0; font-size: 18px;"><strong>⚠️ Important: This event has been cancelled</strong></p>
                        </div>
                        <p>We regret to inform you that the following event you registered for has been cancelled:</p>
                        <div class="event-box">
                            <h2 style="color: #f44336; margin-top: 0;">%s</h2>
                            <div class="event-detail">
                                <strong>📝 Description:</strong><br>
                                %s
                            </div>
                            <div class="event-detail">
                                <strong>📅 Originally Scheduled:</strong> %s
                            </div>
                            <div class="event-detail">
                                <strong>📍 Location:</strong> %s
                            </div>
                        </div>
                        <p>We apologize for any inconvenience this may cause. Please check our events page for other upcoming activities you might be interested in.</p>
                        <p>If you have any questions, please contact the SK Officials at Barangay 183.</p>
                        <center>
                            <a href="%s" class="button">Browse Other Events</a>
                        </center>
                    </div>
                    <div class="footer">
                        <p>YouthConnect - Sangguniang Kabataan, Barangay 183</p>
                        <p>This is an automated notification. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        """.formatted(userName, eventTitle, eventDescription, eventDate, eventLocation, eventsUrl);
    }

    private String buildDefaultStatusTemplate(String userName, String eventTitle, String eventDescription,
                                             String eventDate, String eventLocation, String newStatus, String eventsUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .event-box { background-color: white; border: 2px solid #2196F3; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .event-detail { margin: 10px 0; padding: 10px; background-color: #f5f5f5; border-radius: 3px; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Event Status Update</h1>
                    </div>
                    <div class="content">
                        <p>Hi <strong>%s</strong>,</p>
                        <p>The status of the event you registered for has been updated to: <strong>%s</strong></p>
                        <div class="event-box">
                            <h2 style="color: #2196F3; margin-top: 0;">%s</h2>
                            <div class="event-detail">
                                <strong>📝 Description:</strong><br>
                                %s
                            </div>
                            <div class="event-detail">
                                <strong>📅 Date:</strong> %s
                            </div>
                            <div class="event-detail">
                                <strong>📍 Location:</strong> %s
                            </div>
                        </div>
                        <center>
                            <a href="%s" class="button">View Event Details</a>
                        </center>
                    </div>
                    <div class="footer">
                        <p>YouthConnect - Sangguniang Kabataan, Barangay 183</p>
                        <p>This is an automated notification. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        """.formatted(userName, newStatus, eventTitle, eventDescription, eventDate, eventLocation, eventsUrl);
    }

    @Async
    @Override
    public void sendNewEventNotificationsAsync(List<User> users, String eventTitle, String eventDescription,
                                              String eventDate, String eventLocation) {
        System.out.println("🚀 [ASYNC] Starting bulk event notification sending in background thread...");
        System.out.println("📧 [ASYNC] Sending event notifications to " + users.size() + " approved users");
        
        int successCount = 0;
        int failCount = 0;
        
        for (User user : users) {
            try {
                // Get youth profile to get first name
                com.youthconnect.youthconnect_id.models.YouthProfile profile = 
                    youthProfileRepo.findById(user.getYouthId()).orElse(null);
                
                String firstName = profile != null && profile.getFirstName() != null ? 
                    profile.getFirstName() : "Youth Member";
                
                sendNewEventNotification(user.getEmail(), firstName, eventTitle, eventDescription, 
                                       eventDate, eventLocation);
                successCount++;
            } catch (Exception e) {
                failCount++;
                System.err.println("❌ [ASYNC] Failed to send notification to " + user.getEmail() + ": " + e.getMessage());
            }
        }
        
        System.out.println("📊 [ASYNC] Event notification complete: " + successCount + " sent, " + failCount + " failed");
    }

    @Async
    @Override
    public void sendEventStatusChangeNotificationsAsync(List<User> users, String eventTitle, String eventDescription,
                                                       String eventDate, String eventLocation, String newStatus) {
        System.out.println("🚀 [ASYNC] Starting bulk status change notification sending in background thread...");
        System.out.println("📧 [ASYNC] Sending status change (" + newStatus + ") notifications to " + users.size() + " users");
        
        int successCount = 0;
        int failCount = 0;
        
        for (User user : users) {
            try {
                // Get youth profile to get first name
                com.youthconnect.youthconnect_id.models.YouthProfile profile = 
                    youthProfileRepo.findById(user.getYouthId()).orElse(null);
                
                String firstName = profile != null && profile.getFirstName() != null ? 
                    profile.getFirstName() : "Youth Member";
                
                sendEventStatusChangeNotification(user.getEmail(), firstName, eventTitle, eventDescription,
                                                 eventDate, eventLocation, newStatus);
                successCount++;
            } catch (Exception e) {
                failCount++;
                System.err.println("❌ [ASYNC] Failed to send status change notification to " + user.getEmail() + ": " + e.getMessage());
            }
        }
        
        System.out.println("📊 [ASYNC] Status change notification complete: " + successCount + " sent, " + failCount + " failed");
    }

    @Async
    @Override
    public void sendTaskAssignmentNotificationAsync(String toEmail, String skOfficialName, String taskTitle,
                                                   String taskDescription, String dueDate, String assignedBy) {
        try {
            System.out.println("🚀 [ASYNC] Sending task assignment notification in background...");
            System.out.println("📧 To: " + toEmail);
            System.out.println("📋 Task: " + taskTitle);
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "YouthConnect - Barangay 183");
            helper.setTo(toEmail);
            helper.setSubject("YouthConnect - New Task Assigned: " + taskTitle + " 📋");
            helper.setText(buildTaskAssignmentTemplate(skOfficialName, taskTitle, taskDescription, 
                                                      dueDate, assignedBy), true);

            mailSender.send(message);
            System.out.println("✅ [ASYNC] Task assignment notification sent successfully!");

        } catch (Exception e) {
            System.err.println("❌ [ASYNC] Failed to send task assignment notification: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String buildTaskAssignmentTemplate(String skOfficialName, String taskTitle,
                                              String taskDescription, String dueDate, String assignedBy) {
        String tasksUrl = baseUrl + "/sk-official/task-tracker";
        
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .task-box { background-color: white; border: 2px solid #2196F3; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .task-detail { margin: 10px 0; padding: 10px; background-color: #e3f2fd; border-radius: 3px; }
                    .highlight { background-color: #fff3cd; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>New Task Assigned!</h1>
                    </div>
                    <div class="content">
                        <p>Hi <strong>%s</strong>,</p>
                        <div class="highlight">
                            <p style="margin: 0; font-size: 18px;"><strong>You have been assigned a new task!</strong></p>
                        </div>
                        <p>A new task has been assigned to you by <strong>%s</strong>. Please review the details below:</p>
                        <div class="task-box">
                            <h2 style="color: #2196F3; margin-top: 0;">%s</h2>
                            <div class="task-detail">
                                <strong>📝 Description:</strong><br>
                                %s
                            </div>
                            <div class="task-detail">
                                <strong>📅 Due Date:</strong> %s
                            </div>
                            <div class="task-detail">
                                <strong>👤 Assigned By:</strong> %s
                            </div>
                        </div>
                        <p>Please log in to the Task Tracker to view more details and update the task status.</p>
                        <center>
                            <a href="%s" class="button">View Task Tracker</a>
                        </center>
                    </div>
                    <div class="footer">
                        <p>YouthConnect - Sangguniang Kabataan, Barangay 183</p>
                        <p>This is an automated notification. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        """.formatted(skOfficialName, assignedBy, taskTitle, taskDescription, dueDate, assignedBy, tasksUrl);
    }

    @Async
    @Override
    public void sendAttendeeApprovalEmail(String toEmail, String userName, String eventTitle, String eventDate, String eventLocation) {
        try {
            System.out.println("📧 Building attendee approval email...");
            System.out.println("From: " + fromEmail);
            System.out.println("To: " + toEmail);
            System.out.println("Event: " + eventTitle);
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "YouthConnect - Barangay 183");
            helper.setTo(toEmail);
            helper.setSubject("YouthConnect - Event Registration Approved ✅");
            helper.setText(buildAttendeeApprovalTemplate(userName, eventTitle, eventDate, eventLocation), true);

            System.out.println("📤 Sending attendee approval email via SMTP...");
            mailSender.send(message);
            System.out.println("✅ Attendee approval email sent successfully!");

        } catch (Exception e) {
            System.err.println("❌ Failed to send attendee approval email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Async
    @Override
    public void sendAttendeeRejectionEmail(String toEmail, String userName, String eventTitle, String rejectionReason) {
        try {
            System.out.println("📧 Building attendee rejection email...");
            System.out.println("From: " + fromEmail);
            System.out.println("To: " + toEmail);
            System.out.println("Event: " + eventTitle);
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "YouthConnect - Barangay 183");
            helper.setTo(toEmail);
            helper.setSubject("YouthConnect - Event Registration Update");
            helper.setText(buildAttendeeRejectionTemplate(userName, eventTitle, rejectionReason), true);

            System.out.println("📤 Sending attendee rejection email via SMTP...");
            mailSender.send(message);
            System.out.println("✅ Attendee rejection email sent successfully!");

        } catch (Exception e) {
            System.err.println("❌ Failed to send attendee rejection email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String buildAttendeeApprovalTemplate(String userName, String eventTitle, String eventDate, String eventLocation) {
        String eventsUrl = baseUrl + "/youth/events";
        
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .event-box { background-color: white; border: 2px solid #4CAF50; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .event-detail { margin: 10px 0; padding: 10px; background-color: #e8f5e9; border-radius: 3px; }
                    .highlight { background-color: #c8e6c9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Event Registration Approved!</h1>
                    </div>
                    <div class="content">
                        <p>Hi <strong>%s</strong>,</p>
                        <div class="highlight">
                            <p style="margin: 0; font-size: 18px;"><strong>🎉 Great news! Your event registration has been approved!</strong></p>
                        </div>
                        <p>The SK Officials have approved your registration for the following event:</p>
                        <div class="event-box">
                            <h2 style="color: #4CAF50; margin-top: 0;">%s</h2>
                            <div class="event-detail">
                                <strong>📅 Date:</strong> %s
                            </div>
                            <div class="event-detail">
                                <strong>📍 Location:</strong> %s
                            </div>
                        </div>
                        <p>We're excited to see you at the event! Please make sure to:</p>
                        <ul>
                            <li>Mark your calendar for the event date</li>
                            <li>Arrive on time at the venue</li>
                            <li>Check in when you arrive</li>
                            <li>Bring any required materials or documents</li>
                        </ul>
                        <center>
                            <a href="%s" class="button">View Event Details</a>
                        </center>
                        <p>See you there!</p>
                    </div>
                    <div class="footer">
                        <p>YouthConnect - Sangguniang Kabataan, Barangay 183</p>
                        <p>This is an automated notification. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        """.formatted(userName, eventTitle, eventDate, eventLocation, eventsUrl);
    }

    private String buildAttendeeRejectionTemplate(String userName, String eventTitle, String rejectionReason) {
        String eventsUrl = baseUrl + "/youth/events";
        
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .event-box { background-color: white; border: 2px solid #f44336; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .reason-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Event Registration Update</h1>
                    </div>
                    <div class="content">
                        <p>Hi <strong>%s</strong>,</p>
                        <p>We regret to inform you that your registration for the following event was not approved:</p>
                        <div class="event-box">
                            <h2 style="color: #f44336; margin-top: 0;">%s</h2>
                        </div>
                        <div class="reason-box">
                            <strong>Reason:</strong> %s
                        </div>
                        <p>If you have questions about this decision or believe this is an error, please contact the SK Officials at Barangay 183.</p>
                        <p>You can still browse and register for other upcoming events on YouthConnect.</p>
                        <center>
                            <a href="%s" class="button">View Other Events</a>
                        </center>
                    </div>
                    <div class="footer">
                        <p>YouthConnect - Sangguniang Kabataan, Barangay 183</p>
                        <p>This is an automated notification. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        """.formatted(userName, eventTitle, rejectionReason != null && !rejectionReason.isBlank() ? rejectionReason : "Not specified", eventsUrl);
    }
}

