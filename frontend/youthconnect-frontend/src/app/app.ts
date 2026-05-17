import { Component, OnDestroy, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  title = signal('youthconnect-frontend');
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.authService.getCurrentUser$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user?.userId) {
          this.notificationService.startUnreadCountPolling();
        } else {
          this.notificationService.stopUnreadCountPolling();
          this.notificationService.updateUnreadCount(0);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}