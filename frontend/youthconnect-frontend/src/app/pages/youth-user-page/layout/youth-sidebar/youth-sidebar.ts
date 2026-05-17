import { Component, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { NotificationService } from '../../../../services/notification.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-youth-sidebar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, CommonModule],
    templateUrl: './youth-sidebar.html',
    styleUrl: './youth-sidebar.scss',
})
export class YouthSidebar implements OnInit {
    private authService = inject(AuthService);
    private notificationService = inject(NotificationService);

    userEmail: string = '';
    unreadNotificationCount: number = 0;
    isLoggingOut = false;
    isMobileMenuOpen = false;

    ngOnInit(): void {
        const user = this.authService.getCurrentUser();
        this.userEmail = user?.email || 'user@example.com';

        this.notificationService.refreshUnreadCount();

        this.notificationService.unreadCount$.subscribe(count => {
            this.unreadNotificationCount = count;
        });
    }

    toggleMobileMenu(): void {
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
        if (this.isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    closeMobileMenu(): void {
        this.isMobileMenuOpen = false;
        document.body.style.overflow = '';
    }

    logout(): void {
        this.isLoggingOut = true;
        setTimeout(() => {
            this.authService.logout();
        }, 1000);
    }
}
