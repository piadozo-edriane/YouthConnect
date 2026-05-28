package com.youthconnect.youthconnect_id.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.youthconnect.youthconnect_id.dto.AdminSkOfficialRequest;
import com.youthconnect.youthconnect_id.services.AdminManagementService;

@RestController
@RequestMapping("/api/administrator/sk-officials")
public class AdminSkOfficialController {

    @Autowired
    private AdminManagementService adminManagementService;

    @GetMapping
    public ResponseEntity<?> getAllSkOfficials() {
        try {
            return ResponseEntity.ok(adminManagementService.getAllSkOfficials());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed: " + e.getMessage());
        }
    }

    @GetMapping("/{adminId}")
    public ResponseEntity<?> getSkOfficialById(@PathVariable int adminId) {
        try {
            return ResponseEntity.ok(adminManagementService.getSkOfficialById(adminId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Failed: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> createSkOfficial(@RequestBody AdminSkOfficialRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(adminManagementService.createSkOfficial(request));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed: " + e.getMessage());
        }
    }

    @PutMapping("/{adminId}")
    public ResponseEntity<?> updateSkOfficial(@PathVariable int adminId,
            @RequestBody AdminSkOfficialRequest request) {
        try {
            return ResponseEntity.ok(adminManagementService.updateSkOfficial(adminId, request));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed: " + e.getMessage());
        }
    }

    @DeleteMapping("/{adminId}")
    public ResponseEntity<?> deleteSkOfficial(@PathVariable int adminId) {
        try {
            adminManagementService.deleteSkOfficial(adminId);
            return ResponseEntity.ok("SK Official deleted successfully");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed: " + e.getMessage());
        }
    }

    @PutMapping("/{adminId}/deactivate")
    public ResponseEntity<?> deactivateSkOfficial(@PathVariable int adminId) {
        try {
            return ResponseEntity.ok(adminManagementService.deactivateSkOfficial(adminId));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed: " + e.getMessage());
        }
    }

    @PutMapping("/{adminId}/activate")
    public ResponseEntity<?> activateSkOfficial(@PathVariable int adminId) {
        try {
            return ResponseEntity.ok(adminManagementService.activateSkOfficial(adminId));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed: " + e.getMessage());
        }
    }
}