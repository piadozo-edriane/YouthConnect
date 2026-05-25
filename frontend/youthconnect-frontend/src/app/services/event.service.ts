import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

export interface RsvpRequest {
    eventId: number;
    userId: number;
}

export interface EventResponse {
    eventId: number;
    title: string;
    description: string;
    eventDate: string;
    location: string;
    createdByAdminId: number;
    status: string;
    createdAt: string;
    updatedAt?: string;
    rsvpCount: number;
    expectedCount: number;
    attendeeLimit?: number | null;
}

export interface AttendanceResponse {
    attendanceId: number;
    eventId: number;
    userId: number;
    isAttended: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    registeredAt: string;
    attendedAt?: string;
}

export interface EventRequest {
    title: string;
    description: string;
    eventDate: string;
    location: string;
    createdByAdminId: number;
    status?: string;
    attendeeLimit?: number | null;
}

@Injectable({
    providedIn: 'root'
})
export class EventService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/events`;
    private skApiUrl = `${environment.apiUrl}/api/sk/events`;

    // SK Official endpoints
    createEvent(request: EventRequest): Observable<EventResponse> {
        return this.http.post<EventResponse>(this.skApiUrl, request);
    }

    editEvent(eventId: number, request: EventRequest): Observable<EventResponse> {
        return this.http.put<EventResponse>(`${this.skApiUrl}/${eventId}`, request);
    }

    deleteEvent(eventId: number): Observable<any> {
        return this.http.delete(`${this.skApiUrl}/${eventId}`, { responseType: 'text' });
    }

    getAllEvents(): Observable<EventResponse[]> {
        return this.http.get<EventResponse[]>(this.skApiUrl);
    }

    // Youth endpoints (existing)
    getEventById(eventId: number): Observable<EventResponse> {
        return this.http.get<EventResponse>(`${this.apiUrl}/${eventId}`);
    }

    rsvpEvent(request: RsvpRequest): Observable<any> {
        return this.http.post(`${this.apiUrl}/rsvp`, request, { responseType: 'text' });
    }

    cancelRsvp(eventId: number, userId: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${eventId}/rsvp/${userId}`, { responseType: 'text' });
    }

    getOwnRsvps(userId: number): Observable<AttendanceResponse[]> {
        return this.http.get<AttendanceResponse[]>(`${this.apiUrl}/rsvp/user/${userId}`);
    }

    getEventRsvps(eventId: number): Observable<AttendanceResponse[]> {
        return this.http.get<AttendanceResponse[]>(`${this.skApiUrl}/${eventId}/rsvp`);
    }

    updateAttendanceStatus(eventId: number, attendanceId: number, approvalStatus: 'approved' | 'rejected' | 'pending'): Observable<AttendanceResponse> {
        return this.http.patch<AttendanceResponse>(`${this.skApiUrl}/${eventId}/rsvp/${attendanceId}/status`, { approvalStatus });
    }

    markAttendance(eventId: number, userId: number): Observable<AttendanceResponse> {
        return this.http.patch<AttendanceResponse>(`${this.skApiUrl}/${eventId}/attendance`, { userId });
    }
}
