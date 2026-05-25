import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EventService, EventResponse } from '../../../services/event.service';
import { TaskTrackerService } from '../../../services/task-tracker.service';
import { ConcernService, ConcernResponse } from '../../../services/concern.service';
import { YouthMemberManagementService } from '../../../services/youth-member-management.service';
import { SkOfficialManagementService } from '../../../services/sk-official-management.service';
import { TaskResponse } from '../../../models/task.model';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private eventService = inject(EventService);
  private taskService = inject(TaskTrackerService);
  private concernService = inject(ConcernService);
  private youthService = inject(YouthMemberManagementService);
  private skOfficialService = inject(SkOfficialManagementService);
  private router = inject(Router);

  // SK Official Profile
  skOfficialName = '';
  skOfficialEmail = '';
  skOfficialPosition = '';
  skOfficialInitials = 'SK';

  // Counts
  youthMembersCount = 0;
  eventsCount = 0;
  concernsCount = 0;
  tasksCount = 0;

  // Data lists
  events: EventResponse[] = [];
  tasks: TaskResponse[] = [];
  concerns: ConcernResponse[] = [];

  // Incremental loading state
  visibleEventsCount = 10;
  visibleTasksCount = 10;
  displayedEvents: EventResponse[] = [];
  displayedTasks: TaskResponse[] = [];

  // Modal state
  isEventModalOpen = false;
  isTaskModalOpen = false;
  selectedEvent: EventResponse | null = null;
  selectedTask: TaskResponse | null = null;

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loadSkOfficialProfile();
    this.loadYouthMembers();
    this.loadEvents();
    this.loadConcerns();
    this.loadTasks();
  }

  loadSkOfficialProfile(): void {
    const fallbackName = localStorage.getItem('sk_official_name') || 'SK Official';
    const fallbackEmail = localStorage.getItem('sk_official_email') || 'Not available';
    const currentAdminId = Number(localStorage.getItem('sk_official_id') || localStorage.getItem('adminId'));

    this.skOfficialName = fallbackName;
    this.skOfficialEmail = fallbackEmail;
    this.skOfficialInitials = this.getInitials(fallbackName);
    this.skOfficialPosition = 'SK Official';

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
        localStorage.setItem('adminId', matched.adminId.toString());
        localStorage.setItem('sk_official_id', matched.adminId.toString());
        localStorage.setItem('sk_official_name', this.skOfficialName);
        localStorage.setItem('sk_official_email', matched.email);
      },
      error: (err) => {
        console.error('Error loading SK Official profile:', err);
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

  loadYouthMembers(): void {
    this.youthService.getUsers().subscribe({
      next: (users) => {
        // Only count approved and active youth members
        const filtered = users.filter(user => {
          return user.status === 'approved' && user.isActive === true;
        });
        this.youthMembersCount = filtered.length;
      },
      error: (err) => {
        console.error('Error loading youth members:', err);
        this.youthMembersCount = 0;
      }
    });
  }

  loadEvents(): void {
    this.eventService.getAllEvents().subscribe({
      next: (eventsList) => {
        this.events = eventsList;
        this.eventsCount = eventsList.length;
        this.visibleEventsCount = 10;
        this.updateDisplayedEvents();
      },
      error: (err) => {
        console.error('Error loading events:', err);
        this.events = [];
        this.eventsCount = 0;
        this.visibleEventsCount = 10;
        this.updateDisplayedEvents();
      }
    });
  }

  loadConcerns(): void {
    this.concernService.getAllConcernsForSkOfficial().subscribe({
      next: (concernsList: ConcernResponse[]) => {
        this.concerns = concernsList;
        this.concernsCount = concernsList.length;
      },
      error: (err: any) => {
        console.error('Error loading concerns:', err);
        this.concerns = [];
        this.concernsCount = 0;
      }
    });
  }

  loadTasks(): void {
    this.taskService.getAllTasks().subscribe({
      next: (tasksList) => {
        this.tasks = tasksList;
        this.tasksCount = tasksList.length;
        this.visibleTasksCount = 10;
        this.updateDisplayedTasks();
      },
      error: (err) => {
        console.error('Error loading tasks:', err);
        this.tasks = [];
        this.tasksCount = 0;
        this.visibleTasksCount = 10;
        this.updateDisplayedTasks();
      }
    });
  }

  updateDisplayedEvents(): void {
    this.displayedEvents = this.events.slice(0, this.visibleEventsCount);
  }

  updateDisplayedTasks(): void {
    this.displayedTasks = this.tasks.slice(0, this.visibleTasksCount);
  }

  showMoreEvents(): void {
    this.visibleEventsCount = Math.min(this.visibleEventsCount + 10, this.events.length);
    this.updateDisplayedEvents();
  }

  showMoreTasks(): void {
    this.visibleTasksCount = Math.min(this.visibleTasksCount + 10, this.tasks.length);
    this.updateDisplayedTasks();
  }

  trackByIndex(index: number): number {
    return index;
  }

  getEventDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getTaskDueDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getNotificationColor(index: number): string {
    const colors = ['red', 'blue', 'yellow', 'gray', 'green'];
    return colors[index % colors.length];
  }

  navigateToEvents(): void {
    this.router.navigate(['/sk-official/events']);
  }

  navigateToTasks(): void {
    this.router.navigate(['/sk-official/task-tracker']);
  }

  openEventDetailsModal(event: EventResponse): void {
    this.selectedEvent = event;
    this.isEventModalOpen = true;
  }

  closeEventModal(): void {
    this.isEventModalOpen = false;
    this.selectedEvent = null;
  }

  openTaskDetailsModal(task: TaskResponse): void {
    this.selectedTask = task;
    this.isTaskModalOpen = true;
  }

  closeTaskModal(): void {
    this.isTaskModalOpen = false;
    this.selectedTask = null;
  }

  formatEventDateTime(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTaskDateTime(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTaskingDisplayName(tasking: string): string {
    return tasking.replace(/_/g, ' ');
  }
}