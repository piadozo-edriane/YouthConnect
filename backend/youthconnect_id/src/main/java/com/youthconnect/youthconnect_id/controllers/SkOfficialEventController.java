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

import com.youthconnect.youthconnect_id.dto.AttendanceResponse;
import com.youthconnect.youthconnect_id.dto.EventRequest;
import com.youthconnect.youthconnect_id.dto.EventResponse;
import com.youthconnect.youthconnect_id.dto.MarkAttendanceRequest;
import com.youthconnect.youthconnect_id.dto.UpdateAttendanceStatusRequest;
import com.youthconnect.youthconnect_id.services.EventService;

@RestController
@RequestMapping("/api/sk/events")
public class SkOfficialEventController {

    @Autowired
    private EventService eventService;

    @PostMapping
    public ResponseEntity<?> createEvent(@RequestBody EventRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(eventService.createEvent(request));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed: " + e.getMessage());
        }
    }

    @PutMapping("/{eventId}")
    public ResponseEntity<?> editEvent(@PathVariable int eventId,
            @RequestBody EventRequest request) {
        try {
            return ResponseEntity.ok(eventService.editEvent(eventId, request));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed: " + e.getMessage());
        }
    }

    @DeleteMapping("/{eventId}")
    public ResponseEntity<?> deleteEvent(@PathVariable int eventId) {
        try {
            eventService.deleteEvent(eventId);
            return ResponseEntity.ok("Event deleted successfully");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllEvents() {
        try {
            List<EventResponse> events = eventService.getAllEvents();
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed: " + e.getMessage());
        }
    }

    @PatchMapping("/{eventId}/attendance")
    public ResponseEntity<?> markAttendance(@PathVariable int eventId,
            @RequestBody MarkAttendanceRequest request) {
        try {
            AttendanceResponse response = eventService.markAttendance(eventId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed: " + e.getMessage());
        }
    }

    @GetMapping("/{eventId}/rsvp")
    public ResponseEntity<?> getEventRsvps(@PathVariable int eventId) {
        try {
            List<AttendanceResponse> rsvps = eventService.getEventRsvps(eventId);
            return ResponseEntity.ok(rsvps);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed: " + e.getMessage());
        }
    }

    @PatchMapping("/{eventId}/rsvp/{attendanceId}/status")
    public ResponseEntity<?> updateAttendanceStatus(@PathVariable int eventId,
            @PathVariable int attendanceId,
            @RequestBody UpdateAttendanceStatusRequest request) {
        try {
            AttendanceResponse response = eventService.updateAttendanceStatus(eventId, attendanceId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Failed: " + e.getMessage());
        }
    }
}