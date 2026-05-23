package com.youthconnect.youthconnect_id.dto;

import java.time.LocalDateTime;

import com.youthconnect.youthconnect_id.enums.TaskStatus;

public class TaskEditRequest {

    private String tasking;
    private String taskDescription;
    private String skIncharge;
    private String hyperlink;
    private LocalDateTime dueDate;
    private TaskStatus status;

    public String getTasking() {
        return tasking;
    }

    public void setTasking(String tasking) {
        this.tasking = tasking;
    }

    public String getTaskDescription() {
        return taskDescription;
    }

    public void setTaskDescription(String taskDescription) {
        this.taskDescription = taskDescription;
    }

    public String getSkIncharge() {
        return skIncharge;
    }

    public void setSkIncharge(String skIncharge) {
        this.skIncharge = skIncharge;
    }

    public String getHyperlink() {
        return hyperlink;
    }

    public void setHyperlink(String hyperlink) {
        this.hyperlink = hyperlink;
    }

    public LocalDateTime getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDateTime dueDate) {
        this.dueDate = dueDate;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
    }
}
