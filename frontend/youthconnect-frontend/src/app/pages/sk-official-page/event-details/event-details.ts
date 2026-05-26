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
  isAttended: boolean;
  attendedAt?: string;
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
  approvalItemsPerPage = 15;
  updatingAttendanceId: number | null = null;
  updatingAction: 'approve' | 'reject' | null = null;
  approvalMessage = '';
  approvalError = '';

  // Rejection modal
  isRejectModalOpen = false;
  rejectingAttendee: AttendeeRecord | null = null;
  rejectionReason = '';
  rejectionError = '';

  // Post-Event Attendance Panel
  isAttendancePanelOpen = false;
  attendanceSearchQuery = '';
  attendanceCurrentPage = 1;
  attendanceItemsPerPage = 10;
  markingAttendanceId: number | null = null;
  attendancePanelMessage = '';
  attendancePanelError = '';
  attendanceStatFilter: 'present' | 'absent' | 'approved' | null = null;

  // Attendee details modal
  isAttendeeDetailsModalOpen = false;
  selectedAttendeeProfile: any = null;
  attendeeModalStatusLabel = '';

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

  private returnTo: string = 'events'; // default fallback

  ngOnInit(): void {
    this.initEditForm();
    this.loadCurrentAdmin();
    // Capture returnTo before history.state is cleared by subsequent navigations
    this.returnTo = history.state?.returnTo || 'events';
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
      || this.isStatusConfirmModalOpen
      || this.isAttendancePanelOpen;
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
              registeredAt: rsvp.registeredAt,
              isAttended: rsvp.isAttended ?? false,
              attendedAt: rsvp.attendedAt ?? undefined
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
      eventTitle: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.maxLength(5000)]],
      dateTime: ['', Validators.required],
      location: ['', [Validators.required, Validators.maxLength(255)]],
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
    if (this.returnTo === 'dashboard') {
      this.router.navigate(['/sk-official/dashboard']);
    } else {
      this.router.navigate(['/sk-official/events']);
    }
  }

  editEvent(event: EventResponse): void {
    this.editModalError = '';
    this.pendingEditPayload = null;

    const dateObj = new Date(event.eventDate);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateTimeLocal = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;

    const values = {
      eventTitle: event.title,
      description: event.description,
      dateTime: dateTimeLocal,
      location: event.location,
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
      title: v.eventTitle.trim(),
      description: v.description.trim(),
      eventDate,
      location: v.location.trim(),
      createdByAdminId: this.currentAdminId,
      status: this.selectedEvent?.status || 'Upcoming',
      attendeeLimit: v.attendeeLimit ? Number(v.attendeeLimit) : null
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
            registeredAt: rsvp.registeredAt,
            isAttended: rsvp.isAttended ?? false,
            attendedAt: rsvp.attendedAt ?? undefined
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

  get attendedCount(): number {
    return this.allAttendees.filter(a => a.approvalStatus === 'approved' && a.isAttended).length;
  }

  get absentCount(): number {
    return this.allAttendees.filter(a => a.approvalStatus === 'approved' && !a.isAttended).length;
  }

  get isAttendancePanelAvailable(): boolean {
    const s = (this.selectedEvent?.status || '').toLowerCase();
    return s === 'ongoing' || s === 'completed';
  }

  // ─── Post-Event Attendance Panel ──────────────────────────────────────────

  openAttendancePanel(): void {
    this.isAttendancePanelOpen = true;
    this.attendanceSearchQuery = '';
    this.attendanceCurrentPage = 1;
    this.attendancePanelMessage = '';
    this.attendancePanelError = '';
    this.attendanceStatFilter = null;
  }

  closeAttendancePanel(): void {
    if (this.markingAttendanceId !== null) return;
    this.isAttendancePanelOpen = false;
    this.attendancePanelMessage = '';
    this.attendancePanelError = '';
    this.attendanceStatFilter = null;
  }

  setAttendanceStatFilter(filter: 'present' | 'absent' | 'approved'): void {
    this.attendanceStatFilter = this.attendanceStatFilter === filter ? null : filter;
    this.attendanceSearchQuery = '';
    this.attendanceCurrentPage = 1;
  }

  get filteredAttendancePanelAttendees(): AttendeeRecord[] {
    let list = this.allAttendees.filter(a => a.approvalStatus === 'approved');

    if (this.attendanceStatFilter === 'present') {
      list = list.filter(a => a.isAttended);
    } else if (this.attendanceStatFilter === 'absent') {
      list = list.filter(a => !a.isAttended);
    }
    // 'approved' or null → show all approved (no extra filter)

    if (this.attendanceSearchQuery.trim()) {
      const q = this.attendanceSearchQuery.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.contactNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }

  get paginatedAttendancePanelAttendees(): AttendeeRecord[] {
    const start = (this.attendanceCurrentPage - 1) * this.attendanceItemsPerPage;
    return this.filteredAttendancePanelAttendees.slice(start, start + this.attendanceItemsPerPage);
  }

  get attendanceTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredAttendancePanelAttendees.length / this.attendanceItemsPerPage));
  }

  get attendancePageNumbers(): number[] {
    return Array.from({ length: this.attendanceTotalPages }, (_, i) => i + 1);
  }

  goToAttendancePage(page: number): void {
    if (page >= 1 && page <= this.attendanceTotalPages) {
      this.attendanceCurrentPage = page;
    }
  }

  nextAttendancePage(): void {
    if (this.attendanceCurrentPage < this.attendanceTotalPages) this.attendanceCurrentPage++;
  }

  previousAttendancePage(): void {
    if (this.attendanceCurrentPage > 1) this.attendanceCurrentPage--;
  }

  toggleAttendance(attendee: AttendeeRecord): void {
    if (!this.selectedEvent || this.markingAttendanceId !== null) return;

    // If already attended, we don't allow un-marking (attendance is a one-way record)
    if (attendee.isAttended) return;

    this.markingAttendanceId = attendee.attendanceId;
    this.attendancePanelError = '';
    this.attendancePanelMessage = '';

    this.eventService.markAttendance(this.selectedEvent.eventId, attendee.userId).subscribe({
      next: (updated) => {
        this.allAttendees = this.allAttendees.map(a =>
          a.attendanceId === attendee.attendanceId
            ? { ...a, isAttended: updated.isAttended, attendedAt: updated.attendedAt ?? undefined }
            : a
        );
        this.attendancePanelMessage = `${attendee.name} marked as present.`;
        this.markingAttendanceId = null;
        setTimeout(() => { this.attendancePanelMessage = ''; }, 3000);
      },
      error: (error) => {
        console.error('Error marking attendance:', error);
        this.attendancePanelError = 'Failed to mark attendance. Please try again.';
        this.markingAttendanceId = null;
        setTimeout(() => { this.attendancePanelError = ''; }, 3000);
      }
    });
  }

  formatAttendedAt(dateString?: string): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
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
    const totalPages = this.approvalTotalPages;
    if (totalPages === 0) {
      return [];
    }

    if (this.approvalCurrentPage > totalPages) {
      this.approvalCurrentPage = totalPages;
    }

    const start = (this.approvalCurrentPage - 1) * this.approvalItemsPerPage;
    return this.filteredApprovalAttendees.slice(start, start + this.approvalItemsPerPage);
  }

  get approvalTotalPages(): number {
    return Math.ceil(this.filteredApprovalAttendees.length / this.approvalItemsPerPage);
  }

  get approvalVisiblePages(): number[] {
    const totalPages = this.approvalTotalPages;
    const currentPage = this.approvalCurrentPage;

    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 2) {
      return [1, 2, 3];
    }

    if (currentPage >= totalPages - 1) {
      return [totalPages - 2, totalPages - 1, totalPages];
    }

    return [currentPage - 1, currentPage, currentPage + 1];
  }

  get showApprovalLeftEllipsis(): boolean {
    return this.approvalTotalPages > 3 && this.approvalCurrentPage > 2;
  }

  get showApprovalRightEllipsis(): boolean {
    return this.approvalTotalPages > 3 && this.approvalCurrentPage < this.approvalTotalPages - 1;
  }

  get showApprovalPagination(): boolean {
    return this.filteredApprovalAttendees.length > this.approvalItemsPerPage;
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

  trackByAttendanceId(index: number, attendee: AttendeeRecord): number {
    return attendee.attendanceId;
  }

  approveAttendee(attendee: AttendeeRecord): void {
    if (!this.selectedEvent) return;

    // Prevent double submission
    if (this.updatingAttendanceId !== null) {
      console.log('Already processing a request, ignoring duplicate click');
      return;
    }

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
    this.rejectingAttendee = attendee;
    this.rejectionReason = '';
    this.rejectionError = '';
    this.isRejectModalOpen = true;
  }

  closeRejectModal(): void {
    this.isRejectModalOpen = false;
    this.rejectingAttendee = null;
    this.rejectionReason = '';
    this.rejectionError = '';
  }

  confirmRejectAttendee(): void {
    if (!this.rejectingAttendee || !this.selectedEvent) return;

    if (!this.rejectionReason.trim()) {
      this.rejectionError = 'Please provide a reason for rejection.';
      return;
    }

    // Prevent double submission
    if (this.updatingAttendanceId !== null) {
      console.log('Already processing a request, ignoring duplicate click');
      return;
    }

    this.updatingAttendanceId = this.rejectingAttendee.attendanceId;
    this.updatingAction = 'reject';
    this.approvalError = '';
    this.rejectionError = '';

    this.eventService.updateAttendanceStatus(
      this.selectedEvent.eventId,
      this.rejectingAttendee.attendanceId,
      'rejected',
      this.rejectionReason.trim()
    ).subscribe({
      next: (updated) => {
        this.allAttendees = this.allAttendees.map(a =>
          a.attendanceId === this.rejectingAttendee!.attendanceId
            ? { ...a, approvalStatus: updated.approvalStatus }
            : a
        );
        this.approvalMessage = `${this.rejectingAttendee!.name} has been rejected.`;
        this.updatingAttendanceId = null;
        this.updatingAction = null;
        this.closeRejectModal();
        setTimeout(() => { this.approvalMessage = ''; }, 3000);
      },
      error: (error) => {
        console.error('Error rejecting attendee:', error);
        this.rejectionError = 'Failed to reject attendee. Please try again.';
        this.updatingAttendanceId = null;
        this.updatingAction = null;
      }
    });
  }

  // ─── Attendee Details Modal ───────────────────────────────────────────────

  openAttendeeDetailsModal(attendee: AttendeeRecord, statusOverride?: string): void {
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
          this.attendeeModalStatusLabel = statusOverride ?? attendee.approvalStatus;
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
    this.attendeeModalStatusLabel = '';
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
