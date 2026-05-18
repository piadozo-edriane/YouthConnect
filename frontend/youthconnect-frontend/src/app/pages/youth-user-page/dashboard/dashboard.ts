import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { YouthDashboardService, DashboardStats } from '../../../services/youth-dashboard.service';
import { EventResponse } from '../../../services/event.service';
import { NotificationResponse } from '../../../services/notification.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private dashboardService = inject(YouthDashboardService);

  userName = 'John Doe';
  userEmail = 'johndoe@gmail.com';
  youthId: number = 0;
  userId: number = 0;
  isLoading = false;
  errorMessage = '';

  stats = [
    { label: 'Upcoming events', value: 0, color: 'blue' },
    { label: 'Events Joined', value: 0, color: 'red' },
    { label: 'My Concern', value: 0, color: 'yellow' },
    { label: 'Resolved Concern', value: 0, color: 'gray' }
  ];

  upcomingEvents: EventResponse[] = [];
  notifications: NotificationResponse[] = [];
  notificationFilter: 'all' | 'unread' = 'all';

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.email) {
      this.userEmail = user.email;
      this.youthId = user.youthId || 0;
      this.userId = user.userId || 0;

      // Extract name from email (before @) as a fallback
      const emailName = user.email.split('@')[0];
      // Convert email name to readable format (e.g., john.doe -> John Doe)
      this.userName = emailName
        .split(/[._-]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

      this.loadDashboardData();
    }
  }

  loadDashboardData(): void {
    if (!this.youthId || !this.userId) {
      this.errorMessage = 'Unable to load user information';
      return;
    }

    this.isLoading = true;
    this.dashboardService.getDashboardData(this.youthId, this.userId).subscribe({
      next: (data) => {
        // Update stats
        this.stats[0].value = data.stats.myConcerns;
        this.stats[1].value = data.stats.upcomingEvents;
        this.stats[2].value = data.stats.eventsJoined;
        this.stats[3].value = data.stats.resolvedConcerns;

        // Update events and notifications
        this.upcomingEvents = data.upcomingEvents;
        this.notifications = data.notifications;

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.errorMessage = 'Failed to load dashboard data';
        this.isLoading = false;
      }
    });
  }

  get filteredNotifications(): NotificationResponse[] {
    if (this.notificationFilter === 'unread') {
      return this.notifications.filter(n => !n.isRead);
    }
    return this.notifications;
  }

  isNotificationRead(notification: NotificationResponse): boolean {
    return Boolean(notification.isRead);
  }

  createConcern() {
    this.router.navigate(['/youth/create-concern']);
  }

  browseEvents() {
    this.router.navigate(['/youth/events']);
  }

  viewEvent(event: EventResponse) {
    this.router.navigate(['/youth/events']);
  }

  setNotificationFilter(filter: 'all' | 'unread') {
    this.notificationFilter = filter;
  }

  formatEventDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getStatClass(index: number): string {
    const classes = ['red-border', 'red-border', 'red-border', 'red-border'];
    return classes[index] || 'red-border';
  }

  getItemColor(index: number): string {
    const colors = ['red', 'red', 'red', 'red'];
    return colors[index % colors.length];
  }

  getInitials(): string {
    if (!this.userName) return 'YM';
    const names = this.userName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return this.userName.substring(0, 2).toUpperCase();
  }
}
