package com.youthconnect.youthconnect_id.services;

import java.util.List;

import com.youthconnect.youthconnect_id.dto.AttendanceResponse;
import com.youthconnect.youthconnect_id.dto.EventRequest;
import com.youthconnect.youthconnect_id.dto.EventResponse;
import com.youthconnect.youthconnect_id.dto.MarkAttendanceRequest;
import com.youthconnect.youthconnect_id.dto.RsvpRequest;
import com.youthconnect.youthconnect_id.dto.UpdateAttendanceStatusRequest;

public interface EventService {
    EventResponse createEvent(EventRequest request);
    EventResponse editEvent(int eventId, EventRequest request);
    void deleteEvent(int eventId);
    List<EventResponse> getAllEvents();
    AttendanceResponse markAttendance(int eventId, MarkAttendanceRequest request);

    EventResponse getEventById(int eventId);
    AttendanceResponse rsvpEvent(RsvpRequest request);
    void cancelRsvp(int eventId, int userId);
    List<AttendanceResponse> getOwnRsvps(int userId);
    List<AttendanceResponse> getEventRsvps(int eventId);
    AttendanceResponse updateAttendanceStatus(int eventId, int attendanceId, UpdateAttendanceStatusRequest request);
}