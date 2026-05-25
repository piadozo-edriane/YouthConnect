package com.youthconnect.youthconnect_id.dto;

public class UpdateAttendanceStatusRequest {
    private String approvalStatus; // "approved", "rejected", or "pending"
    private String rejectionReason; // Optional reason for rejection

    public String getApprovalStatus() {
        return approvalStatus;
    }

    public void setApprovalStatus(String approvalStatus) {
        this.approvalStatus = approvalStatus;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }
}
