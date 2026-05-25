import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService, EventResponse } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, interval, Subscription, switchMap } from 'rxjs';

@Component({
    selector: 'app-event',
    imports: [CommonModule],
    templateUrl: './event.html',
    styleUrl: './event.scss',
})
export class EventPage implements OnInit, OnDestroy {
    private eventService = inject(EventService);
    private authService = inject(AuthService);

    showJoinModal = false;
    selectedEvent: EventResponse | null = null;
    userId: number = 0;
    isLoading = false;
    errorMessage = '';
    successMessage = '';

    events: EventResponse[] = [];
    filteredEvents: EventResponse[] = [];
    paginatedEvents: EventResponse[] = [];
    joinedEventIds: Set<number> = new Set();
    joinApprovalStatus: Map<number, 'pending' | 'approved' | 'rejected'> = new Map();
    searchQuery = '';
    selectedStatusFilter: string = 'ALL';
    highlightedEventId: number | null = null;

    // Pagination
    currentPage = 1;
    itemsPerPage = 5;
    totalPages = 1;

    private pollSubscription: Subscription | null = null;
    private readonly POLL_INTERVAL_MS = 10000; // poll every 10 seconds

    statusFilters = [
        { value: 'ALL', label: 'All Events' },
        { value: 'Upcoming', label: 'Upcoming' },
        { value: 'Open for Registration', label: 'Open' },
        { value: 'Registration Closed', label: 'Closed' },
        { value: 'Ongoing', label: 'Ongoing' },
        { value: 'Completed', label: 'Completed' }
    ];

    ngOnInit(): void {
        const user = this.authService.getCurrentUser();
        if (user && user.userId) {
            this.userId = user.userId;
            
            // Check if there's a highlighted event from notification
            const highlightedId = sessionStorage.getItem('highlightEventId');
            if (highlightedId) {
                this.highlightedEventId = parseInt(highlightedId);
                sessionStorage.removeItem('highlightEventId');
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
                
                // Scroll to highlighted event if exists
                if (this.highlightedEventId) {
                    setTimeout(() => this.scrollToEvent(this.highlightedEventId!), 500);
                }
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
        if (this.selectedStatusFilter !== 'ALL') {
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
        this.currentPage = 1;
        this.updatePagination();
    }

    updatePagination(): void {
        this.totalPages = Math.ceil(this.filteredEvents.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        this.paginatedEvents = this.filteredEvents.slice(startIndex, endIndex);
    }

    goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updatePagination();
        }
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagination();
        }
    }

    previousPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePagination();
        }
    }

    getPageNumbers(): number[] {
        const pages: number[] = [];
        const maxVisible = 5;

        if (this.totalPages <= maxVisible) {
            for (let i = 1; i <= this.totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (this.currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push(-1);
                pages.push(this.totalPages);
            } else if (this.currentPage >= this.totalPages - 2) {
                pages.push(1);
                pages.push(-1);
                for (let i = this.totalPages - 3; i <= this.totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push(-1);
                pages.push(this.currentPage - 1);
                pages.push(this.currentPage);
                pages.push(this.currentPage + 1);
                pages.push(-1);
                pages.push(this.totalPages);
            }
        }

        return pages;
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

        // Approved attendees cannot cancel within 24 hours of the event
        if (this.getJoinApprovalStatus(event.eventId) === 'approved' && this.isWithin24Hours(event)) {
            return false;
        }

        return true;
    }

    joinEvent(event: EventResponse): void {
        if (this.isJoined(event.eventId) || this.isEventOngoing(event) || this.isEventCompleted(event)) {
            return;
        }

        this.isLoading = true;
        this.eventService.rsvpEvent({ eventId: event.eventId, userId: this.userId }).subscribe({
            next: () => {
                this.joinedEventIds.add(event.eventId);
                this.joinApprovalStatus.set(event.eventId, 'pending');
                this.selectedEvent = event;
                this.showJoinModal = true;
                this.showSuccessToast('Successfully joined the event!');
                this.isLoading = false;

                setTimeout(() => {
                    this.closeJoinModal();
                }, 2500);
            },
            error: (error) => {
                console.error('Error joining event:', error);
                this.errorMessage = 'Failed to join event';
                this.isLoading = false;
            }
        });
    }

    cancelJoin(event: EventResponse): void {
        if (!this.canCancelJoin(event)) {
            return;
        }

        this.isLoading = true;
        this.eventService.cancelRsvp(event.eventId, this.userId).subscribe({
            next: () => {
                this.joinedEventIds.delete(event.eventId);
                this.joinApprovalStatus.delete(event.eventId);
                this.showSuccessToast('Successfully left the event.');
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
        this.selectedEvent = null;
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
}
