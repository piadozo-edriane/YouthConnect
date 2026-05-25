package com.youthconnect.youthconnect_id.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AttendanceResponse {
    private int attendanceId;
    private int eventId;
    private int userId;
    private boolean isAttended;
    private String approvalStatus;
    private LocalDateTime registeredAt;
    private LocalDateTime attendedAt;

    public int getAttendanceId() {
        return attendanceId; 
    }
    public void setAttendanceId(int attendanceId) {
        this.attendanceId = attendanceId; 
    }
    public int getEventId() {
        return eventId; 
    }
    public void setEventId(int eventId) {
        this.eventId = eventId; 
    }
    public int getUserId() {
        return userId; 
    }
    public void setUserId(int userId) {
        this.userId = userId; 
    }

    @JsonProperty("isAttended")
    public boolean isAttended() {
        return isAttended; 
    }
    public void setAttended(boolean attended) {
        isAttended = attended; 
    }
    public String getApprovalStatus() {
        return approvalStatus;
    }
    public void setApprovalStatus(String approvalStatus) {
        this.approvalStatus = approvalStatus;
    }
    public LocalDateTime getRegisteredAt() {
        return registeredAt; 
    }
    public void setRegisteredAt(LocalDateTime registeredAt) {
        this.registeredAt = registeredAt; 
    }
    public LocalDateTime getAttendedAt() {
        return attendedAt; 
    }
    public void setAttendedAt(LocalDateTime attendedAt) {
        this.attendedAt = attendedAt; 
    }
}