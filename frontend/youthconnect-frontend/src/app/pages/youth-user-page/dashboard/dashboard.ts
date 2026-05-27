import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { YouthDashboardService, DashboardStats } from '../../../services/youth-dashboard.service';
import { EventResponse } from '../../../services/event.service';
import { NotificationResponse, NotificationService } from '../../../services/notification.service';
import { YouthMemberManagementService, YouthProfileAccount } from '../../../services/youth-member-management.service';
import { Subject, interval, takeUntil, switchMap } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private dashboardService = inject(YouthDashboardService);
  private notificationService = inject(NotificationService);
  private youthMemberService = inject(YouthMemberManagementService);

  private destroy$ = new Subject<void>();
  private readonly refreshIntervalMs = 30000;
  private clockInterval: any;

  userName = 'John Doe';
  userEmail = 'johndoe@gmail.com';
  todayLabel = '';
  currentTime = '';
  youthId: number = 0;
  userId: number = 0;
  isLoading = false;
  errorMessage = '';

  // Profile modal
  showProfileModal = false;
  userProfile: YouthProfileAccount | null = null;
  isLoadingProfile = false;

  stats = [
    { label: 'Upcoming events', value: 0, color: 'blue' },
    { label: 'Events Joined', value: 0, color: 'red' },
    { label: 'My Concerns', value: 0, color: 'yellow' },
    { label: 'Open Concerns', value: 0, color: 'gray' }
  ];

  upcomingEvents: EventResponse[] = [];
  notifications: NotificationResponse[] = [];
  notificationFilter: 'all' | 'unread' = 'all';

  // Incremental loading state
  visibleEventsCount = 10;
  visibleNotificationsCount = 10;
  displayedEvents: EventResponse[] = [];
  displayedNotifications: NotificationResponse[] = [];

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

      this.updateClock();
      this.clockInterval = setInterval(() => this.updateClock(), 1000);
      this.loadDashboardData();
      this.setupAutoRefresh();
    }
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateClock(): void {
    const now = new Date();
    this.todayLabel = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    this.currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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
        this.stats[3].value = data.stats.openConcerns;

        // Update events and notifications
        this.upcomingEvents = data.upcomingEvents;
        this.notifications = data.notifications;
        this.visibleEventsCount = 10;
        this.visibleNotificationsCount = 10;
        this.updateDisplayedEvents();
        this.updateDisplayedNotifications();

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.errorMessage = 'Failed to load dashboard data';
        this.isLoading = false;
      }
    });
  }

  private setupAutoRefresh(): void {
    interval(this.refreshIntervalMs)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.dashboardService.getDashboardData(this.youthId, this.userId))
      )
      .subscribe({
        next: (data) => {
          this.stats[0].value = data.stats.myConcerns;
          this.stats[1].value = data.stats.upcomingEvents;
          this.stats[2].value = data.stats.eventsJoined;
          this.stats[3].value = data.stats.openConcerns;

          this.upcomingEvents = data.upcomingEvents;
          this.notifications = data.notifications;
          this.updateDisplayedEvents();
          this.updateDisplayedNotifications();
          this.notificationService.refreshUnreadCount();
        },
        error: (error) => {
          console.error('Error refreshing dashboard data:', error);
        }
      });
  }

  get filteredNotifications(): NotificationResponse[] {
    if (this.notificationFilter === 'unread') {
      return this.notifications.filter(n => !n.isRead);
    }
    return this.notifications;
  }

  updateDisplayedEvents(): void {
    this.displayedEvents = this.upcomingEvents.slice(0, this.visibleEventsCount);
  }

  updateDisplayedNotifications(): void {
    const source = this.filteredNotifications;
    this.displayedNotifications = source.slice(0, this.visibleNotificationsCount);
  }

  private navigateForNotification(notification: NotificationResponse): void {
    if (notification.type === 'CONCERN_UPDATE' && notification.relatedConcernId) {
      this.router.navigate(['/youth/concern', notification.relatedConcernId]);
      return;
    }

    if (notification.relatedEventId) {
      sessionStorage.setItem('highlightEventId', notification.relatedEventId.toString());
      this.router.navigate(['/youth/events']);
    }
  }

  showMoreEvents(): void {
    this.visibleEventsCount = Math.min(this.visibleEventsCount + 10, this.upcomingEvents.length);
    this.updateDisplayedEvents();
  }

  showMoreNotifications(): void {
    const source = this.filteredNotifications;
    this.visibleNotificationsCount = Math.min(this.visibleNotificationsCount + 10, source.length);
    this.updateDisplayedNotifications();
  }

  onNotificationClick(notification: NotificationResponse): void {
    if (!notification.isRead && notification.notificationId) {
      this.notificationService.markNotificationAsRead(notification.notificationId).subscribe({
        next: () => {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
          this.updateDisplayedNotifications();
          this.notificationService.refreshUnreadCount();
          this.navigateForNotification(notification);
        },
        error: () => {
          this.navigateForNotification(notification);
        }
      });
      return;
    }

    this.navigateForNotification(notification);
  }

  trackByEventId(index: number, event: EventResponse): any {
    return event.eventId ?? index;
  }

  trackByNotificationId(index: number, notification: NotificationResponse): any {
    return notification.notificationId ?? index;
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

  navigateToEventsWithFilter(filter: string): void {
    sessionStorage.setItem('eventStatusFilter', filter);
    this.router.navigate(['/youth/events']);
  }

  navigateToResolvedConcerns(): void {
    sessionStorage.setItem('concernStatusFilter', 'OPEN');
    this.router.navigate(['/youth/create-concern']);
  }

  navigateToConcerns(): void {
    this.router.navigate(['/youth/create-concern']);
  }

  navigateToNotifications(): void {
    this.router.navigate(['/youth/notifications']);
  }

  viewEvent(event: EventResponse) {
    this.router.navigate(['/youth/events']);
  }

  setNotificationFilter(filter: 'all' | 'unread') {
    this.notificationFilter = filter;
    this.visibleNotificationsCount = 10;
    this.updateDisplayedNotifications();
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
    const colors = ['red', 'blue', 'yellow', 'gray', 'green'];
    return colors[index % colors.length];
  }

  openProfileModal(): void {
    this.showProfileModal = true;
    if (!this.userProfile) {
      this.loadUserProfile();
    }
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
  }

  loadUserProfile(): void {
    if (!this.youthId) return;
    this.isLoadingProfile = true;
    this.youthMemberService.getYouthProfileById(this.youthId).subscribe({
      next: (profile) => {
        this.userProfile = profile;
        this.isLoadingProfile = false;
      },
      error: () => {
        this.isLoadingProfile = false;
      }
    });
  }

  getAge(birthday: string): number {
    if (!birthday) return 0;
    const today = new Date();
    const birth = new Date(birthday);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  formatBirthday(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatProfileDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getGenderLabel(gender: string): string {
    const map: { [k: string]: string } = { 'MALE': 'Male', 'FEMALE': 'Female' };
    return map[gender] || gender || 'N/A';
  }

  getCivilStatusLabel(status: string): string {
    const map: { [k: string]: string } = {
      'SINGLE': 'Single', 'MARRIED': 'Married', 'WIDOWED': 'Widowed',
      'DIVORCED': 'Divorced', 'ANNULLED': 'Annulled', 'LIVE_IN': 'Live In', 'UNKNOWN': 'Unknown'
    };
    return map[status] || status || 'N/A';
  }

  getYouthClassificationLabel(val?: string): string {
    if (!val) return 'N/A';
    const map: { [k: string]: string } = {
      'IN_SCHOOL_YOUTH': 'In School Youth',
      'OUT_OF_SCHOOL_YOUTH': 'Out of School Youth',
      'WORKING_YOUTH': 'Working Youth',
      'PERSON_WITH_DISABILITY': 'Person with Disability',
      'CHILDREN_IN_CONFLICT': 'Children in Conflict',
      'CHILDREN_IN_CONFLICT_LAW': 'Children in Conflict with Law',
      'INDIGENOUS_PEOPLE': 'Indigenous People'
    };
    return map[val] || val;
  }

  getEducationLabel(val?: string): string {
    if (!val) return 'N/A';
    const map: { [k: string]: string } = {
      'ELEMENTARY_LEVEL': 'Elementary Level',
      'ELEMENTARY_GRADUATE': 'Elementary Graduate',
      'HIGH_SCHOOL_LEVEL': 'High School Level',
      'HIGH_SCHOOL_GRADUATE': 'High School Graduate',
      'VOCATIONAL_GRAD': 'Vocational Graduate',
      'COLLEGE_LEVEL': 'College Level',
      'COLLEGE_GRADUATE': 'College Graduate',
      'MASTERS_LEVEL': "Master's Level",
      'MASTERS_GRADUATE': "Master's Graduate",
      'DOCTOR_LEVEL': 'Doctoral Level',
      'DOCTOR_GRADUATE': 'Doctoral Graduate'
    };
    return map[val] || val;
  }

  getWorkStatusLabel(val?: string): string {
    if (!val) return 'N/A';
    const map: { [k: string]: string } = {
      'EMPLOYED': 'Employed',
      'UNEMPLOYED': 'Unemployed',
      'SELF_EMPLOYED': 'Self Employed',
      'CURRENTLY_LOOKING': 'Currently Looking',
      'NOT_INTERESTED': 'Not Interested'
    };
    return map[val] || val;
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
