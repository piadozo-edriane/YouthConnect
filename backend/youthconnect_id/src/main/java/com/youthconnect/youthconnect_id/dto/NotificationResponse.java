package com.youthconnect.youthconnect_id.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

public class NotificationResponse {
    // Notification fields
    private int notificationId;
    private int userId;
    private int youthId;
    private String title;
    private String message;
    private String type;
    private Integer relatedEventId;
    private Integer relatedAttendanceId;
    private Integer relatedConcernId;
    @JsonProperty("isRead")
    @JsonAlias({"read"})
    private boolean isRead;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;

    // Legacy concern fields (for backward compatibility)
    private int updateId;
    private int concernId;
    private String concernTitle;
    private String updateText;
    private String updatedByAdminName;

    public NotificationResponse() {}

    // Getters and Setters for notification fields
    public int getNotificationId() {
        return notificationId;
    }

    public void setNotificationId(int notificationId) {
        this.notificationId = notificationId;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public int getYouthId() {
        return youthId;
    }

    public void setYouthId(int youthId) {
        this.youthId = youthId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Integer getRelatedEventId() {
        return relatedEventId;
    }

    public void setRelatedEventId(Integer relatedEventId) {
        this.relatedEventId = relatedEventId;
    }

    public Integer getRelatedAttendanceId() {
        return relatedAttendanceId;
    }

    public void setRelatedAttendanceId(Integer relatedAttendanceId) {
        this.relatedAttendanceId = relatedAttendanceId;
    }

    public Integer getRelatedConcernId() {
        return relatedConcernId;
    }

    public void setRelatedConcernId(Integer relatedConcernId) {
        this.relatedConcernId = relatedConcernId;
    }

    @JsonProperty("isRead")
    public boolean isRead() {
        return isRead;
    }

    @JsonProperty("isRead")
    public void setRead(boolean isRead) {
        this.isRead = isRead;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }

    public void setReadAt(LocalDateTime readAt) {
        this.readAt = readAt;
    }

    // Legacy concern getters and setters
    public int getUpdateId() {
        return updateId;
    }

    public void setUpdateId(int updateId) {
        this.updateId = updateId;
    }

    public int getConcernId() {
        return concernId;
    }

    public void setConcernId(int concernId) {
        this.concernId = concernId;
    }

    public String getConcernTitle() {
        return concernTitle;
    }

    public void setConcernTitle(String concernTitle) {
        this.concernTitle = concernTitle;
    }

    public String getUpdateText() {
        return updateText;
    }

    public void setUpdateText(String updateText) {
        this.updateText = updateText;
    }

    public String getUpdatedByAdminName() {
        return updatedByAdminName;
    }

    public void setUpdatedByAdminName(String updatedByAdminName) {
        this.updatedByAdminName = updatedByAdminName;
    }
}

