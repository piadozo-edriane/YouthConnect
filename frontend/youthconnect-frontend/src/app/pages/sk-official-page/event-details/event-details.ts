import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EventService, EventResponse } from '../../../services/event.service';
import { YouthMemberManagementService } from '../../../services/youth-member-management.service';

@Component({
  selector: 'app-event-details-page',
  imports: [CommonModule],
  templateUrl: './event-details.html',
  styleUrl: './event-details.scss',
  standalone: true
})
export class EventDetailsPage implements OnInit {
  private eventService = inject(EventService);
  private youthMemberService = inject(YouthMemberManagementService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  selectedEvent: EventResponse | null = null;
  eventAttendees: Array<{ name: string; email: string; userId: number; youthId: number }> = [];
  isLoading = false;
  isLoadingAttendees = false;
  errorMessage = '';
  isAttendeeDetailsModalOpen = false;
  selectedAttendeeProfile: any = null;
  attendeesPageSize = 10;
  attendeesPage = 1;

  ngOnInit(): void {
    this.route.paramMap.subscribe(() => {
      this.loadEventDetails();
    });
  }

  goBack(): void {
    this.router.navigate(['/sk-official/events']);
  }

  editEvent(event: EventResponse): void {
    this.router.navigate(['/sk-official/events'], {
      queryParams: { edit: event.eventId }
    });
  }

  deleteEvent(event: EventResponse): void {
    this.router.navigate(['/sk-official/events'], {
      queryParams: { delete: event.eventId }
    });
  }

  loadEventDetails(): void {
    const eventId = Number(this.route.snapshot.paramMap.get('eventId'));
    if (!eventId) {
      this.errorMessage = 'Event not found.';
      this.selectedEvent = null;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.eventService.getAllEvents().subscribe({
      next: (events) => {
        const event = events.find(item => item.eventId === eventId);
        if (!event) {
          this.errorMessage = 'Event not found.';
          this.selectedEvent = null;
          this.isLoading = false;
          return;
        }

        this.selectedEvent = {
          ...event,
          expectedCount: event.expectedCount ?? (event.rsvpCount || 0)
        };
        this.isLoading = false;
        this.loadEventAttendees(event.eventId);
      },
      error: (error) => {
        console.error('Error loading event:', error);
        this.errorMessage = 'Failed to load event details.';
        this.selectedEvent = null;
        this.isLoading = false;
      }
    });
  }

  loadEventAttendees(eventId: number): void {
    this.isLoadingAttendees = true;
    this.eventAttendees = [];
    this.attendeesPage = 1;

    forkJoin({
      rsvps: this.eventService.getEventRsvps(eventId),
      profiles: this.youthMemberService.getYouthProfiles(),
      users: this.youthMemberService.getUsers()
    }).subscribe({
      next: ({ rsvps, profiles, users }) => {
        const userToYouthMap = new Map(users.map(user => [user.userId, user.youthId]));
        const profileMap = new Map(profiles.map(profile => [profile.youthId, profile]));

        this.eventAttendees = rsvps.map(rsvp => {
          const youthId = userToYouthMap.get(rsvp.userId);
          const profile = youthId ? profileMap.get(youthId) : null;
          const user = users.find(u => u.userId === rsvp.userId);

          const name = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Unknown User';
          const email = user?.email || 'No email';

          return {
            name,
            email,
            userId: rsvp.userId,
            youthId: youthId || 0
          };
        });

        this.isLoadingAttendees = false;
      },
      error: (error) => {
        console.error('Error loading event attendees:', error);
        this.isLoadingAttendees = false;
      }
    });
  }

  get totalAttendeePages(): number {
    return Math.max(1, Math.ceil(this.eventAttendees.length / this.attendeesPageSize));
  }

  get pagedEventAttendees(): Array<{ name: string; email: string; userId: number; youthId: number }> {
    const startIndex = (this.attendeesPage - 1) * this.attendeesPageSize;
    return this.eventAttendees.slice(startIndex, startIndex + this.attendeesPageSize);
  }

  nextAttendeePage(): void {
    if (this.attendeesPage < this.totalAttendeePages) {
      this.attendeesPage += 1;
    }
  }

  prevAttendeePage(): void {
    if (this.attendeesPage > 1) {
      this.attendeesPage -= 1;
    }
  }

  openAttendeeDetailsModal(attendee: any): void {
    if (attendee.youthId === 0) {
      return;
    }

    forkJoin({
      profiles: this.youthMemberService.getYouthProfiles(),
      users: this.youthMemberService.getUsers()
    }).subscribe({
      next: ({ profiles, users }) => {
        const profile = profiles.find(p => p.youthId === attendee.youthId);
        const user = users.find(u => u.youthId === attendee.youthId);

        if (profile) {
          this.selectedAttendeeProfile = {
            ...profile,
            email: user?.email || attendee.email || 'No email'
          };
          this.isAttendeeDetailsModalOpen = true;
        }
      },
      error: (error) => {
        console.error('Error loading attendee profile:', error);
      }
    });
  }

  closeAttendeeDetailsModal(): void {
    this.isAttendeeDetailsModalOpen = false;
    this.selectedAttendeeProfile = null;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatBirthday(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getAge(birthday: string): number {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  isEventOngoing(status?: string): boolean {
    return (status || '').toLowerCase() === 'ongoing';
  }

  isEditDisabled(status?: string): boolean {
    const normalizedStatus = (status || '').toLowerCase();
    return normalizedStatus === 'ongoing' || normalizedStatus === 'completed';
  }

  getStatusActionLabel(status?: string): string {
    const normalizedStatus = (status || 'Upcoming').toLowerCase();

    if (normalizedStatus === 'upcoming') {
      return 'Set as Ongoing';
    }

    if (normalizedStatus === 'ongoing') {
      return 'Set as Completed';
    }

    return 'Completed';
  }

  getStatusActionClass(status?: string): string {
    const normalizedStatus = (status || 'Upcoming').toLowerCase();

    if (normalizedStatus === 'upcoming') {
      return 'ongoing-action';
    }

    if (normalizedStatus === 'ongoing') {
      return 'completed-action';
    }

    return 'disabled-completed';
  }

  isStatusActionDisabled(status?: string): boolean {
    return (status || '').toLowerCase() === 'completed' || this.isLoading;
  }

  updateEventStatus(event: EventResponse): void {
    if (this.isStatusActionDisabled(event.status)) {
      return;
    }

    const currentStatus = (event.status || 'Upcoming').toLowerCase();
    const nextStatus = currentStatus === 'upcoming' ? 'Ongoing' : 'Completed';

    const request = {
      title: event.title,
      description: event.description,
      eventDate: event.eventDate,
      location: event.location,
      createdByAdminId: event.createdByAdminId,
      status: nextStatus
    };

    this.isLoading = true;

    this.eventService.editEvent(event.eventId, request).subscribe({
      next: () => {
        if (this.selectedEvent) {
          this.selectedEvent = {
            ...this.selectedEvent,
            status: nextStatus
          };
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error updating event status:', error);
        this.isLoading = false;
      }
    });
  }

  getJoinPercentage(event: EventResponse): number {
    const expectedCount = event.expectedCount || 0;
    const joinCount = event.rsvpCount || 0;

    if (expectedCount === 0) {
      return 0;
    }

    return Math.round((joinCount / expectedCount) * 100);
  }

  getRemainingCount(event: EventResponse): number {
    const expectedCount = event.expectedCount || 0;
    const joinCount = event.rsvpCount || 0;

    return Math.max(0, expectedCount - joinCount);
  }

  getJoinStrokeDasharray(event: EventResponse): string {
    const percentage = this.getJoinPercentage(event);
    const circumference = 2 * Math.PI * 85;
    const filledLength = (percentage / 100) * circumference;
    const emptyLength = circumference - filledLength;

    return `${filledLength} ${emptyLength}`;
  }
}
