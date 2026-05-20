package com.youthconnect.youthconnect_id.dto;

public class UpdateAttendanceStatusRequest {
    private String approvalStatus; // "approved" or "rejected"

    public String getApprovalStatus() {
        return approvalStatus;
    }

    public void setApprovalStatus(String approvalStatus) {
        this.approvalStatus = approvalStatus;
    }
}
