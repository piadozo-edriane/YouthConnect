package com.youthconnect.youthconnect_id.services.implementation;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youthconnect.youthconnect_id.dto.AdminConcernUpdateRequest;
import com.youthconnect.youthconnect_id.dto.ConcernRequest;
import com.youthconnect.youthconnect_id.dto.ConcernResponse;
import com.youthconnect.youthconnect_id.dto.ConcernUpdateRequest;
import com.youthconnect.youthconnect_id.dto.ConcernUpdateResponse;
import com.youthconnect.youthconnect_id.dto.YouthConcernReplyRequest;
import com.youthconnect.youthconnect_id.enums.ConcernStatus;
import com.youthconnect.youthconnect_id.models.Concern;
import com.youthconnect.youthconnect_id.models.ConcernUpdate;
import com.youthconnect.youthconnect_id.models.SkOfficialsUser;
import com.youthconnect.youthconnect_id.repositories.ConcernRepo;
import com.youthconnect.youthconnect_id.repositories.ConcernUpdateRepo;
import com.youthconnect.youthconnect_id.repositories.SkOfficialRepo;
import com.youthconnect.youthconnect_id.repositories.YouthProfileRepo;
import com.youthconnect.youthconnect_id.services.ConcernService;
import com.youthconnect.youthconnect_id.services.NotificationService;
import com.youthconnect.youthconnect_id.models.YouthProfile;

@Service
public class ConcernServiceImpl implements ConcernService {

    @Autowired
    private ConcernRepo concernRepo;

    @Autowired
    private ConcernUpdateRepo concernUpdateRepo;

    @Autowired
    private YouthProfileRepo youthProfileRepo;

    @Autowired
    private SkOfficialRepo skOfficialRepo;

    @Autowired
    private NotificationService notificationService;

    // ── Helper ────────────────────────────────────────────
    private ConcernResponse toResponse(Concern concern) {
        ConcernResponse response = new ConcernResponse();
        response.setConcernId(concern.getConcernId());
        response.setYouthId(concern.getYouthId());
        
        // Fetch youth name from YouthProfile
        try {
            YouthProfile youth = youthProfileRepo.findById(concern.getYouthId()).orElse(null);
            if (youth != null) {
                response.setYouthFirstName(youth.getFirstName());
                response.setYouthLastName(youth.getLastName());
            }
        } catch (Exception e) {
            // If youth not found, leave names as null
            response.setYouthFirstName(null);
            response.setYouthLastName(null);
        }
        
        response.setTypeOfConcern(concern.getTypeOfConcern());
        response.setTitle(concern.getTitle());
        response.setDescription(concern.getDescription());
        response.setStatus(concern.getStatus());
        response.setCreatedAt(concern.getCreatedAt());
        response.setUpdatedAt(concern.getUpdatedAt());
        return response;
    }

    private void validateUpdateText(String updateText) {
        if (updateText == null || updateText.trim().isEmpty()) {
            throw new RuntimeException("Update message is required");
        }
    }

    private void validateStatusTransition(ConcernStatus currentStatus, ConcernStatus nextStatus) {
        if (nextStatus == null) {
            return;
        }

        if (currentStatus == ConcernStatus.CLOSED) {
            throw new RuntimeException("Closed concerns cannot be updated");
        }
    }

    private ConcernUpdateResponse toUpdateResponse(ConcernUpdate update) {
        ConcernUpdateResponse response = new ConcernUpdateResponse();
        response.setUpdateId(update.getUpdateId());
        response.setConcernId(update.getConcernId());
        response.setUpdatedByAdminId(update.getUpdatedByAdminId());
        response.setYouthId(update.getYouthId());
        response.setUpdateText(update.getUpdateText());
        response.setStatus(update.getStatus());
        response.setCreatedAt(update.getCreatedAt());

        if (update.getUpdatedByAdminId() != null) {
            response.setSenderType("SK_OFFICIAL");
            SkOfficialsUser official = skOfficialRepo.findById(update.getUpdatedByAdminId()).orElse(null);
            if (official != null) {
                String name = String.format("%s %s", 
                    official.getFirstName() == null ? "" : official.getFirstName(),
                    official.getLastName() == null ? "" : official.getLastName()).trim();
                response.setSenderName(name.isEmpty() ? "SK Official" : name);
            } else {
                response.setSenderName("SK Official");
            }
        } else if (update.getYouthId() != null) {
            response.setSenderType("YOUTH");
            YouthProfile youth = youthProfileRepo.findById(update.getYouthId()).orElse(null);
            if (youth != null) {
                String name = String.format("%s %s", 
                    youth.getFirstName() == null ? "" : youth.getFirstName(),
                    youth.getLastName() == null ? "" : youth.getLastName()).trim();
                response.setSenderName(name.isEmpty() ? "Youth" : name);
            } else {
                response.setSenderName("Youth");
            }
        } else {
            response.setSenderType("SYSTEM");
            response.setSenderName("System");
        }

        return response;
    }

    // ── Youth ─────────────────────────────────────────────
    @Override
    public ConcernResponse submitConcern(ConcernRequest request) {
        Concern concern = new Concern();
        concern.setYouthId(request.getYouthId());
        concern.setTypeOfConcern(request.getTypeOfConcern());
        concern.setTitle(request.getTitle());
        concern.setDescription(request.getDescription());
        concern.setStatus(ConcernStatus.OPEN);
        concern.setCreatedAt(LocalDateTime.now());
        return toResponse(concernRepo.save(concern));
    }

