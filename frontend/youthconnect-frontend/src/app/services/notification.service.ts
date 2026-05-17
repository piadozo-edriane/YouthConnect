import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subscription, interval, map } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { AuthService } from './auth.service';

export interface NotificationResponse {
    // New notification fields
    notificationId?: number;
    userId?: number;
    youthId?: number;
    title?: string;
    message?: string;
    type?: string; // NEW_EVENT, EVENT_STATUS, CONCERN_UPDATE
    relatedEventId?: number;
    relatedConcernId?: number;
    isRead?: boolean;
    createdAt: string;
    readAt?: string;

    // Legacy concern fields (backward compatibility)
    updateId?: number;
    concernId?: number;
    concernTitle?: string;
    updateText?: string;
    updatedByAdminName?: string;

    // Derived fields
    notificationType?: 'concern' | 'event';
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private apiUrl = `${environment.apiUrl}/api/notifications`;
    private unreadCountSubject = new BehaviorSubject<number>(0);
    public unreadCount$ = this.unreadCountSubject.asObservable();
    private unreadCountPollSubscription?: Subscription;
    private readonly unreadCountPollIntervalMs = 30000;
    private authService = inject(AuthService);

    constructor(private http: HttpClient) { }

    private normalizeNotification(notification: NotificationResponse): NotificationResponse {
        const legacyRead = (notification as NotificationResponse & { read?: boolean }).read;
        if (notification.isRead === undefined && legacyRead !== undefined) {
            return { ...notification, isRead: legacyRead };
        }

        return notification;
    }

    private normalizeNotifications(list: NotificationResponse[]): NotificationResponse[] {
        return list.map(notification => this.normalizeNotification(notification));
    }

    /**
     * Get all notifications for a youth user (legacy endpoint)
     */
    getNotificationsByYouthId(youthId: number): Observable<NotificationResponse[]> {
        return this.http
            .get<NotificationResponse[]>(`${this.apiUrl}/youth/${youthId}`)
            .pipe(map(list => this.normalizeNotifications(list)));
    }

    /**
     * Get all notifications for a user (new endpoint)
     */
    getNotificationsByUserId(userId: number): Observable<NotificationResponse[]> {
        return this.http
            .get<NotificationResponse[]>(`${this.apiUrl}/user/${userId}`)
            .pipe(map(list => this.normalizeNotifications(list)));
    }

    /**
     * Get unread notifications for a user
     */
    getUnreadNotifications(userId: number): Observable<NotificationResponse[]> {
        return this.http
            .get<NotificationResponse[]>(`${this.apiUrl}/user/${userId}/unread`)
            .pipe(map(list => this.normalizeNotifications(list)));
    }

    /**
     * Get unread notification count for a user
     */
    getUnreadNotificationCount(userId: number): Observable<{ unreadCount: number }> {
        return this.http.get<{ unreadCount: number }>(`${this.apiUrl}/user/${userId}/unread-count`);
    }

    /**
     * Get unread notification count for the currently logged-in user
     */
    getUnreadNotificationCountForCurrentUser(): Observable<{ unreadCount: number }> {
        return this.http.get<{ unreadCount: number }>(`${this.apiUrl}/unread-count`);
    }

    /**
     * Mark a notification as read
     */
    markNotificationAsRead(notificationId: number): Observable<any> {
        return this.http.put(`${this.apiUrl}/${notificationId}/read`, {});
    }

    /**
     * Mark all notifications as read for a user
     */
    markAllAsRead(userId: number): Observable<any> {
        return this.http.put(`${this.apiUrl}/user/${userId}/mark-all-read`, {});
    }

    /**
     * Legacy endpoints - kept for backward compatibility
     */
    getEventNotifications(): Observable<NotificationResponse[]> {
        return this.http.get<NotificationResponse[]>(`${this.apiUrl}/events`);
    }

    getAllNotifications(youthId: number): Observable<NotificationResponse[]> {
        return this.http.get<NotificationResponse[]>(`${this.apiUrl}/all/${youthId}`);
    }

    updateUnreadCount(count: number): void {
        this.unreadCountSubject.next(count);
    }

    getUnreadCount(): number {
        return this.unreadCountSubject.value;
    }

    /**
     * Refresh unread count from backend and update global state
     */
    refreshUnreadCount(): void {
        const user = this.authService.getCurrentUser();
        if (user?.userId) {
            this.getUnreadNotificationCount(user.userId).subscribe({
                next: (result) => this.updateUnreadCount(result.unreadCount),
                error: (error) => {
                    console.error('Error refreshing unread notification count:', error);
                }
            });
            return;
        }

        this.getUnreadNotificationCountForCurrentUser().subscribe({
            next: (result) => this.updateUnreadCount(result.unreadCount),
            error: (error) => {
                console.error('Error refreshing unread notification count:', error);
                this.updateUnreadCount(0);
            }
        });
    }

    /**
     * Start polling unread count globally
     */
    startUnreadCountPolling(): void {
        if (this.unreadCountPollSubscription) {
            return;
        }

        this.refreshUnreadCount();
        this.unreadCountPollSubscription = interval(this.unreadCountPollIntervalMs)
            .subscribe(() => this.refreshUnreadCount());
    }

    /**
     * Stop polling unread count globally
     */
    stopUnreadCountPolling(): void {
        this.unreadCountPollSubscription?.unsubscribe();
        this.unreadCountPollSubscription = undefined;
    }
}

