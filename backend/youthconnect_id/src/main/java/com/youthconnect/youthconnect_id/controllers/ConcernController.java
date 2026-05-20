package com.youthconnect.youthconnect_id.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.youthconnect.youthconnect_id.dto.ConcernRequest;
import com.youthconnect.youthconnect_id.dto.ConcernResponse;
import com.youthconnect.youthconnect_id.dto.ConcernUpdateRequest;
import com.youthconnect.youthconnect_id.dto.YouthConcernReplyRequest;
import com.youthconnect.youthconnect_id.ratelimit.RateLimit;
import com.youthconnect.youthconnect_id.ratelimit.RateLimitType;
import com.youthconnect.youthconnect_id.services.ConcernService;

@RestController
@RequestMapping("/api/concerns")
public class ConcernController {

    @Autowired
    private ConcernService concernService;

    @PostMapping
    @RateLimit(type = RateLimitType.CREATE_CONCERN, useIpAddress = false)
    public ResponseEntity<?> submitConcern(@RequestBody ConcernRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(concernService.submitConcern(request));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed: " + e.getMessage());
        }
    }

    @GetMapping("/youth/{youthId}")
    @RateLimit(type = RateLimitType.GENERAL_API, useIpAddress = false)
    public ResponseEntity<?> getOwnConcerns(@PathVariable int youthId) {
        try {
            List<ConcernResponse> concerns = concernService.getOwnConcerns(youthId);
            return ResponseEntity.ok(concerns);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed: " + e.getMessage());
        }
    }

    @GetMapping("/{concernId}")
    @RateLimit(type = RateLimitType.GENERAL_API, useIpAddress = false)
    public ResponseEntity<?> getConcernById(@PathVariable int concernId) {
        try {
            return ResponseEntity.ok(concernService.getConcernById(concernId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Failed: " + e.getMessage());
        }
    }

    @GetMapping("/{concernId}/updates")
    @RateLimit(type = RateLimitType.GENERAL_API, useIpAddress = false)
    public ResponseEntity<?> getConcernUpdates(@PathVariable int concernId) {
        try {
            return ResponseEntity.ok(concernService.getConcernUpdates(concernId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed: " + e.getMessage());
        }
    }

    @PostMapping("/{concernId}/updates/youth")
    @RateLimit(type = RateLimitType.GENERAL_API, useIpAddress = false)
    public ResponseEntity<?> addYouthReply(@PathVariable int concernId,
            @RequestBody YouthConcernReplyRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(concernService.addYouthReply(concernId, request));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed: " + e.getMessage());
        }
    }

    @PutMapping("/{concernId}")
    @RateLimit(type = RateLimitType.GENERAL_API, useIpAddress = false)
    public ResponseEntity<?> editConcern(@PathVariable int concernId,
            @RequestBody ConcernUpdateRequest request) {
        try {
            return ResponseEntity.ok(concernService.editConcern(concernId, request));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed: " + e.getMessage());
        }
    }

    @PatchMapping("/{concernId}/cancel")
    @RateLimit(type = RateLimitType.GENERAL_API, useIpAddress = false)
    public ResponseEntity<?> cancelConcern(@PathVariable int concernId) {
        try {
            concernService.cancelConcern(concernId);
            return ResponseEntity.ok("Concern cancelled successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed: " + e.getMessage());
        }
    }

    @DeleteMapping("/{concernId}")
    @RateLimit(type = RateLimitType.GENERAL_API, useIpAddress = false)
    public ResponseEntity<?> deleteConcern(@PathVariable int concernId) {
        try {
            concernService.deleteConcern(concernId);
            return ResponseEntity.ok("Concern deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed: " + e.getMessage());
        }
    }
}