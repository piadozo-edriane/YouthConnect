package com.youthconnect.youthconnect_id.dto;

import java.time.LocalDateTime;

public class EventRequest {
    private String title;
    private String description;
    private LocalDateTime eventDate;
    private String location;
    private Integer createdByAdminId;
    private String status;
    private Integer attendeeLimit;

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
    public Integer getAttendeeLimit() {
        return attendeeLimit;
    }
    public void setAttendeeLimit(Integer attendeeLimit) {
        this.attendeeLimit = attendeeLimit;
    }
}