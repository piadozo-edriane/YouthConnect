package com.youthconnect.youthconnect_id.dto;

import java.time.LocalDateTime;

public class EventResponse {
    private int eventId;
    private String title;
    private String description;
    private LocalDateTime eventDate;
    private String location;
    private Integer createdByAdminId;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private long rsvpCount;
    private long expectedCount;
    private Integer attendeeLimit;

    public int getEventId() {
        return eventId; 
    }
    public void setEventId(int eventId) {
        this.eventId = eventId; 
    }
    public String getTitle() {
        return title; 
    }
    public void setTitle(String title) {
        this.title = title; 
    }
    public String getDescription() {
        return description; 
    }
    public void setDescription(String description) {
        this.description = description; 
    }
    public LocalDateTime getEventDate() {
        return eventDate; 
    }
    public void setEventDate(LocalDateTime eventDate) {
        this.eventDate = eventDate; 
    }
    public String getLocation() {
        return location; 
    }
    public void setLocation(String location) {
        this.location = location; 
    }
    public Integer getCreatedByAdminId() {
        return createdByAdminId; 
    }
    public void setCreatedByAdminId(Integer createdByAdminId) {
        this.createdByAdminId = createdByAdminId; 
    }
    public String getStatus() {
        return status; 
    }
    public void setStatus(String status) {
        this.status = status; 
    }
    public LocalDateTime getCreatedAt() {
        return createdAt; 
    }
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt; 
    }
    public LocalDateTime getUpdatedAt() {
        return updatedAt; 
    }
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt; 
    }
    public long getRsvpCount() {
        return rsvpCount;
    }
    public void setRsvpCount(long rsvpCount) {
        this.rsvpCount = rsvpCount;
    }
    public long getExpectedCount() {
        return expectedCount;
    }
    public void setExpectedCount(long expectedCount) {
        this.expectedCount = expectedCount;
    }
    public Integer getAttendeeLimit() {
        return attendeeLimit;
    }
    public void setAttendeeLimit(Integer attendeeLimit) {
        this.attendeeLimit = attendeeLimit;
    }
}