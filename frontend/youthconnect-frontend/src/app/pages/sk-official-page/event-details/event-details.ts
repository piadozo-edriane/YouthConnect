import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, interval, of, Subscription, switchMap } from 'rxjs';
import { EventService, EventResponse, EventRequest, AttendanceResponse } from '../../../services/event.service';
import { YouthMemberManagementService } from '../../../services/youth-member-management.service';
import { AuthService } from '../../../services/auth.service';

export interface AttendeeRecord {
  attendanceId: number;
  userId: number;
  youthId: number;
  name: string;
  email: string;
  contactNumber: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  registeredAt: string;
}

@Component({
  selector: 'app-event-details-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './event-details.html',
  styleUrl: './event-details.scss',
  standalone: true
})
export class EventDetailsPage implements OnInit, OnDestroy {
  private eventService = inject(EventService);
  private youthMemberService = inject(YouthMemberManagementService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  selectedEvent: EventResponse | null = null;
  isLoading = false;
  isLoadingAttendees = false;
  errorMessage = '';

  // All attendee records (raw, with approvalStatus)
  allAttendees: AttendeeRecord[] = [];

  // Approval panel
  isApprovalPanelOpen = false;
  approvalFilter: 'pending' | 'approved' | 'rejected' = 'pending';
  approvalSearchQuery = '';
  approvalCurrentPage = 1;
  approvalItemsPerPage = 10;
  updatingAttendanceId: number | null = null;
  updatingAction: 'approve' | 'reject' | null = null;
  approvalMessage = '';
  approvalError = '';

  // Rejection modal
  isRejectModalOpen = false;
  rejectingAttendee: AttendeeRecord | null = null;

  // Attendee details modal
  isAttendeeDetailsModalOpen = false;
  selectedAttendeeProfile: any = null;

  // Toast notifications
  notifications: { id: number; message: string; type: 'success' | 'error' }[] = [];
  private notificationCounter = 0;

  // Edit modal
  isEditModalOpen = false;
  isEditConfirmModalOpen = false;
  editForm!: FormGroup;
  editModalError = '';
  pendingEditPayload: EventRequest | null = null;
  currentAdminId = 0;
  private editFormOriginalValues: any = null;

  // Delete modal
  isDeleteModalOpen = false;

  // Status update
  isStatusUpdating = false;
  isStatusConfirmModalOpen = false;
  pendingStatusEvent: EventResponse | null = null;
  pendingNextStatus: string = '';

  private pollSubscription: Subscription | null = null;
  private readonly POLL_INTERVAL_MS = 10000; // poll every 10 seconds
  private currentEventId: number = 0;

  ngOnInit(): void {
    this.initEditForm();
    this.loadCurrentAdmin();
    this.route.paramMap.subscribe(() => {
      this.loadEventDetails();
      this.startPolling();
    });
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private get isAnyModalOpen(): boolean {
    return this.isEditModalOpen
      || this.isEditConfirmModalOpen
      || this.isDeleteModalOpen
      || this.isAttendeeDetailsModalOpen
      || this.isStatusConfirmModalOpen;
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollSubscription = interval(this.POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => forkJoin({
          events: this.eventService.getAllEvents(),
          rsvps: this.currentEventId ? this.eventService.getEventRsvps(this.currentEventId) : of([] as AttendanceResponse[]),
          profiles: this.youthMemberService.getYouthProfiles(),
          users: this.youthMemberService.getUsers()
        }))
      )
      .subscribe({
        next: ({ events, rsvps, profiles, users }) => {
          // Skip update if a modal is open to avoid disrupting the user
          if (this.isAnyModalOpen) return;

          // Refresh event details
          const event = events.find(e => e.eventId === this.currentEventId);
          if (event) {
            this.selectedEvent = {
              ...event,
              expectedCount: event.expectedCount ?? (event.rsvpCount || 0)
            };
          }

          // Refresh attendees
          const userToYouthMap = new Map(users.map(u => [u.userId, u.youthId]));
          const profileMap = new Map(profiles.map(p => [p.youthId, p]));
          const userMap = new Map(users.map(u => [u.userId, u]));

          this.allAttendees = rsvps.map((rsvp) => {
            const youthId = userToYouthMap.get(rsvp.userId) || 0;
            const profile = youthId ? profileMap.get(youthId) : null;
            const user = userMap.get(rsvp.userId);
            const name = profile
              ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
              : 'Unknown User';
            const email = user?.email || 'No email';
            const contactNumber = profile?.contactNumber || 'N/A';

            return {
              attendanceId: rsvp.attendanceId,
              userId: rsvp.userId,
              youthId,
              name,
              email,
              contactNumber,
              approvalStatus: (rsvp.approvalStatus || 'pending') as 'pending' | 'approved' | 'rejected',
              registeredAt: rsvp.registeredAt
            };
          });
        },
        error: (error) => {
          console.error('Polling error:', error);
        }
      });
  }

  private stopPolling(): void {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = null;
    }
  }

