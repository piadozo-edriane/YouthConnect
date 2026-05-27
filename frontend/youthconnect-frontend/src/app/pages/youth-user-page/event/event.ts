import { Component, inject, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { EventService, EventResponse } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, interval, Subscription, switchMap } from 'rxjs';

@Component({
    selector: 'app-event',
    imports: [CommonModule, TitleCasePipe],
    templateUrl: './event.html',
    styleUrl: './event.scss',
    encapsulation: ViewEncapsulation.None,
})
export class EventPage implements OnInit, OnDestroy {
    private eventService = inject(EventService);
    private authService = inject(AuthService);
    private route = inject(ActivatedRoute, { optional: true });

    showJoinModal = false;
    selectedEvent: EventResponse | null = null;
    userId: number = 0;
    isLoading = false;
    errorMessage = '';
    successMessage = '';

    // Confirmation modals
    showJoinConfirmModal = false;
    showCancelConfirmModal = false;
    pendingJoinEvent: EventResponse | null = null;
    pendingCancelEvent: EventResponse | null = null;

    // Event info modal
    showEventInfoModal = false;
    infoEvent: EventResponse | null = null;
    private reopenEventInfoModalAfterJoinConfirm = false;
    private reopenEventInfoModalAfterJoinSuccess = false;

    events: EventResponse[] = [];
    filteredEvents: EventResponse[] = [];
    joinedEventIds: Set<number> = new Set();
    joinApprovalStatus: Map<number, 'pending' | 'approved' | 'rejected'> = new Map();
    searchQuery = '';
    selectedStatusFilter: string = 'ALL';
    highlightedEventId: number | null = null;
    private pendingOpenEventId: number | null = null;

    // Pagination
    eventsCurrentPage = 1;
    eventsItemsPerPage = 9;

    private pollSubscription: Subscription | null = null;
    private readonly POLL_INTERVAL_MS = 10000; // poll every 10 seconds

    statusFilters = [
        { value: 'ALL', label: 'All Events' },
        { value: 'Upcoming', label: 'Upcoming' },
        { value: 'Ongoing', label: 'Ongoing' },
        { value: 'Completed', label: 'Completed' },
        { value: 'Joined', label: 'Joined' }
    ];

    ngOnInit(): void {
        const user = this.authService.getCurrentUser();
        if (user && user.userId) {
            this.userId = user.userId;

            // Check if there's a pre-set status filter (e.g. from dashboard stat card)
            const statusFilter = sessionStorage.getItem('eventStatusFilter');
            if (statusFilter) {
                this.selectedStatusFilter = statusFilter;
                sessionStorage.removeItem('eventStatusFilter');
            }

            const queryEventId = this.route?.snapshot.queryParamMap.get('eventId');
            if (queryEventId) {
                this.pendingOpenEventId = parseInt(queryEventId, 10);
            }
            
            this.loadEvents();
            this.startPolling();
        } else {
            this.errorMessage = 'Unable to load user information';
        }
    }

    ngOnDestroy(): void {
        this.stopPolling();
    }

