package com.youthconnect.youthconnect_id.services.implementation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youthconnect.youthconnect_id.dto.TaskEditRequest;
import com.youthconnect.youthconnect_id.dto.TaskHyperlinkRequest;
import com.youthconnect.youthconnect_id.dto.TaskRequest;
import com.youthconnect.youthconnect_id.dto.TaskResponse;
import com.youthconnect.youthconnect_id.enums.TaskStatus;
import com.youthconnect.youthconnect_id.models.Task;
import com.youthconnect.youthconnect_id.models.SkOfficialsUser;
import com.youthconnect.youthconnect_id.repositories.TaskRepo;
import com.youthconnect.youthconnect_id.repositories.SkOfficialRepo;
import com.youthconnect.youthconnect_id.services.TaskService;
import com.youthconnect.youthconnect_id.services.EmailService;

@Service
public class TaskServiceImpl implements TaskService {

    @Autowired
    private TaskRepo taskRepo;
    
    @Autowired
    private SkOfficialRepo skOfficialRepo;
    
    @Autowired
    private EmailService emailService;

    // ── Helper ────────────────────────────────────────────
    private TaskResponse toResponse(Task task) {
        TaskResponse response = new TaskResponse();
        response.setTaskId(task.getTaskId());
        response.setAdminId(task.getAdminId());
        response.setTasking(task.getTasking());
        response.setTaskDescription(task.getTaskDescription());
        response.setSkIncharge(task.getSkIncharge());
        response.setHyperlink(task.getHyperlink());
        response.setStatus(task.getStatus());
        response.setDueDate(task.getDueDate());
        response.setCreatedAt(task.getCreatedAt());
        return response;
    }

    // ── SK Official ───────────────────────────────────────
    @Override
    public TaskResponse createTask(TaskRequest request) {
        Task task = new Task();
        task.setAdminId(request.getAdminId());
        task.setTasking(request.getTasking());
        task.setTaskDescription(request.getTaskDescription());
        task.setSkIncharge(request.getSkIncharge());
        task.setHyperlink(request.getHyperlink());
        task.setDueDate(request.getDueDate());
        task.setStatus(request.getStatus() != null && !request.getStatus().isBlank()
                ? request.getStatus()
                : TaskStatus.PRIO.name());
        task.setCreatedAt(LocalDateTime.now());
        
        Task savedTask = taskRepo.save(task);
        
        // Send email notification to assigned SK Official
        notifySkOfficialAboutTaskAssignment(savedTask, request.getAdminId());
        
        return toResponse(savedTask);
    }
    
    private void notifySkOfficialAboutTaskAssignment(Task task, int assignedByAdminId) {
        try {
            // Get the SK Official who assigned the task
            SkOfficialsUser assignedBy = skOfficialRepo.findById(assignedByAdminId).orElse(null);
            String assignedByName = assignedBy != null ? 
                assignedBy.getFirstName() + " " + assignedBy.getLastName() : "SK Official";
            
            // Parse the SK Incharge name to find the SK Official
            String skInchargeName = task.getSkIncharge();
            if (skInchargeName == null || skInchargeName.trim().isEmpty()) {
                System.out.println("⚠️ No SK Incharge specified for task");
                return;
            }
            
            // Find SK Official by matching first and last name
            List<SkOfficialsUser> allOfficials = skOfficialRepo.findAll();
            SkOfficialsUser assignedOfficial = null;
            
            for (SkOfficialsUser official : allOfficials) {
                String fullName = (official.getFirstName() + " " + official.getLastName()).trim();
                if (fullName.equalsIgnoreCase(skInchargeName.trim())) {
                    assignedOfficial = official;
                    break;
                }
            }
            
            if (assignedOfficial == null) {
                System.out.println("⚠️ SK Official not found for name: " + skInchargeName);
                return;
            }
            
            // Format due date
            String formattedDueDate = task.getDueDate() != null ? 
                task.getDueDate().toString() : "No due date set";
            
            // Get task title from tasking
            String taskTitle = task.getTasking() != null ? 
                task.getTasking().replace("_", " ") : "New Task";
            
            System.out.println("Queuing task assignment notification for: " + assignedOfficial.getEmail() + " (async)");
            
            // Send email notification asynchronously
            emailService.sendTaskAssignmentNotificationAsync(
                assignedOfficial.getEmail(),
                assignedOfficial.getFirstName() + " " + assignedOfficial.getLastName(),
                taskTitle,
                task.getTaskDescription(),
                formattedDueDate,
                assignedByName
            );
            
            System.out.println("✅ Task assignment notification queued successfully (will process in background)");
        } catch (Exception e) {
            System.err.println("❌ Error queuing task assignment notification: " + e.getMessage());
            e.printStackTrace();
            // Don't throw exception - task creation should succeed even if email fails
        }
    }

    @Override
    @Transactional
    public TaskResponse editTask(int taskId, TaskEditRequest request) {
        Task task = taskRepo.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        task.setTasking(request.getTasking());
        task.setTaskDescription(request.getTaskDescription());
        task.setSkIncharge(request.getSkIncharge());
        task.setHyperlink(request.getHyperlink());
        task.setDueDate(request.getDueDate());
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            task.setStatus(request.getStatus());
        }
        return toResponse(taskRepo.save(task));
    }

    @Override
    public void deleteTask(int taskId) {
        Task task = taskRepo.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        taskRepo.delete(task);
    }

    @Override
    public List<TaskResponse> getAllTasks() {
        return taskRepo.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public TaskResponse updateTaskStatus(int taskId, TaskStatus status) {
        Task task = taskRepo.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        task.setStatus(status.name());
        return toResponse(taskRepo.save(task));
    }

    @Override
    @Transactional
    public TaskResponse addHyperlink(int taskId, TaskHyperlinkRequest request) {
        Task task = taskRepo.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        task.setHyperlink(request.getHyperlink());
        return toResponse(taskRepo.save(task));
    }
}