package com.youthconnect.youthconnect_id.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.youthconnect.youthconnect_id.models.EventAttendance;
import com.youthconnect.youthconnect_id.repositories.projection.EventRsvpCountProjection;

@Repository
public interface EventAttendanceRepo extends JpaRepository<EventAttendance, Integer> {
    Optional<EventAttendance> findByEventIdAndUserId(int eventId, int userId);
    List<EventAttendance> findByUserId(int userId);
    List<EventAttendance> findByEventId(int eventId);
    List<EventAttendance> findByEventIdAndApprovalStatusIgnoreCase(int eventId, String approvalStatus);
    long countByEventId(int eventId);

    @Query("SELECT ea.userId FROM EventAttendance ea WHERE ea.eventId = :eventId AND LOWER(ea.approvalStatus) = LOWER(:approvalStatus)")
    List<Integer> findUserIdsByEventIdAndApprovalStatus(@Param("eventId") int eventId, @Param("approvalStatus") String approvalStatus);

    @Query("SELECT ea.eventId AS eventId, COUNT(ea) AS rsvpCount FROM EventAttendance ea WHERE ea.eventId IN :eventIds GROUP BY ea.eventId")
    List<EventRsvpCountProjection> countRsvpsByEventIds(@Param("eventIds") List<Integer> eventIds);
}