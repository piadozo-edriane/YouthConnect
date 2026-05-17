import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, NotificationResponse } from '../../../services/notification.service';
import { EventService, EventResponse } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-notification',
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrl: './notification.scss',
})
export class NotificationPage implements OnInit {
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private eventService = inject(EventService);
  private router = inject(Router);

  activeFilter: 'all' | 'unread' = 'all';
  notifications: NotificationResponse[] = [];
  isLoading = false;
  errorMessage = '';
  youthId: number = 0;
  userId: number = 0;
  readNotifications: Set<number> = new Set();

  // Search & pagination
  searchQuery = '';
  currentPage = 1;
  itemsPerPage = 10;

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.youthId && user.userId) {
      this.youthId = user.youthId;
      this.userId = user.userId;
      this.loadReadNotificationsFromStorage();
      this.loadNotifications();
    } else {
      this.errorMessage = 'Unable to load user information';
    }
  }

  private loadEventStatusCache(): Record<number, string> {
    const storageKey = `eventStatus_${this.youthId}`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return {};
    }

    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading event status cache:', error);
      return {};
    }
  }

  private loadEventNotificationsFromStorage(): NotificationResponse[] {
    const storageKey = `eventNotifications_${this.youthId}`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return [];
    }

    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading event notifications from storage:', error);
      return [];
    }
  }

  private saveEventNotificationsToStorage(notifs: NotificationResponse[]): void {
    const storageKey = `eventNotifications_${this.youthId}`;
    localStorage.setItem(storageKey, JSON.stringify(notifs));
  }

  private loadNewEventCache(): Record<number, boolean> {
    const storageKey = `newEventNotified_${this.youthId}`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return {};
    }

    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading new event cache:', error);
      return {};
    }
  }

  private saveNewEventCache(cache: Record<number, boolean>): void {
    const storageKey = `newEventNotified_${this.youthId}`;
    localStorage.setItem(storageKey, JSON.stringify(cache));
  }

  private saveEventStatusCache(cache: Record<number, string>): void {
    const storageKey = `eventStatus_${this.youthId}`;
    localStorage.setItem(storageKey, JSON.stringify(cache));
  }

  private hashStringToInt(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  loadReadNotificationsFromStorage(): void {
    const storageKey = `readNotifications_${this.youthId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const readIds = JSON.parse(stored);
        this.readNotifications = new Set(readIds);
      } catch (error) {
        console.error('Error loading read notifications from storage:', error);
      }
    }
  }

  saveReadNotificationsToStorage(): void {
    const storageKey = `readNotifications_${this.youthId}`;
    const readIds = Array.from(this.readNotifications);
    localStorage.setItem(storageKey, JSON.stringify(readIds));
  }

  loadNotifications(): void {
    this.isLoading = true;
    
    // Fetch both concern notifications and event notifications
    forkJoin({
      concernNotifications: this.notificationService.getNotificationsByYouthId(this.youthId),
      events: this.eventService.getAllEvents(),
      rsvps: this.eventService.getOwnRsvps(this.userId)
    }).subscribe({
      next: (result) => {
        // Combine concern notifications with event notifications
        const concernNotifs = result.concernNotifications;
        const rsvpedEventIds = new Set(result.rsvps.map(r => r.eventId));
        const rsvpedEvents = result.events.filter(event => rsvpedEventIds.has(event.eventId));

        const statusCache = this.loadEventStatusCache();
        const newEventCache = this.loadNewEventCache();
        const storedEventNotifs = this.loadEventNotificationsFromStorage();
        const storedIds = new Set(storedEventNotifs.map(n => n.updateId));
        const eventNotifs: NotificationResponse[] = [];

        result.events.forEach(event => {
          if (!newEventCache[event.eventId]) {
            const createdAt = event.createdAt;
            const hashSource = `${event.eventId}|new|${createdAt}`;
            const updateId = this.hashStringToInt(hashSource);
            eventNotifs.push({
              updateId,
              eventId: event.eventId,
              eventTitle: event.title,
              eventDate: event.eventDate,
              eventLocation: event.location,
              eventStatus: event.status,
              updateText: `New event: ${event.title}`,
              updatedByAdminName: 'SK Official',
              createdAt,
              notificationType: 'event' as const
            });
            newEventCache[event.eventId] = true;
          }
        });

        rsvpedEvents.forEach(event => {
          const previousStatus = statusCache[event.eventId];
          const currentStatus = event.status;
          const statusChanged = !previousStatus || previousStatus !== currentStatus;
          const createdAt = event.updatedAt ?? event.createdAt;

          if (statusChanged) {
            const hashSource = `${event.eventId}|${currentStatus}|${createdAt}`;
            const updateId = this.hashStringToInt(hashSource);
            eventNotifs.push({
              updateId,
              eventId: event.eventId,
              eventTitle: event.title,
              eventDate: event.eventDate,
              eventLocation: event.location,
              eventStatus: currentStatus,
              updateText: `Status changed to ${currentStatus}`,
              updatedByAdminName: 'SK Official',
              createdAt,
              notificationType: 'event' as const
            });
          }

          statusCache[event.eventId] = currentStatus;
        });

        const newUniqueNotifs = eventNotifs.filter(n => !storedIds.has(n.updateId));
        const mergedEventNotifs = [...storedEventNotifs, ...newUniqueNotifs];

        this.saveNewEventCache(newEventCache);
        this.saveEventStatusCache(statusCache);
        this.saveEventNotificationsToStorage(mergedEventNotifs);
        
        // Combine and sort by date (newest first)
        this.notifications = [...concernNotifs, ...mergedEventNotifs].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        this.isLoading = false;
        this.updateUnreadCount();
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.errorMessage = 'Failed to load notifications';
        this.isLoading = false;
      }
    });
  }

  updateUnreadCount(): void {
    const unreadCount = this.notifications.filter(n => !this.isRead(n)).length;
    this.notificationService.updateUnreadCount(unreadCount);
  }

  get filteredNotifications(): NotificationResponse[] {
    let list = this.notifications;
    if (this.activeFilter === 'unread') {
      list = list.filter(n => !this.isRead(n));
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(n =>
        this.getNotificationTitle(n).toLowerCase().includes(q) ||
        this.getNotificationSubtitle(n).toLowerCase().includes(q) ||
        (n.updateText ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  get paginatedNotifications(): NotificationResponse[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredNotifications.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredNotifications.length / this.itemsPerPage));
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !this.isRead(n)).length;
  }

  onSearchChange(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
  }

  setFilter(filter: 'all' | 'unread') {
    this.activeFilter = filter;
    this.currentPage = 1;
  }

  previousPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }

  getPageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  isRead(notification: NotificationResponse): boolean {
    return this.readNotifications.has(notification.updateId);
  }

  markAsRead(notification: NotificationResponse) {
    if (!this.isRead(notification)) {
      this.readNotifications.add(notification.updateId);
      this.saveReadNotificationsToStorage();
      this.updateUnreadCount();
    }
    
    // Navigate to event page if it's an event notification
    if (notification.notificationType === 'event' && notification.eventId) {
      // Store the event ID in session storage so the event page can highlight it
      sessionStorage.setItem('highlightEventId', notification.eventId.toString());
      this.router.navigate(['/youth/events']);
    }
  }

  getNotificationIcon(notification: NotificationResponse): string {
    if (notification.notificationType === 'event') {
      return 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z';
    }
    return 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z';
  }

  getNotificationTitle(notification: NotificationResponse): string {
    if (notification.notificationType === 'event') {
      return `Event Update: ${notification.eventTitle}`;
    }
    return `${notification.updatedByAdminName || 'SK Official'} replied to your concern`;
  }

  getNotificationSubtitle(notification: NotificationResponse): string {
    if (notification.notificationType === 'event') {
      const eventDate = new Date(notification.eventDate!);
      const statusText = notification.eventStatus ?? 'Upcoming';
      return `Status: ${statusText} • ${eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${notification.eventLocation}`;
    }
    return `Re: ${notification.concernTitle}`;
  }

  getNotificationColor(notification: NotificationResponse): 'red' | 'blue' | 'yellow' {
    if (notification.notificationType === 'event') {
      return 'yellow';
    }
    const colors: ('red' | 'blue')[] = ['red', 'blue'];
    return colors[notification.updateId % 2];
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