    @Override
    public List<ConcernResponse> getOwnConcerns(int youthId) {
        return concernRepo.findByYouthId(youthId)
                .stream()
                .sorted((c1, c2) -> c2.getCreatedAt().compareTo(c1.getCreatedAt())) // Latest first
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ConcernResponse getConcernById(int concernId) {
        Concern concern = concernRepo.findById(concernId)
                .orElseThrow(() -> new RuntimeException("Concern not found"));
        return toResponse(concern);
    }

    @Override
    @Transactional
    public ConcernResponse editConcern(int concernId, ConcernUpdateRequest request) {
        Concern concern = concernRepo.findById(concernId)
                .orElseThrow(() -> new RuntimeException("Concern not found"));

        // Only allow editing if status is still OPEN
        if (concern.getStatus() != ConcernStatus.OPEN) {
            throw new RuntimeException("Cannot edit a concern that is already " + concern.getStatus());
        }

        concern.setTypeOfConcern(request.getTypeOfConcern());
        concern.setTitle(request.getTitle());
        concern.setDescription(request.getDescription());
        concern.setUpdatedAt(LocalDateTime.now());
        return toResponse(concernRepo.save(concern));
    }

    @Override
    @Transactional
    public void cancelConcern(int concernId) {
        Concern concern = concernRepo.findById(concernId)
                .orElseThrow(() -> new RuntimeException("Concern not found"));

        if (concern.getStatus() != ConcernStatus.OPEN) {
            throw new RuntimeException("Only OPEN concerns can be cancelled");
        }

        concern.setStatus(ConcernStatus.CLOSED);
        concern.setUpdatedAt(LocalDateTime.now());
        concernRepo.save(concern);
    }

    @Override
    @Transactional
    public void deleteConcern(int concernId) {
        Concern concern = concernRepo.findById(concernId)
                .orElseThrow(() -> new RuntimeException("Concern not found"));
        notificationService.deleteNotificationsByConcernId(concernId);
        concernRepo.delete(concern);
    }

    // ── Admin ─────────────────────────────────────────────
    @Override
    public List<ConcernResponse> getAllConcerns() {
        return concernRepo.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ConcernResponse updateConcernStatus(int concernId, ConcernStatus status) {
        Concern concern = concernRepo.findById(concernId)
                .orElseThrow(() -> new RuntimeException("Concern not found"));
        validateStatusTransition(concern.getStatus(), status);
        concern.setStatus(status);
        concern.setUpdatedAt(LocalDateTime.now());
        return toResponse(concernRepo.save(concern));
    }

    @Override
    @Transactional
    public void addConcernUpdate(int concernId, AdminConcernUpdateRequest request) {
        Concern concern = concernRepo.findById(concernId)
                .orElseThrow(() -> new RuntimeException("Concern not found"));

        validateUpdateText(request.getUpdateText());
        validateStatusTransition(concern.getStatus(), request.getStatus());

        ConcernStatus updateStatus = request.getStatus() != null
            ? request.getStatus()
            : concern.getStatus();

        ConcernUpdate update = new ConcernUpdate();
        update.setConcernId(concernId);
        update.setUpdatedByAdminId(request.getAdminId());
        update.setYouthId(null);
        update.setUpdateText(request.getUpdateText());
        update.setStatus(updateStatus);
        update.setCreatedAt(LocalDateTime.now());
        concernUpdateRepo.save(update);

        String notificationMessage = String.format(
            "Your concern status has been updated to %s. Message from SK Official: %s",
            updateStatus.name(),
            request.getUpdateText().trim()
        );

        notificationService.createConcernUpdateNotification(
            concernId,
            concern.getYouthId(),
            updateStatus.name(),
            request.getUpdateText().trim()
        );

        // Update the concern status at the same time when provided
        if (request.getStatus() != null) {
            concern.setStatus(request.getStatus());
            concern.setUpdatedAt(LocalDateTime.now());
            concernRepo.save(concern);
        }
    }

    @Override
    @Transactional
    public ConcernUpdateResponse addYouthReply(int concernId, YouthConcernReplyRequest request) {
        Concern concern = concernRepo.findById(concernId)
                .orElseThrow(() -> new RuntimeException("Concern not found"));

        if (concern.getStatus() == ConcernStatus.CLOSED) {
            throw new RuntimeException("Closed concerns cannot be updated");
        }

        if (concern.getYouthId() != request.getYouthId()) {
            throw new RuntimeException("Youth is not authorized to reply to this concern");
        }

        validateUpdateText(request.getUpdateText());

        ConcernUpdate update = new ConcernUpdate();
        update.setConcernId(concernId);
        update.setUpdatedByAdminId(null);
        update.setYouthId(request.getYouthId());
        update.setUpdateText(request.getUpdateText());
        update.setStatus(concern.getStatus());
        update.setCreatedAt(LocalDateTime.now());

        return toUpdateResponse(concernUpdateRepo.save(update));
    }

    @Override
    public List<ConcernUpdateResponse> getConcernUpdates(int concernId) {
        List<ConcernUpdate> updates = concernUpdateRepo.findByConcernIdOrderByCreatedAtDesc(concernId);
        Collections.reverse(updates);

        return updates.stream()
                .map(this::toUpdateResponse)
                .collect(Collectors.toList());
    }
}