import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { ConcernService, ConcernResponse } from './concern.service';
import { EventService, EventResponse } from './event.service';
import { NotificationService, NotificationResponse } from './notification.service';

export interface DashboardStats {
    myConcerns: number;
    upcomingEvents: number;
    eventsJoined: number;
    resolvedConcerns: number;
}

@Injectable({
    providedIn: 'root'
})
export class YouthDashboardService {
    constructor(
        private concernService: ConcernService,
        private eventService: EventService,
        private notificationService: NotificationService
    ) { }

    getDashboardData(youthId: number, userId: number): Observable<{
        stats: DashboardStats;
        upcomingEvents: EventResponse[];
        notifications: NotificationResponse[];
        concerns: ConcernResponse[];
        rsvpedEventIds: Set<number>;
    }> {
        return forkJoin({
            concerns: this.concernService.getOwnConcerns(youthId),
            events: this.eventService.getAllEvents(),
            rsvps: this.eventService.getOwnRsvps(userId),
            notifications: this.notificationService.getNotificationsByUserId(userId)
        }).pipe(
            map(result => {
                const rsvpedEventIds = new Set(result.rsvps.map(r => r.eventId));

                // Calculate stats
                const stats: DashboardStats = {
                    myConcerns: result.concerns.length,
                    upcomingEvents: result.events.filter(e =>
                        e.status === 'Upcoming' || e.status === 'Open for Registration'
                    ).length,
                    eventsJoined: result.rsvps.length,
                    resolvedConcerns: result.concerns.filter(c => c.status === 'RESOLVED').length
                };

                    // Get upcoming events (no hard limit; UI handles incremental display)
                const upcomingEvents = result.events
                    .filter(e => e.status === 'Upcoming' || e.status === 'Open for Registration')
                        ;

                    // Get notifications (no hard limit; UI handles incremental display)
                    const notifications = result.notifications;

                return {
                    stats,
                    upcomingEvents,
                    notifications,
                    concerns: result.concerns,
                    rsvpedEventIds
                };
            })
        );
    }
}
