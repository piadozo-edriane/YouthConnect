package com.youthconnect.youthconnect_id.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.youthconnect.youthconnect_id.services.AdminManagementService;

@RestController
@RequestMapping("/api/youth/profile")
public class YouthProfileController {

    @Autowired
    private AdminManagementService adminManagementService;

    /**
     * Returns the youth profile (including classification) for the given youthId.
     * Accessible to any authenticated user (youth role included).
     */
    @GetMapping("/{youthId}")
    public ResponseEntity<?> getYouthProfile(@PathVariable int youthId) {
        try {
            return ResponseEntity.ok(adminManagementService.getYouthProfileById(youthId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Profile not found: " + e.getMessage());
        }
    }
}
