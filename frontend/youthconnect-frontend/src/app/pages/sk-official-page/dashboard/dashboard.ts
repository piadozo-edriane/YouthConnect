import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
export class Dashboard implements OnInit, OnDestroy {
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
  todayLabel = '';
  currentTime = '';
  private clockInterval: any;

  // Counts
  youthMembersCount = 0;
  eventsCount = 0;
  concernsCount = 0;
  tasksCount = 0;

  // Data lists
  events: EventResponse[] = [];
  tasks: TaskResponse[] = [];
  allTasks: TaskResponse[] = [];
  concerns: ConcernResponse[] = [];

  // Incremental loading state
  visibleEventsCount = 10;
  visibleTasksCount = 10;
  displayedEvents: EventResponse[] = [];
  displayedTasks: TaskResponse[] = [];

  // Modal state - tasks now open in task tracker directly
  isTaskModalOpen = false;
  selectedTask: TaskResponse | null = null;

  ngOnInit(): void {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  updateClock(): void {
    const now = new Date();
    this.todayLabel = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    this.currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

        // Re-filter tasks now that we have the resolved name (catches skIncharge matches)
        this.applyTaskFilter();
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
        this.allTasks = tasksList;
        this.applyTaskFilter();
      },
      error: (err) => {
        console.error('Error loading tasks:', err);
        this.allTasks = [];
        this.tasks = [];
        this.tasksCount = 0;
        this.visibleTasksCount = 10;
        this.updateDisplayedTasks();
      }
    });
  }

  applyTaskFilter(): void {
    const currentAdminId = Number(localStorage.getItem('sk_official_id') || localStorage.getItem('adminId'));
    this.tasks = this.allTasks.filter(task =>
      task.adminId === currentAdminId ||
      task.skIncharge === this.skOfficialName
    );
    this.tasksCount = this.tasks.length;
    this.visibleTasksCount = 10;
    this.updateDisplayedTasks();
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
    this.router.navigate(['/sk-official/events'], { state: { statusFilter: 'Upcoming' } });
  }

  navigateToConcerns(): void {
    this.router.navigate(['/sk-official/concerns'], { state: { statusFilter: 'OPEN' } });
  }

  navigateToTasks(): void {
    this.router.navigate(['/sk-official/task-tracker']);
  }

  navigateToYouthMembers(): void {
    this.router.navigate(['/sk-official/youth-profiling']);
  }

  openEventDetailsModal(event: EventResponse): void {
    this.router.navigate(['/sk-official/events', event.eventId], { state: { returnTo: 'dashboard' } });
  }

  openTaskDetailsModal(task: TaskResponse): void {
    this.router.navigate(['/sk-official/task-tracker'], {
      state: { activeTab: 'assigned', openTaskId: task.taskId }
    });
  }

  getTaskingDisplayName(tasking: string): string {
    return tasking.replace(/_/g, ' ');
  }
}