  private initEditForm(): void {
    this.editForm = this.fb.group({
      eventTitle:    ['', [Validators.required, Validators.maxLength(200)]],
      description:   ['', [Validators.required, Validators.maxLength(5000)]],
      dateTime:      ['', Validators.required],
      location:      ['', [Validators.required, Validators.maxLength(255)]],
      attendeeLimit: [null, [Validators.required, Validators.min(1), Validators.max(99999)]]
    });
  }

  private loadCurrentAdmin(): void {
    const user = this.authService.getCurrentUser() as any;
    if (user?.adminId) {
      this.currentAdminId = user.adminId;
    } else {
      const stored = localStorage.getItem('sk_official_id') || localStorage.getItem('adminId');
      this.currentAdminId = stored ? Number(stored) : 0;
    }
  }

  goBack(): void {
    this.router.navigate(['/sk-official/events']);
  }

  editEvent(event: EventResponse): void {
    this.editModalError = '';
    this.pendingEditPayload = null;

    const dateObj = new Date(event.eventDate);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateTimeLocal = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;

    const values = {
      eventTitle:    event.title,
      description:   event.description,
      dateTime:      dateTimeLocal,
      location:      event.location,
      attendeeLimit: event.attendeeLimit ?? null
    };

    this.editForm.patchValue(values);
    this.editFormOriginalValues = { ...values };
    this.isEditModalOpen = true;
  }

  get editFormHasChanges(): boolean {
    if (!this.editFormOriginalValues) return false;
    const current = this.editForm.value;
    return Object.keys(this.editFormOriginalValues).some(
      key => String(current[key] ?? '') !== String(this.editFormOriginalValues[key] ?? '')
    );
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editForm.reset();
    this.editModalError = '';
    this.pendingEditPayload = null;
    this.editFormOriginalValues = null;
  }