    private startPolling(): void {
        this.pollSubscription = interval(this.POLL_INTERVAL_MS)
            .pipe(
                switchMap(() => forkJoin({
                    events: this.eventService.getAllEvents(),
                    rsvps: this.eventService.getOwnRsvps(this.userId)
                }))
            )
            .subscribe({
                next: (result) => {
                    this.events = result.events;
                    this.joinedEventIds = new Set(result.rsvps.map(r => r.eventId));
                    this.joinApprovalStatus = new Map(
                        result.rsvps.map(r => [r.eventId, (r.approvalStatus || 'pending') as 'pending' | 'approved' | 'rejected'])
                    );
                    this.applyFilters();
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

    loadEvents(): void {
        this.isLoading = true;
        forkJoin({
            events: this.eventService.getAllEvents(),
            rsvps: this.eventService.getOwnRsvps(this.userId)
        }).subscribe({
            next: (result) => {
                this.events = result.events;
                this.joinedEventIds = new Set(result.rsvps.map(r => r.eventId));
                this.joinApprovalStatus = new Map(
                    result.rsvps.map(r => [r.eventId, (r.approvalStatus || 'pending') as 'pending' | 'approved' | 'rejected'])
                );
                this.applyFilters();
                this.isLoading = false;

                this.tryOpenEventFromNotification();
            },
            error: (error) => {
                console.error('Error loading events:', error);
                this.errorMessage = 'Failed to load events';
                this.isLoading = false;
            }
        });
    }

    applyFilters(): void {
        let filtered = [...this.events];

        // Apply status filter
        if (this.selectedStatusFilter === 'Joined') {
            filtered = filtered.filter(e => this.joinedEventIds.has(e.eventId));
        } else if (this.selectedStatusFilter !== 'ALL') {
            filtered = filtered.filter(e => e.status === this.selectedStatusFilter);
        }

        // Apply search query
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(e =>
                e.title.toLowerCase().includes(query) ||
                e.description?.toLowerCase().includes(query) ||
                e.location?.toLowerCase().includes(query)
            );
        }

        this.filteredEvents = filtered;
        this.eventsCurrentPage = 1;
    }

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

    get showEventsPagination(): boolean {
        return this.filteredEvents.length > this.eventsItemsPerPage;
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

    onSearchChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.searchQuery = input.value;
        this.applyFilters();
    }

    onStatusFilterChange(status: string): void {
        this.selectedStatusFilter = status;
        this.applyFilters();
    }

    clearFilters(): void {
        this.searchQuery = '';
        this.selectedStatusFilter = 'ALL';
        this.applyFilters();
    }

    showSuccessToast(message: string): void {
        this.successMessage = message;
        setTimeout(() => {
            this.successMessage = '';
        }, 3000);
    }

    isJoined(eventId: number): boolean {
        return this.joinedEventIds.has(eventId);
    }

    getJoinApprovalStatus(eventId: number): 'pending' | 'approved' | 'rejected' | null {
        return this.joinedEventIds.has(eventId)
            ? (this.joinApprovalStatus.get(eventId) || 'pending')
            : null;
    }

    isEventOngoing(event: EventResponse): boolean {
        return event.status === 'Ongoing';
    }

    isEventCompleted(event: EventResponse): boolean {
        return event.status === 'Completed';
    }

    canJoin(event: EventResponse): boolean {
        return !this.isEventOngoing(event) && !this.isEventCompleted(event) && !this.isJoined(event.eventId);
    }

    isWithin24Hours(event: EventResponse): boolean {
        const eventDate = new Date(event.eventDate);
        const now = new Date();
        const msUntilEvent = eventDate.getTime() - now.getTime();
        const hoursUntilEvent = msUntilEvent / (1000 * 60 * 60);
        return hoursUntilEvent <= 24;
    }

    canCancelJoin(event: EventResponse): boolean {
        if (!this.isJoined(event.eventId)) return false;
        if (this.isEventOngoing(event) || this.isEventCompleted(event)) return false;
        if (this.getJoinApprovalStatus(event.eventId) === 'rejected') return false;
        if (this.isWithin24Hours(event)) return false;
        return true;
    }

    canShowCancelJoinButton(event: EventResponse): boolean {
        if (!this.isJoined(event.eventId)) return false;
        if (this.getJoinApprovalStatus(event.eventId) === 'rejected') return false;
        if (this.isEventCompleted(event)) return false;
        if (this.isEventOngoing(event)) return false;
        return true;
    }

    getCancelJoinTooltip(event: EventResponse): string {
        if (this.isWithin24Hours(event)) {
            return 'Cancellation unavailable — the event starts within 24 hours';
        }
        return '';
    }

    joinEvent(event: EventResponse): void {
        if (this.isJoined(event.eventId) || this.isEventOngoing(event) || this.isEventCompleted(event)) {
            return;
        }

        if (this.showEventInfoModal && this.infoEvent?.eventId === event.eventId) {
            this.reopenEventInfoModalAfterJoinConfirm = true;
            this.showEventInfoModal = false;
        } else {
            this.reopenEventInfoModalAfterJoinConfirm = false;
        }

        this.pendingJoinEvent = event;
        this.showJoinConfirmModal = true;
    }

    closeJoinConfirmModal(): void {
        this.showJoinConfirmModal = false;

        if (this.reopenEventInfoModalAfterJoinConfirm && this.pendingJoinEvent) {
            this.infoEvent = this.pendingJoinEvent;
            this.showEventInfoModal = true;
        }

        this.pendingJoinEvent = null;
        this.reopenEventInfoModalAfterJoinConfirm = false;
    }

    confirmJoinEvent(): void {
        if (!this.pendingJoinEvent) return;
        const event = this.pendingJoinEvent;
        this.showJoinConfirmModal = false;
        this.pendingJoinEvent = null;
        this.reopenEventInfoModalAfterJoinConfirm = false;
        this.reopenEventInfoModalAfterJoinSuccess = this.showEventInfoModal ? false : !!this.infoEvent && this.infoEvent.eventId === event.eventId;

        this.isLoading = true;
        this.eventService.rsvpEvent({ eventId: event.eventId, userId: this.userId }).subscribe({
            next: () => {
                this.joinedEventIds.add(event.eventId);
                this.joinApprovalStatus.set(event.eventId, 'pending');
                this.selectedEvent = event;
                this.showJoinModal = true;
                this.showSuccessToast('Successfully joined the event!');
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error joining event:', error);
                this.errorMessage = 'Failed to join event';
                this.isLoading = false;
                this.reopenEventInfoModalAfterJoinSuccess = false;
            }
        });
    }

    cancelJoin(event: EventResponse): void {
        if (!this.canCancelJoin(event)) {
            return;
        }
        this.pendingCancelEvent = event;
        this.showCancelConfirmModal = true;
    }

    closeCancelConfirmModal(): void {
        this.showCancelConfirmModal = false;
        this.pendingCancelEvent = null;
    }

    confirmCancelJoin(): void {
        if (!this.pendingCancelEvent) return;
        const event = this.pendingCancelEvent;
        this.showCancelConfirmModal = false;
        this.pendingCancelEvent = null;

        this.isLoading = true;
        this.eventService.cancelRsvp(event.eventId, this.userId).subscribe({
            next: () => {
                this.joinedEventIds.delete(event.eventId);
                this.joinApprovalStatus.delete(event.eventId);
                this.showSuccessToast('Your event join has been cancelled successfully.');
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error leaving event:', error);
                this.errorMessage = 'Failed to leave event';
                this.isLoading = false;
            }
        });
    }

    closeJoinModal(): void {
        this.showJoinModal = false;

        if (this.reopenEventInfoModalAfterJoinSuccess && this.selectedEvent) {
            this.infoEvent = this.selectedEvent;
            this.showEventInfoModal = true;
        }

        this.selectedEvent = null;
        this.reopenEventInfoModalAfterJoinSuccess = false;
    }

    getEventColor(index: number): 'red' | 'blue' | 'yellow' {
        const colors: ('red' | 'blue' | 'yellow')[] = ['red', 'blue', 'yellow'];
        return colors[index % 3];
    }

    formatEventDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getStatusBadgeClass(status: string): string {
        const statusMap: { [key: string]: string } = {
            'Upcoming': 'status-upcoming',
            'Open for Registration': 'status-open',
            'Registration Closed': 'status-closed',
            'Ongoing': 'status-ongoing',
            'Completed': 'status-completed',
            'Cancelled': 'status-cancelled'
        };
        return statusMap[status] || 'status-default';
    }

    trackByEventId(index: number, event: EventResponse): number {
        return event.eventId;
    }

    scrollToEvent(eventId: number): void {
        const eventElement = document.getElementById(`event-${eventId}`);
        if (eventElement) {
            eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a highlight animation
            eventElement.classList.add('highlight-event');
            setTimeout(() => {
                eventElement.classList.remove('highlight-event');
                this.highlightedEventId = null;
            }, 3000);
        }
    }

    isHighlighted(eventId: number): boolean {
        return this.highlightedEventId === eventId;
    }

    openEventInfoModal(event: EventResponse): void {
        this.infoEvent = event;
        this.showEventInfoModal = true;
    }

    closeEventInfoModal(): void {
        this.showEventInfoModal = false;
        this.infoEvent = null;
    }

    private tryOpenEventFromNotification(): void {
        if (!this.pendingOpenEventId) {
            return;
        }

        const eventId = this.pendingOpenEventId;
        const event = this.events.find(item => item.eventId === eventId) || null;

        if (!event) {
            this.pendingOpenEventId = null;
            return;
        }

        this.ensureEventVisible(eventId);
        this.openEventInfoModal(event);
        this.highlightedEventId = eventId;
        setTimeout(() => this.scrollToEvent(eventId), 300);
        this.pendingOpenEventId = null;
    }

    private ensureEventVisible(eventId: number): void {
        const visible = this.filteredEvents.some(item => item.eventId === eventId);
        if (!visible) {
            this.searchQuery = '';
            this.selectedStatusFilter = 'ALL';
            this.applyFilters();
        }

        const index = this.filteredEvents.findIndex(item => item.eventId === eventId);
        if (index >= 0) {
            this.eventsCurrentPage = Math.floor(index / this.eventsItemsPerPage) + 1;
        }
    }
}
