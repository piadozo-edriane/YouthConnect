package com.youthconnect.youthconnect_id.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.youthconnect.youthconnect_id.dto.AdminConcernUpdateRequest;
import com.youthconnect.youthconnect_id.enums.ConcernStatus;
import com.youthconnect.youthconnect_id.services.ConcernService;

@RestController
@RequestMapping("/api/admin/concerns")
public class AdminConcernController {

    @Autowired
    private ConcernService concernService;

    @GetMapping
    public ResponseEntity<?> getAllConcerns() {
        try {
            return ResponseEntity.ok(concernService.getAllConcerns());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed: " + e.getMessage());
        }
    }

    @PatchMapping("/{concernId}/status")
    public ResponseEntity<?> updateStatus(@PathVariable int concernId,
            @RequestParam ConcernStatus status) {
        try {
            return ResponseEntity.ok(concernService.updateConcernStatus(concernId, status));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed: " + e.getMessage());
        }
    }

    @PostMapping("/{concernId}/updates")
    public ResponseEntity<?> addUpdate(@PathVariable int concernId,
            @RequestBody AdminConcernUpdateRequest request) {
        try {
            concernService.addConcernUpdate(concernId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body("Update added successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed: " + e.getMessage());
        }
    }

    @GetMapping("/{concernId}/updates")
    public ResponseEntity<?> getUpdates(@PathVariable int concernId) {
        try {
            return ResponseEntity.ok(concernService.getConcernUpdates(concernId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed: " + e.getMessage());
        }
    }

    @DeleteMapping("/{concernId}")
    public ResponseEntity<?> deleteConcern(@PathVariable int concernId) {
        try {
            concernService.deleteConcern(concernId);
            return ResponseEntity.ok("Concern deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed: " + e.getMessage());
        }
    }
}