  submitEditEvent(): void {
    if (this.editForm.invalid) {
      Object.keys(this.editForm.controls).forEach(k => this.editForm.get(k)?.markAsTouched());
      this.editModalError = 'Please fill in all required fields correctly.';
      return;
    }

    const v = this.editForm.value;
    const dateObj = new Date(v.dateTime);
    const pad = (n: number) => String(n).padStart(2, '0');
    const eventDate = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:00`;

    this.pendingEditPayload = {
      title:            v.eventTitle.trim(),
      description:      v.description.trim(),
      eventDate,
      location:         v.location.trim(),
      createdByAdminId: this.currentAdminId,
      status:           this.selectedEvent?.status || 'Upcoming',
      attendeeLimit:    v.attendeeLimit ? Number(v.attendeeLimit) : null
    };

    this.isEditConfirmModalOpen = true;
  }

  closeEditConfirmModal(): void {
    this.isEditConfirmModalOpen = false;
    this.pendingEditPayload = null;
  }

  confirmEditSubmission(): void {
    if (!this.pendingEditPayload || !this.selectedEvent) return;

    this.isLoading = true;
    this.eventService.editEvent(this.selectedEvent.eventId, this.pendingEditPayload).subscribe({
      next: (updated) => {
        this.selectedEvent = { ...this.selectedEvent!, ...updated };
        this.isLoading = false;
        this.closeEditConfirmModal();
        this.closeEditModal();
        this.showNotification('Event updated successfully!', 'success');
      },
      error: (error) => {
        console.error('Error updating event:', error);
        this.editModalError = error.error?.message || 'Failed to update event. Please try again.';
        this.isLoading = false;
        this.closeEditConfirmModal();
      }
    });
  }

  deleteEvent(event: EventResponse): void {
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
  }

  confirmDeleteEvent(): void {
    if (!this.selectedEvent) return;
    this.isLoading = true;
    this.eventService.deleteEvent(this.selectedEvent.eventId).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/sk-official/events']);
      },
      error: (error) => {
        console.error('Error deleting event:', error);
        this.isLoading = false;
        this.closeDeleteModal();
        this.showNotification('Failed to delete event. Please try again.', 'error');
      }
    });
  }

  loadEventDetails(): void {
    const eventId = Number(this.route.snapshot.paramMap.get('eventId'));
    if (!eventId) {
      this.errorMessage = 'Event not found.';
      this.selectedEvent = null;
      return;
    }

    this.currentEventId = eventId;
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
    this.allAttendees = [];

    forkJoin({
      rsvps: this.eventService.getEventRsvps(eventId),
      profiles: this.youthMemberService.getYouthProfiles(),
      users: this.youthMemberService.getUsers()
    }).subscribe({
      next: ({ rsvps, profiles, users }) => {
        const userToYouthMap = new Map(users.map(u => [u.userId, u.youthId]));
        const profileMap = new Map(profiles.map(p => [p.youthId, p]));
        const userMap = new Map(users.map(u => [u.userId, u]));

        this.allAttendees = rsvps.map(rsvp => {
          const youthId = userToYouthMap.get(rsvp.userId) || 0;
          const profile = youthId ? profileMap.get(youthId) : null;
          const user = userMap.get(rsvp.userId);
          const name = profile
            ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
            : 'Unknown User';
          const email = user?.email || 'No email';
          const contactNumber = profile?.contactNumber || 'N/A';

          return {
            attendanceId: rsvp.attendanceId,
            userId: rsvp.userId,
            youthId,
            name,
            email,
            contactNumber,
            approvalStatus: (rsvp.approvalStatus || 'pending') as 'pending' | 'approved' | 'rejected',
            registeredAt: rsvp.registeredAt
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

  // ─── Counts ───────────────────────────────────────────────────────────────

  get pendingCount(): number {
    return this.allAttendees.filter(a => a.approvalStatus === 'pending').length;
  }

  get approvedCount(): number {
    return this.allAttendees.filter(a => a.approvalStatus === 'approved').length;
  }

  get rejectedCount(): number {
    return this.allAttendees.filter(a => a.approvalStatus === 'rejected').length;
  }

  get approvedAttendees(): AttendeeRecord[] {
    return this.allAttendees.filter(a => a.approvalStatus === 'approved');
  }

  get isApprovalLocked(): boolean {
    const s = (this.selectedEvent?.status || '').toLowerCase();
    return s === 'ongoing' || s === 'completed';
  }

  // ─── Approval Panel ───────────────────────────────────────────────────────

  openApprovalPanel(): void {
    this.isApprovalPanelOpen = true;
    this.approvalFilter = 'pending';
    this.approvalSearchQuery = '';
    this.approvalCurrentPage = 1;
    this.approvalError = '';
    this.approvalMessage = '';
  }

  closeApprovalPanel(): void {
    if (this.updatingAttendanceId !== null) return;
    this.isApprovalPanelOpen = false;
    this.approvalError = '';
    this.approvalMessage = '';
  }

  setApprovalFilter(filter: 'pending' | 'approved' | 'rejected'): void {
    this.approvalFilter = filter;
    this.approvalSearchQuery = '';
    this.approvalCurrentPage = 1;
  }

  get filteredApprovalAttendees(): AttendeeRecord[] {
    let list = this.allAttendees.filter(a => a.approvalStatus === this.approvalFilter);
    if (this.approvalSearchQuery.trim()) {
      const q = this.approvalSearchQuery.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.contactNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }

  get paginatedApprovalAttendees(): AttendeeRecord[] {
    const start = (this.approvalCurrentPage - 1) * this.approvalItemsPerPage;
    return this.filteredApprovalAttendees.slice(start, start + this.approvalItemsPerPage);
  }

  get approvalTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredApprovalAttendees.length / this.approvalItemsPerPage));
  }

  get approvalPageNumbers(): number[] {
    return Array.from({ length: this.approvalTotalPages }, (_, i) => i + 1);
  }

  goToApprovalPage(page: number): void {
    if (page >= 1 && page <= this.approvalTotalPages) {
      this.approvalCurrentPage = page;
    }
  }

  nextApprovalPage(): void {
    if (this.approvalCurrentPage < this.approvalTotalPages) this.approvalCurrentPage++;
  }

  previousApprovalPage(): void {
    if (this.approvalCurrentPage > 1) this.approvalCurrentPage--;
  }

  approveAttendee(attendee: AttendeeRecord): void {
    if (!this.selectedEvent) return;
    this.updatingAttendanceId = attendee.attendanceId;
    this.updatingAction = 'approve';
    this.approvalError = '';
    this.approvalMessage = '';

    this.eventService.updateAttendanceStatus(this.selectedEvent.eventId, attendee.attendanceId, 'approved').subscribe({
      next: (updated) => {
        this.allAttendees = this.allAttendees.map(a =>
          a.attendanceId === attendee.attendanceId
            ? { ...a, approvalStatus: updated.approvalStatus }
            : a
        );
        this.approvalMessage = `${attendee.name} has been approved.`;
        this.updatingAttendanceId = null;
        this.updatingAction = null;
        setTimeout(() => { this.approvalMessage = ''; }, 3000);
      },
      error: (error) => {
        console.error('Error approving attendee:', error);
        this.approvalError = 'Failed to approve attendee. Please try again.';
        this.updatingAttendanceId = null;
        this.updatingAction = null;
        setTimeout(() => { this.approvalError = ''; }, 3000);
      }
    });
  }

  openRejectModal(attendee: AttendeeRecord): void {
    if (!this.selectedEvent) return;
    this.updatingAttendanceId = attendee.attendanceId;
    this.updatingAction = 'reject';
    this.approvalError = '';

    this.eventService.updateAttendanceStatus(this.selectedEvent.eventId, attendee.attendanceId, 'rejected').subscribe({
      next: (updated) => {
        this.allAttendees = this.allAttendees.map(a =>
          a.attendanceId === attendee.attendanceId
            ? { ...a, approvalStatus: updated.approvalStatus }
            : a
        );
        this.approvalMessage = `${attendee.name} has been rejected.`;
        this.updatingAttendanceId = null;
        this.updatingAction = null;
        setTimeout(() => { this.approvalMessage = ''; }, 3000);
      },
      error: (error) => {
        console.error('Error rejecting attendee:', error);
        this.approvalError = 'Failed to reject attendee. Please try again.';
        this.updatingAttendanceId = null;
        this.updatingAction = null;
        setTimeout(() => { this.approvalError = ''; }, 3000);
      }
    });
  }

  // ─── Attendee Details Modal ───────────────────────────────────────────────

  openAttendeeDetailsModal(attendee: AttendeeRecord): void {
    if (attendee.youthId === 0) return;

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
            email: user?.email || attendee.email || 'No email',
            approvalStatus: attendee.approvalStatus
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

  // ─── Chart helpers ────────────────────────────────────────────────────────

  getJoinPercentage(event: EventResponse): number {
    const cap = event.attendeeLimit || 0;
    if (cap === 0) return 0;
    return Math.min(100, Math.round((this.approvedCount / cap) * 100));
  }

  getRemainingCount(event: EventResponse): number {
    const cap = event.attendeeLimit || 0;
    return Math.max(0, cap - this.approvedCount);
  }

  getJoinStrokeDasharray(event: EventResponse): string {
    const percentage = this.getJoinPercentage(event);
    const circumference = 2 * Math.PI * 85;
    const filledLength = (percentage / 100) * circumference;
    const emptyLength = circumference - filledLength;
    return `${filledLength} ${emptyLength}`;
  }

  // ─── Event status helpers ─────────────────────────────────────────────────

  isEventOngoing(status?: string): boolean {
    return (status || '').toLowerCase() === 'ongoing';
  }

  isEditDisabled(status?: string): boolean {
    const s = (status || '').toLowerCase();
    return s === 'ongoing' || s === 'completed';
  }

  getStatusActionLabel(status?: string): string {
    const s = (status || 'Upcoming').toLowerCase();
    if (s === 'upcoming') return 'Set as Ongoing';
    if (s === 'ongoing') return 'Set as Completed';
    return 'Completed';
  }

  getStatusActionClass(status?: string): string {
    const s = (status || 'Upcoming').toLowerCase();
    if (s === 'upcoming') return 'ongoing-action';
    if (s === 'ongoing') return 'completed-action';
    return 'disabled-completed';
  }

  isStatusActionDisabled(status?: string): boolean {
    return (status || '').toLowerCase() === 'completed' || this.isStatusUpdating;
  }

  updateEventStatus(event: EventResponse): void {
    if (this.isStatusActionDisabled(event.status)) return;

    const currentStatus = (event.status || 'Upcoming').toLowerCase();
    this.pendingNextStatus = currentStatus === 'upcoming' ? 'Ongoing' : 'Completed';
    this.pendingStatusEvent = event;
    this.isStatusConfirmModalOpen = true;
  }

  closeStatusConfirmModal(): void {
    this.isStatusConfirmModalOpen = false;
    this.pendingStatusEvent = null;
    this.pendingNextStatus = '';
  }

  confirmStatusUpdate(): void {
    if (!this.pendingStatusEvent) return;
    const event = this.pendingStatusEvent;
    const nextStatus = this.pendingNextStatus;
    this.closeStatusConfirmModal();

    const request = {
      title: event.title,
      description: event.description,
      eventDate: event.eventDate,
      location: event.location,
      createdByAdminId: event.createdByAdminId,
      status: nextStatus,
      attendeeLimit: event.attendeeLimit ?? null
    };

    this.isStatusUpdating = true;
    this.eventService.editEvent(event.eventId, request).subscribe({
      next: () => {
        if (this.selectedEvent) {
          this.selectedEvent = { ...this.selectedEvent, status: nextStatus };
        }
        this.isStatusUpdating = false;
        this.showNotification(`Event status updated to ${nextStatus}`, 'success');
      },
      error: (error) => {
        console.error('Error updating event status:', error);
        this.isStatusUpdating = false;
        this.showNotification('Failed to update event status. Please try again.', 'error');
      }
    });
  }

  // ─── Date helpers ─────────────────────────────────────────────────────────

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatBirthday(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  getAge(birthday: string): number {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const id = ++this.notificationCounter;
    this.notifications = [...this.notifications, { id, message, type }];
    setTimeout(() => {
      this.notifications = this.notifications.filter(n => n.id !== id);
    }, 3000);
  }
}
