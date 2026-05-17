import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, NotificationResponse } from '../../../services/notification.service';
import { EventService, EventResponse } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-notification',
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrl: './notification.scss',
})
export class NotificationPage implements OnInit, OnDestroy {
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

  // Search & pagination
  searchQuery = '';
  currentPage = 1;
  itemsPerPage = 10;

  // Auto-refresh
  private destroy$ = new Subject<void>();
  private refreshInterval = 30000; // Refresh every 30 seconds

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.youthId && user.userId) {
      this.youthId = user.youthId;
      this.userId = user.userId;
      this.removeLegacyNotificationStorage();
      this.loadNotifications();

      // Set up auto-refresh
      this.setupAutoRefresh();
    } else {
      this.errorMessage = 'Unable to load user information';
    }
  }

  /**
   * Remove legacy localStorage keys used by the old notification system.
   */
  private removeLegacyNotificationStorage(): void {
    if (!this.youthId) {
      return;
    }

    const legacyKeys = [
      `eventNotifications_${this.youthId}`,
      `newEventNotified_${this.youthId}`,
      `eventStatus_${this.youthId}`,
      `readNotifications_${this.youthId}`
    ];

    legacyKeys.forEach(key => localStorage.removeItem(key));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Set up auto-refresh of notifications
   */
  private setupAutoRefresh(): void {
    interval(this.refreshInterval)
      .pipe(
        switchMap(() => this.notificationService.getNotificationsByUserId(this.userId)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (notifications) => {
          this.notifications = notifications.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.updateUnreadCount();
        },
        error: (error) => {
          console.error('Error during auto-refresh:', error);
        }
      });
  }

  /**
   * Load all notifications from backend
   */
  loadNotifications(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.notificationService.getNotificationsByUserId(this.userId).subscribe({
      next: (notifications) => {
        this.notifications = notifications.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.isLoading = false;
        this.updateUnreadCount();
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.errorMessage = 'Failed to load notifications. Please try again.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Refresh unread count from backend
   */
  updateUnreadCount(): void {
    this.notificationService.refreshUnreadCount();
  }

  get filteredNotifications(): NotificationResponse[] {
    let list = this.notifications;

    // Filter by read/unread status
    if (this.activeFilter === 'unread') {
      list = list.filter(n => !n.isRead);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(n =>
        (n.title ?? '').toLowerCase().includes(q) ||
        (n.message ?? '').toLowerCase().includes(q) ||
        (n.type ?? '').toLowerCase().includes(q)
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
    return this.notifications.filter(n => !n.isRead).length;
  }

  onSearchChange(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
  }

  setFilter(filter: 'all' | 'unread'): void {
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

  /**
   * Mark a single notification as read
   */
  markAsRead(notification: NotificationResponse): void {
    // Always navigate for concern or event notifications. If unread, mark as read first.
    const navigateForNotification = () => {
      if (notification.type === 'NEW_EVENT' && notification.relatedEventId) {
        sessionStorage.setItem('highlightEventId', notification.relatedEventId.toString());
        this.router.navigate(['/youth/events']);
      } else if (notification.type === 'CONCERN_UPDATE' && notification.relatedConcernId) {
        this.router.navigate(['/youth/concerns', notification.relatedConcernId]);
      }
    };

    if (!notification.isRead && notification.notificationId) {
      this.notificationService.markNotificationAsRead(notification.notificationId).subscribe({
        next: () => {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
          this.updateUnreadCount();
          navigateForNotification();
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
          // Still navigate even if marking failed
          navigateForNotification();
        }
      });
    } else {
      navigateForNotification();
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notificationService.markAllAsRead(this.userId).subscribe({
      next: () => {
        this.notifications.forEach(n => {
          n.isRead = true;
          n.readAt = new Date().toISOString();
        });
        this.updateUnreadCount();
      },
      error: (error) => {
        console.error('Error marking all as read:', error);
      }
    });
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(notification: NotificationResponse): string {
    switch (notification.type) {
      case 'NEW_EVENT':
        return 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z';
      case 'EVENT_STATUS':
        return 'M13 10V3L4 14h7v7l9-11h-7z';
      case 'CONCERN_UPDATE':
        return 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z';
      default:
        return 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';
    }
  }

  /**
   * Get notification title
   */
  getNotificationTitle(notification: NotificationResponse): string {
    return notification.title || 'Notification';
  }

  /**
   * Get notification subtitle/details
   */
  getNotificationSubtitle(notification: NotificationResponse): string {
    return notification.message || '';
  }

  /**
   * Get notification color for styling
   */
  getNotificationColor(notification: NotificationResponse): 'red' | 'blue' | 'yellow' {
    switch (notification.type) {
      case 'NEW_EVENT':
        return 'yellow';
      case 'EVENT_STATUS':
        return 'blue';
      case 'CONCERN_UPDATE':
        return 'red';
      default:
        return 'blue';
    }
  }

  /**
   * Format time ago string
   */
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

