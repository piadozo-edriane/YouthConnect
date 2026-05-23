import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService, EventResponse } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { SkOfficialManagementService } from '../../../services/sk-official-management.service';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class EventsComponent implements OnInit {
  isModalOpen = false;
  eventForm!: FormGroup;
  events: EventResponse[] = [];
  filteredEvents: EventResponse[] = [];
  isLoading = false;
  errorMessage: string = '';
  successMessage: string = '';
  currentAdminId: number = 0;
  editingEventId: number | null = null;
  editingEvent: EventResponse | null = null;
  searchTerm: string = '';
  selectedStatusFilter: string = 'ALL';

  // Pagination for events
  eventsCurrentPage: number = 1;
  eventsItemsPerPage: number = 9;

  // Cache flag to prevent reloading
  private eventsLoaded = false;

  statusFilters = [
    { value: 'ALL',      label: 'All Events' },
    { value: 'Upcoming',  label: 'Upcoming' },
    { value: 'Ongoing',   label: 'Ongoing' },
    { value: 'Completed', label: 'Completed' },
  ];
  skOfficialName = 'SK Official';
  skOfficialEmail = '';
  skOfficialPosition = 'SK Official';
  skOfficialInitials = 'SK';
  notifications: { id: number; message: string; type: 'success' | 'error' }[] = [];
  private notificationCounter = 0;
  isDeleteConfirmationModalOpen = false;
  pendingDeleteEvent: EventResponse | null = null;
  isEditConfirmationModalOpen = false;
  pendingEditPayload: any = null;
  private pendingEditEventId: number | null = null;
  private pendingDeleteEventId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private authService: AuthService,
    private skOfficialService: SkOfficialManagementService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.getCurrentUser();
    this.loadSkOfficialProfile();
    this.loadEvents();
    this.watchRouteActions();
  }

  ngAfterViewInit() {
    this.setupScrollIndicators();
  }

  setupScrollIndicators() {
    setTimeout(() => {
      const modalBodyWrappers = document.querySelectorAll('.modal-body-wrapper, .details-modal-body-wrapper');
      
      modalBodyWrappers.forEach((wrapper) => {
        const element = wrapper as HTMLElement;
        
        const updateScrollIndicators = () => {
          const canScrollUp = element.scrollTop > 10;
          const canScrollDown = element.scrollTop < element.scrollHeight - element.clientHeight - 10;
          
          if (canScrollUp) {
            element.classList.add('can-scroll-up');
          } else {
            element.classList.remove('can-scroll-up');
          }
          
          if (canScrollDown) {
            element.classList.add('can-scroll-down');
          } else {
            element.classList.remove('can-scroll-down');
          }
        };
        
        element.addEventListener('scroll', updateScrollIndicators);
        updateScrollIndicators();
        
        const resizeObserver = new ResizeObserver(updateScrollIndicators);
        resizeObserver.observe(element);
      });
    }, 100);
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

  private parseParamId(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }

  private watchRouteActions(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.pendingEditEventId = this.parseParamId(params.get('edit'));
      this.pendingDeleteEventId = this.parseParamId(params.get('delete'));
      this.handlePendingActions();
    });
  }

  private handlePendingActions(): void {
    if (this.events.length === 0) {
      return;
    }

    const shouldClearParams = this.pendingEditEventId || this.pendingDeleteEventId;

    if (this.pendingEditEventId) {
      const event = this.events.find(item => item.eventId === this.pendingEditEventId);
      if (event) {
        this.editEvent(event);
      }
      this.pendingEditEventId = null;
    }

    if (this.pendingDeleteEventId) {
      const event = this.events.find(item => item.eventId === this.pendingDeleteEventId);
      if (event) {
        this.deleteEvent(event);
      }
      this.pendingDeleteEventId = null;
    }

    if (shouldClearParams) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { edit: null, delete: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  initForm() {
    this.eventForm = this.fb.group({
      eventTitle: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.maxLength(5000)]],
      dateTime: ['', Validators.required],
      location: ['', [Validators.required, Validators.maxLength(255)]],
      attendeeLimit: [null, [Validators.required, Validators.min(1), Validators.max(99999)]]
    });
  }

  getCurrentUser() {
    const user = this.authService.getCurrentUser() as any;
    if (user && user.adminId) {
      this.currentAdminId = user.adminId;
      localStorage.setItem('adminId', user.adminId.toString());
    }

    if (!this.currentAdminId) {
      const storedAdminId = localStorage.getItem('sk_official_id') || localStorage.getItem('adminId');
      this.currentAdminId = storedAdminId ? Number(storedAdminId) : 0;
    }
  }

  loadSkOfficialProfile() {
    const fallbackName = localStorage.getItem('sk_official_name') || 'SK Official';
    const fallbackEmail = localStorage.getItem('sk_official_email') || '';
    const fallbackInitials = this.getInitials(fallbackName);
    const currentAdminId = Number(localStorage.getItem('sk_official_id') || localStorage.getItem('adminId'));

    this.skOfficialName = fallbackName;
    this.skOfficialEmail = fallbackEmail;
    this.skOfficialInitials = fallbackInitials;

    this.skOfficialService.getSkOfficials().subscribe({
      next: (officials) => {
        const matched = officials.find((official) => official.adminId === currentAdminId)
          || officials.find((official) => official.email === fallbackEmail);

        if (!matched) {
          return;
        }

        this.skOfficialName = `${matched.firstName} ${matched.lastName}`.trim();
        this.skOfficialEmail = matched.email;
        this.skOfficialInitials = this.getInitials(this.skOfficialName);
        localStorage.setItem('sk_official_name', this.skOfficialName);
        localStorage.setItem('sk_official_email', matched.email);
      },
      error: (error) => {
        console.error('Error loading SK Official profile:', error);
      }
    });
  }

  getInitials(name: string): string {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) {
      return 'SK';
    }
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  loadEvents() {
    // Only load if not already loaded
    if (this.eventsLoaded && this.events.length > 0) {
      return;
    }

    this.isLoading = true;
    this.eventService.getAllEvents().subscribe({
      next: (data) => {
        // Ensure all events have expectedCount with a default value
        this.events = data.map(event => ({
          ...event,
          expectedCount: event.expectedCount ?? (event.rsvpCount || 0)
        }));
        this.filteredEvents = this.events;
        this.searchTerm = '';
        this.selectedStatusFilter = 'ALL';
        this.eventsLoaded = true; // Mark as loaded
        this.isLoading = false;
        this.handlePendingActions();
      },
      error: (error) => {
        console.error('Error loading events:', error);
        this.errorMessage = 'Failed to load events';
        this.isLoading = false;
      }
    });
  }

  viewEvent(event: EventResponse): void {
    this.router.navigate(['/sk-official/events', event.eventId]);
  }

  searchEvents(term: string) {
    this.searchTerm = term;
    this.applyFilters();
  }

  onSearchChange(term: string) {
    this.searchTerm = term;
    this.applyFilters();
  }

  onStatusFilterChange(status: string) {
    this.selectedStatusFilter = status;
    this.applyFilters();
  }

  applyFilters() {
    let result = [...this.events];

    if (this.selectedStatusFilter !== 'ALL') {
      result = result.filter(e => (e.status || '').toLowerCase() === this.selectedStatusFilter.toLowerCase());
    }

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q)
      );
    }

    this.filteredEvents = result;
    this.eventsCurrentPage = 1; // Reset to first page when filters change
  }

  // Pagination getters and methods
  get paginatedEvents(): EventResponse[] {
    const startIndex = (this.eventsCurrentPage - 1) * this.eventsItemsPerPage;
    const endIndex = startIndex + this.eventsItemsPerPage;
    return this.filteredEvents.slice(startIndex, endIndex);
  }

  get eventsTotalPages(): number {
    return Math.ceil(this.filteredEvents.length / this.eventsItemsPerPage);
  }

  get eventsVisiblePages(): number[] {
    const totalPages = this.eventsTotalPages;
    const currentPage = this.eventsCurrentPage;

    if (totalPages <= 0) {
      return [];
    }

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

  get showEventsLeftEllipsis(): boolean {
    const pages = this.eventsVisiblePages;
    return this.eventsTotalPages > 3 && pages.length > 0 && pages[0] > 1;
  }

  get showEventsRightEllipsis(): boolean {
    const pages = this.eventsVisiblePages;
    return this.eventsTotalPages > 3 && pages.length > 0 && pages[pages.length - 1] < this.eventsTotalPages;
  }

  goToEventsPage(page: number): void {
    if (page >= 1 && page <= this.eventsTotalPages) {
      this.eventsCurrentPage = page;
    }
  }

  nextEventsPage(): void {
    if (this.eventsCurrentPage < this.eventsTotalPages) {
      this.eventsCurrentPage++;
    }
  }

  previousEventsPage(): void {
    if (this.eventsCurrentPage > 1) {
      this.eventsCurrentPage--;
    }
  }

  openModal() {
    this.isModalOpen = true;
    this.editingEventId = null;
    this.editingEvent = null;
    this.eventForm.reset();
    this.errorMessage = '';
    this.successMessage = '';
    setTimeout(() => this.setupScrollIndicators(), 100);
  }

  editEvent(event: EventResponse) {
    this.isModalOpen = true;
    this.editingEventId = event.eventId;
    this.editingEvent = event;
    this.errorMessage = '';
    this.successMessage = '';

    // Convert ISO date to datetime-local format
    const dateObj = new Date(event.eventDate);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const dateTimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`;

    this.eventForm.patchValue({
      eventTitle: event.title,
      description: event.description,
      dateTime: dateTimeLocal,
      location: event.location,
      attendeeLimit: event.attendeeLimit ?? null
    });
    
    setTimeout(() => this.setupScrollIndicators(), 100);
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingEventId = null;
    this.editingEvent = null;
    this.eventForm.reset();
    this.errorMessage = '';
    this.successMessage = '';
  }

  submitEvent() {
    if (this.editingEventId) {
      // Show confirmation modal for edit
      if (this.eventForm.invalid) {
        // Mark all fields as touched to show validation errors
        Object.keys(this.eventForm.controls).forEach(key => {
          this.eventForm.get(key)?.markAsTouched();
        });
        
        // Show specific validation error
        if (this.eventForm.get('eventTitle')?.hasError('maxlength')) {
          this.errorMessage = 'Event title cannot exceed 200 characters';
        } else if (this.eventForm.get('description')?.hasError('maxlength')) {
          this.errorMessage = 'Event description cannot exceed 5000 characters';
        } else if (this.eventForm.get('location')?.hasError('maxlength')) {
          this.errorMessage = 'Event location cannot exceed 255 characters';
        } else {
          this.errorMessage = 'Please fill in all required fields correctly';
        }
        return;
      }

      const formValue = this.eventForm.value;
      
      // Ensure all required fields are present and not empty
      if (!formValue.eventTitle?.trim() || !formValue.description?.trim() || 
          !formValue.location?.trim() || !formValue.dateTime) {
        this.errorMessage = 'Please fill in all required fields correctly';
        return;
      }

      // Convert datetime-local to ISO 8601 format without milliseconds and timezone
      const dateObj = new Date(formValue.dateTime);
      if (isNaN(dateObj.getTime())) {
        this.errorMessage = 'Invalid date format';
        return;
      }
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      const seconds = String(dateObj.getSeconds()).padStart(2, '0');
      const eventDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

      this.pendingEditPayload = {
        title: formValue.eventTitle.trim(),
        description: formValue.description.trim(),
        eventDate: eventDate,
        location: formValue.location.trim(),
        createdByAdminId: this.currentAdminId,
        status: this.editingEvent?.status || 'Upcoming',
        attendeeLimit: formValue.attendeeLimit ? Number(formValue.attendeeLimit) : null
      };

      console.log('Prepared edit payload:', this.pendingEditPayload);

      this.isEditConfirmationModalOpen = true;
    } else {
      this.createEvent();
    }
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const id = ++this.notificationCounter;
    this.notifications = [...this.notifications, { id, message, type }];

    setTimeout(() => {
      this.notifications = this.notifications.filter(notification => notification.id !== id);
    }, 3000);
  }

  saveEditedEvent() {
    if (this.eventForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly';
      return;
    }

    if (!this.editingEventId) {
      this.errorMessage = 'Event ID not found';
      return;
    }

    const formValue = this.eventForm.value;
    
    // Convert datetime-local to LocalDateTime format for backend (without timezone)
    const dateObj = new Date(formValue.dateTime);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    const eventDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

    const request = {
      title: formValue.eventTitle,
      description: formValue.description,
      eventDate: eventDate,
      location: formValue.location,
      createdByAdminId: this.currentAdminId,
      status: this.editingEvent?.status || 'Upcoming'
    };

    console.log('Saving edited event:', { eventId: this.editingEventId, request });

    this.isLoading = true;
    this.eventService.editEvent(this.editingEventId, request).subscribe({
      next: () => {
        this.successMessage = '';
        this.showNotification('Event updated successfully!');
        this.eventForm.reset();
        this.editingEventId = null;
        this.editingEvent = null;
        this.loadEvents();
        this.closeModal();
      },
      error: (error) => {
        console.error('Error updating event:', error);
        this.errorMessage = error.error?.message || 'Failed to update event. Please try again.';
        this.isLoading = false;
      }
    });
  }

  createEvent() {
    if (this.eventForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.eventForm.controls).forEach(key => {
        this.eventForm.get(key)?.markAsTouched();
      });
      
      // Show specific validation error
      if (this.eventForm.get('eventTitle')?.hasError('maxlength')) {
        this.errorMessage = 'Event title cannot exceed 200 characters';
      } else if (this.eventForm.get('description')?.hasError('maxlength')) {
        this.errorMessage = 'Event description cannot exceed 5000 characters';
      } else if (this.eventForm.get('location')?.hasError('maxlength')) {
        this.errorMessage = 'Event location cannot exceed 255 characters';
      } else {
        this.errorMessage = 'Please fill in all required fields correctly';
      }
      return;
    }

    if (!this.currentAdminId) {
      this.errorMessage = 'User information not found. Please log in again.';
      return;
    }

    const formValue = this.eventForm.value;
    
    // Ensure all required fields are present and not empty
    if (!formValue.eventTitle?.trim() || !formValue.description?.trim() || 
        !formValue.location?.trim() || !formValue.dateTime) {
      this.errorMessage = 'Please fill in all required fields correctly';
      return;
    }
    
    // Convert datetime-local to ISO 8601 format without milliseconds and timezone
    const dateObj = new Date(formValue.dateTime);
    if (isNaN(dateObj.getTime())) {
      this.errorMessage = 'Invalid date format';
      return;
    }
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    const eventDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

    const request = {
      title: formValue.eventTitle.trim(),
      description: formValue.description.trim(),
      eventDate: eventDate,
      location: formValue.location.trim(),
      createdByAdminId: this.currentAdminId,
      status: 'Upcoming',
      attendeeLimit: formValue.attendeeLimit ? Number(formValue.attendeeLimit) : null
    };

    this.isLoading = true;
    this.eventService.createEvent(request).subscribe({
      next: () => {
        this.successMessage = '';
        this.showNotification('Event created successfully!');
        this.eventForm.reset();
        this.loadEvents();
        this.closeModal();
      },
      error: (error) => {
        console.error('Error creating event:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message
        });
        
        // Parse backend error message
        let errorMsg = 'Failed to create event. Please try again.';
        if (error.error && typeof error.error === 'string') {
          if (error.error.includes('Data too long for column')) {
            if (error.error.includes("'title'")) {
              errorMsg = 'Event title is too long. Maximum 200 characters allowed.';
            } else if (error.error.includes("'description'")) {
              errorMsg = 'Event description is too long. Maximum 5000 characters allowed.';
            } else if (error.error.includes("'location'")) {
              errorMsg = 'Event location is too long. Maximum 255 characters allowed.';
            }
          } else {
            errorMsg = error.error;
          }
        }
        
        this.errorMessage = errorMsg;
        this.isLoading = false;
      }
    });
  }

  deleteEvent(event: EventResponse) {
    this.pendingDeleteEvent = event;
    this.isDeleteConfirmationModalOpen = true;
  }

  closeDeleteConfirmationModal(): void {
    this.isDeleteConfirmationModalOpen = false;
    this.pendingDeleteEvent = null;
  }

  confirmDeleteSubmission(): void {
    if (!this.pendingDeleteEvent) {
      return;
    }

    this.isLoading = true;

    this.eventService.deleteEvent(this.pendingDeleteEvent.eventId).subscribe({
      next: () => {
        this.showNotification('Event deleted successfully!');
        this.isLoading = false;
        this.closeDeleteConfirmationModal();
        this.loadEvents();
      },
      error: (error) => {
        console.error('Error deleting event:', error);
        this.errorMessage = 'Failed to delete event';
        this.isLoading = false;
      }
    });
  }

  closeEditConfirmationModal(): void {
    this.isEditConfirmationModalOpen = false;
    this.pendingEditPayload = null;
  }

  confirmEditSubmission(): void {
    if (!this.pendingEditPayload || !this.editingEventId) {
      return;
    }

    this.isLoading = true;

    console.log('Sending edit request:', {
      eventId: this.editingEventId,
      payload: this.pendingEditPayload
    });

    this.eventService.editEvent(this.editingEventId, this.pendingEditPayload).subscribe({
      next: () => {
        this.showNotification('Event updated successfully!');
        this.isLoading = false;
        this.closeEditConfirmationModal();
        this.eventForm.reset();
        this.editingEventId = null;
        this.editingEvent = null;
        this.loadEvents();
        this.closeModal();
      },
      error: (error) => {
        console.error('Error updating event:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message
        });
        
        // Parse backend error message
        let errorMsg = 'Failed to update event. Please try again.';
        if (error.error && typeof error.error === 'string') {
          if (error.error.includes('Data too long for column')) {
            if (error.error.includes("'title'")) {
              errorMsg = 'Event title is too long. Maximum 200 characters allowed.';
            } else if (error.error.includes("'description'")) {
              errorMsg = 'Event description is too long. Maximum 5000 characters allowed.';
            } else if (error.error.includes("'location'")) {
              errorMsg = 'Event location is too long. Maximum 255 characters allowed.';
            }
          } else {
            errorMsg = error.error;
          }
        }
        
        this.errorMessage = errorMsg;
        this.isLoading = false;
      }
    });
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

  updateEventStatus(event: EventResponse) {
    if (this.isStatusActionDisabled(event.status)) {
      return;
    }

    const currentStatus = (event.status || 'Upcoming').toLowerCase();
    const nextStatus = currentStatus === 'upcoming' ? 'Ongoing' : 'Completed';

    // Convert eventDate to LocalDateTime format (without timezone)
    const dateObj = new Date(event.eventDate);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    const eventDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

    const request = {
      title: event.title,
      description: event.description,
      eventDate: eventDate,
      location: event.location,
      createdByAdminId: event.createdByAdminId,
      status: nextStatus
    };

    this.errorMessage = '';

    this.eventService.editEvent(event.eventId, request).subscribe({
      next: () => {
        // Update the event in the local arrays
        const index = this.events.findIndex(e => e.eventId === event.eventId);
        if (index !== -1) {
          this.events[index].status = nextStatus;
          this.filteredEvents = [...this.events];
        }
        
        this.showNotification(`Event status updated to ${nextStatus}`);
      },
      error: (error) => {
        console.error('Error updating event status:', error);
        this.showNotification(error.error?.message || 'Failed to update event status', 'error');
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
    const circumference = 2 * Math.PI * 80; // 2πr where r=80
    const filledLength = (percentage / 100) * circumference;
    const emptyLength = circumference - filledLength;
    
    return `${filledLength} ${emptyLength}`;
  }

  // TrackBy function for optimal rendering
  trackByEventId(index: number, event: EventResponse): number {
    return event.eventId;
  }
}
