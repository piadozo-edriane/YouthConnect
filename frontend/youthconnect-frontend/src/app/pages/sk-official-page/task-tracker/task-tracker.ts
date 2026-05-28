import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TaskTrackerService } from '../../../services/task-tracker.service';
import { TaskResponse, TaskRequest, TaskEditRequest } from '../../../models/task.model';
import { Tasking, TaskStatus } from '../../../models/enums';
import { SkOfficialManagementService } from '../../../services/sk-official-management.service';

@Component({
  selector: 'app-task-tracker',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './task-tracker.html',
  styleUrl: './task-tracker.scss',
})
export class TaskTracker implements OnInit {
  private taskService = inject(TaskTrackerService);
  private skOfficialService = inject(SkOfficialManagementService);
  private fb = inject(FormBuilder);

  // State
  isModalOpen = false;
  isDetailsModalOpen = false;
  isLoading = false;
  isEditing = false;
  currentEditingTaskId: number | null = null;
  successMessage = '';
  errorMessage = '';
  searchTerm = '';
  selectedTask: TaskResponse | null = null;

  // Tab state
  activeTab: 'all' | 'assigned' = 'all';

  // Filter state
  selectedTaskingFilter: string = 'ALL';
  selectedSkInchargeFilter: string = 'ALL';
  selectedStatusFilter: string = 'ALL';

  taskStatusFilterOptions = [
    { value: 'ALL',         label: 'All Statuses' },
    { value: 'PRIO',        label: 'PRIO' },
    { value: 'TODO',        label: 'TO DO' },
    { value: 'IN_PROGRESS', label: 'IN PROGRESS' },
    { value: 'DONE',        label: 'DONE' },
    { value: 'CUSTOM',      label: 'CUSTOM' },
  ];

  // Pagination for tasks
  private allTasksCurrentPage: number = 1;
  private assignedTasksCurrentPage: number = 1;
  tasksItemsPerPage: number = 15;

  // Cache flag to prevent reloading
  private tasksLoaded = false;
  // Task to auto-open from dashboard navigation
  private pendingOpenTaskId: number | null = null;

  // Tasks data
  tasks: TaskResponse[] = [];
  filteredTasks: TaskResponse[] = [];

  // SK Officials list for dropdown
  skOfficials: any[] = [];

  // Form
  taskForm!: FormGroup;

  // Admin info - get from localStorage or use default
  currentAdminId: number;
  skOfficialName = 'SK Official';
  skOfficialEmail = '';
  skOfficialPosition = 'SK Official';
  skOfficialInitials = 'SK';

  // Enums for template
  TaskStatus = TaskStatus;
  Tasking = Tasking;
  taskingOptions = Object.values(Tasking);
  taskStatusOptions = Object.values(TaskStatus);

  // Toast notifications
  notifications: { id: number; message: string; type: 'success' | 'error' }[] = [];
  private notificationCounter = 0;
  isEditConfirmationModalOpen = false;
  pendingEditPayload: any = null;
  isDeleteConfirmationModalOpen = false;
  pendingDeleteTaskId: number | null = null;
  pendingDeleteTaskTitle: string = '';

  constructor() {
    const storedAdminId = localStorage.getItem('sk_official_id') || localStorage.getItem('adminId');
    this.currentAdminId = storedAdminId ? parseInt(storedAdminId, 10) : 0;
    this.initForm();
  }

  initForm() {
    this.taskForm = this.fb.group({
      taskingType: ['', Validators.required],
      customTasking: ['', [Validators.maxLength(50)]],
      taskDescription: ['', [Validators.required, Validators.maxLength(500)]],
      skIncharge: ['', [Validators.required]],
      hyperlink: [''],
      status: ['', Validators.required],
      dueDate: ['', Validators.required],
      customStatus: ['']
    });

    // Conditional validation for customTasking
    this.taskForm.get('taskingType')?.valueChanges.subscribe(value => {
      const customTaskingControl = this.taskForm.get('customTasking');
      if (value === 'CUSTOM') {
        customTaskingControl?.setValidators([Validators.required, Validators.maxLength(50)]);
      } else {
        customTaskingControl?.clearValidators();
      }
      customTaskingControl?.updateValueAndValidity();
    });

    // Add conditional validation for customStatus
    this.taskForm.get('status')?.valueChanges.subscribe(status => {
      const customStatusControl = this.taskForm.get('customStatus');
      if (status === 'CUSTOM') {
        customStatusControl?.setValidators([Validators.required]);
      } else {
        customStatusControl?.clearValidators();
      }
      customStatusControl?.updateValueAndValidity();
    });
  }

  ngOnInit() {
    // Capture nav state immediately before anything clears it
    const navState = history.state;
    if (navState?.activeTab) {
      this.activeTab = navState.activeTab;
    }
    this.pendingOpenTaskId = navState?.openTaskId ?? null;

    this.loadSkOfficialProfile();
    this.loadSkOfficials();
    this.loadTasks();
  }

  ngAfterViewInit() {
    this.setupScrollIndicators();
  }

  setupScrollIndicators() {
    setTimeout(() => {
      const modalBodyWrappers = document.querySelectorAll('.modal-body-wrapper, .details-modal-body-wrapper');

      modalBodyWrappers.forEach((wrapper) => {
        const element = wrapper as HTMLElement;

        const updateScrollIndicators = () => {
          const canScrollUp = element.scrollTop > 10;
          const canScrollDown = element.scrollTop < element.scrollHeight - element.clientHeight - 10;

          if (canScrollUp) {
            element.classList.add('can-scroll-up');
          } else {
            element.classList.remove('can-scroll-up');
          }

          if (canScrollDown) {
            element.classList.add('can-scroll-down');
          } else {
            element.classList.remove('can-scroll-down');
          }
        };

        element.addEventListener('scroll', updateScrollIndicators);
        updateScrollIndicators();

        const resizeObserver = new ResizeObserver(updateScrollIndicators);
        resizeObserver.observe(element);
      });
    }, 100);
  }

  loadSkOfficialProfile() {
    const fallbackName = localStorage.getItem('sk_official_name') || 'SK Official';
    const fallbackEmail = localStorage.getItem('sk_official_email') || '';
    const currentAdminId = Number(localStorage.getItem('sk_official_id') || localStorage.getItem('adminId'));

    this.skOfficialName = fallbackName;
    this.skOfficialEmail = fallbackEmail;
    this.skOfficialInitials = this.getInitials(fallbackName);

    this.skOfficialService.getSkOfficials().subscribe({
      next: (officials) => {
        const matched = officials.find((official) => official.adminId === currentAdminId)
          || officials.find((official) => official.email === fallbackEmail);

        if (!matched) {
          return;
        }

        this.currentAdminId = matched.adminId;
        this.skOfficialName = `${matched.firstName} ${matched.lastName}`.trim();
        this.skOfficialEmail = matched.email;
        this.skOfficialInitials = this.getInitials(this.skOfficialName);
        localStorage.setItem('adminId', matched.adminId.toString());
        localStorage.setItem('sk_official_id', matched.adminId.toString());
        localStorage.setItem('sk_official_name', this.skOfficialName);
        localStorage.setItem('sk_official_email', matched.email);
      },
      error: (error) => {
        console.error('Error loading SK Official profile:', error);
      }
    });
  }

  loadSkOfficials() {
    this.skOfficialService.getSkOfficials().subscribe({
      next: (officials) => {
        this.skOfficials = officials.map(official => ({
          adminId: official.adminId,
          fullName: `${official.firstName} ${official.lastName}`.trim(),
          email: official.email,
          position: 'SK Official' // Default position since it's not in the model
        }));
      },
      error: (error) => {
        console.error('Error loading SK Officials list:', error);
      }
    });
  }

  loadTasks() {
    // Only load if not already loaded
    if (this.tasksLoaded && this.tasks.length > 0) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.taskService.getAllTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.applyFilters();
        this.tasksLoaded = true;
        this.isLoading = false;

        // Auto-open details modal if navigated from dashboard
        if (this.pendingOpenTaskId !== null) {
          const task = this.tasks.find(t => t.taskId === this.pendingOpenTaskId);
          if (task) {
            this.openDetailsModal(task);
          }
          this.pendingOpenTaskId = null;
        }
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.errorMessage = 'Failed to load tasks';
        this.isLoading = false;
      }
    });
  }

  switchTab(tab: 'all' | 'assigned') {
    this.activeTab = tab;
    this.selectedTaskingFilter = 'ALL';
    this.selectedSkInchargeFilter = 'ALL';
    this.selectedStatusFilter = 'ALL';
    this.applyFilters();
  }

  applyFilters(resetPage: boolean = true) {
    let filtered = [...this.tasks];

    // Apply tab filter
    if (this.activeTab === 'assigned') {
      filtered = filtered.filter(task =>
        task.adminId === this.currentAdminId ||
        task.skIncharge === this.skOfficialName
      );
    }

    // Apply tasking filter
    if (this.selectedTaskingFilter !== 'ALL') {
      filtered = filtered.filter(task => task.tasking === this.selectedTaskingFilter);
    }

    // Apply SK Incharge filter
    if (this.selectedSkInchargeFilter !== 'ALL') {
      filtered = filtered.filter(task => task.skIncharge === this.selectedSkInchargeFilter);
    }

    // Apply status filter
    if (this.selectedStatusFilter !== 'ALL') {
      filtered = filtered.filter(task => task.status === this.selectedStatusFilter);
    }

    // Apply search filter
    if (this.searchTerm.trim()) {
      const lowerTerm = this.searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.taskDescription?.toLowerCase().includes(lowerTerm) ||
        task.tasking?.toLowerCase().includes(lowerTerm) ||
        task.skIncharge?.toLowerCase().includes(lowerTerm)
      );
    }

    // Sort: DONE tasks go to the bottom, then by nearest due date; no due date goes last within each group
    filtered.sort((a, b) => {
      const aDone = a.status === 'DONE' ? 1 : 0;
      const bDone = b.status === 'DONE' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;

      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    this.filteredTasks = filtered;

    if (resetPage) {
      this.resetActivePagination();
    }

    this.clampActivePagination();
  }

  onTaskingFilterChange(value: string) {
    this.selectedTaskingFilter = value;
    this.applyFilters(true);
  }

  onSkInchargeFilterChange(value: string) {
    this.selectedSkInchargeFilter = value;
    this.applyFilters(true);
  }

  onStatusFilterChange(value: string) {
    this.selectedStatusFilter = value;
    this.applyFilters(true);
  }

  searchTasks(term: string) {
    this.searchTerm = term;
    this.applyFilters(true);
  }

  openModal() {
    this.isEditing = false;
    this.currentEditingTaskId = null;
    this.taskForm.reset();
    this.isModalOpen = true;
    setTimeout(() => this.setupScrollIndicators(), 100);
  }

  openEditModal(task: TaskResponse) {
    this.isEditing = true;
    this.currentEditingTaskId = task.taskId;

    const isKnownTasking = Object.values(Tasking).includes(task.tasking as any);
    const taskingType = isKnownTasking ? task.tasking : 'CUSTOM';
    const customTasking = isKnownTasking ? '' : task.tasking;

    this.taskForm.patchValue({
      taskingType,
      customTasking,
      taskDescription: task.taskDescription || '',
      skIncharge: task.skIncharge || '',
      hyperlink: task.hyperlink || '',
      status: task.status,
      dueDate: task.dueDate ? this.formatDateForInput(task.dueDate) : '',
      customStatus: task.status === 'CUSTOM' ? task.status : ''
    });
    this.isModalOpen = true;
    setTimeout(() => this.setupScrollIndicators(), 100);
  }

  closeModal() {
    this.isModalOpen = false;
    this.taskForm.reset();
    this.isEditing = false;
    this.currentEditingTaskId = null;
  }

  openDetailsModal(task: TaskResponse) {
    this.selectedTask = task;
    this.isDetailsModalOpen = true;
    setTimeout(() => this.setupScrollIndicators(), 100);
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.selectedTask = null;
  }

  createTask() {
    if (this.taskForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly';
      Object.keys(this.taskForm.controls).forEach(key => {
        this.taskForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.taskForm.value;

    const request: TaskRequest = {
      adminId: this.currentAdminId,
      tasking: this.getResolvedTasking(formValue),
      taskDescription: formValue.taskDescription,
      skIncharge: formValue.skIncharge,
      hyperlink: formValue.hyperlink || undefined,
      dueDate: formValue.dueDate || undefined,
      status: formValue.status as TaskStatus,
    };

    this.isLoading = true;

    // Optimistic UI update - add task immediately to the list
    const optimisticTask: TaskResponse = {
      taskId: Date.now(), // Temporary ID
      adminId: this.currentAdminId,
      tasking: request.tasking,
      taskDescription: request.taskDescription,
      skIncharge: request.skIncharge,
      hyperlink: request.hyperlink,
      status: request.status || TaskStatus.PRIO,
      dueDate: request.dueDate,
      createdAt: new Date().toISOString()
    };

    // Add to the beginning of the list for immediate feedback
    this.tasks.unshift(optimisticTask);
    this.filteredTasks = [...this.tasks];

    // Close modal immediately for better UX
    this.closeModal();
    this.showNotification('Creating task...');

    this.taskService.createTask(request).subscribe({
      next: (response) => {
        // Replace optimistic task with real one from server
        const index = this.tasks.findIndex(t => t.taskId === optimisticTask.taskId);
        if (index !== -1) {
          this.tasks[index] = response;
        } else {
          this.tasks.unshift(response);
        }
        this.applyFilters();
        this.showNotification('Task created successfully! Email notification sent.');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error creating task:', error);
        // Remove optimistic task on error
        this.tasks = this.tasks.filter(t => t.taskId !== optimisticTask.taskId);
        this.applyFilters();
        this.errorMessage = 'Failed to create task';
        this.showNotification('Failed to create task', 'error');
        this.isLoading = false;
      }
    });
  }

  closeEditConfirmationModal(): void {
    this.isEditConfirmationModalOpen = false;
    this.pendingEditPayload = null;
  }

  confirmEditSubmission(): void {
    if (!this.pendingEditPayload || !this.currentEditingTaskId) {
      return;
    }

    this.isLoading = true;

    const taskId = this.currentEditingTaskId;
    const request = this.pendingEditPayload as TaskEditRequest;

    this.taskService.editTask(taskId, request).subscribe({
      next: (response) => {
        const index = this.tasks.findIndex(t => t.taskId === taskId);
        if (index !== -1) {
          this.tasks[index] = response;
          this.applyFilters();

          // Update selected task if it's currently being viewed in details modal
          if (this.selectedTask && this.selectedTask.taskId === taskId) {
            this.selectedTask = response;
          }
        }
        this.showNotification('Task updated successfully!');
        this.isLoading = false;
        this.closeEditConfirmationModal();
        this.closeModal();
      },
      error: (error) => {
        console.error('Error updating task:', error);
        this.errorMessage = 'Failed to update task';
        this.isLoading = false;
      }
    });
  }

  closeDeleteConfirmationModal(): void {
    this.isDeleteConfirmationModalOpen = false;
    this.pendingDeleteTaskId = null;
    this.pendingDeleteTaskTitle = '';
  }

  confirmDeleteSubmission(): void {
    if (!this.pendingDeleteTaskId) {
      return;
    }

    this.isLoading = true;

    this.taskService.deleteTask(this.pendingDeleteTaskId).subscribe({
      next: () => {
        this.tasks = this.tasks.filter(t => t.taskId !== this.pendingDeleteTaskId);
        this.applyFilters();
        this.showNotification('Task deleted successfully!');
        this.isLoading = false;
        this.closeDeleteConfirmationModal();
        this.closeDetailsModal();
      },
      error: (error) => {
        console.error('Error deleting task:', error);
        this.errorMessage = 'Failed to delete task';
        this.isLoading = false;
      }
    });
  }

  saveTask() {
    if (this.isEditing) {
      // Show confirmation modal for edit
      if (!this.currentEditingTaskId) {
        this.errorMessage = 'Task ID not found';
        return;
      }

      if (this.taskForm.invalid) {
        this.errorMessage = 'Please fill in all required fields correctly';
        Object.keys(this.taskForm.controls).forEach(key => {
          this.taskForm.get(key)?.markAsTouched();
        });
        return;
      }

      const formValue = this.taskForm.value;

      const request: TaskEditRequest = {
        tasking: this.getResolvedTasking(formValue),
        taskDescription: formValue.taskDescription,
        skIncharge: formValue.skIncharge,
        hyperlink: formValue.hyperlink || undefined,
        dueDate: formValue.dueDate || undefined,
        status: formValue.status as TaskStatus,
      };

      this.pendingEditPayload = request;
      this.isEditConfirmationModalOpen = true;
    } else {
      this.createTask();
    }
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const id = ++this.notificationCounter;
    this.notifications = [...this.notifications, { id, message, type }];

    setTimeout(() => {
      this.notifications = this.notifications.filter(notification => notification.id !== id);
    }, 3000);
  }

  deleteTask(taskId: number) {
    const task = this.tasks.find(t => t.taskId === taskId);
    if (task) {
      this.pendingDeleteTaskId = taskId;
      this.pendingDeleteTaskTitle = this.getTaskingDisplayName(task.tasking);
      this.isDeleteConfirmationModalOpen = true;
    }
  }

  updateTaskStatus(taskId: number, newStatus: string) {
    this.taskService.updateTaskStatus(taskId, newStatus as TaskStatus).subscribe({
      next: (response) => {
        const index = this.tasks.findIndex(t => t.taskId === taskId);
        if (index !== -1) {
          this.tasks[index] = response;
          this.applyFilters();

          // Update selected task if it's currently being viewed in details modal
          if (this.selectedTask && this.selectedTask.taskId === taskId) {
            this.selectedTask = response;
          }
        }
        this.showNotification(`Task status updated to ${newStatus}`);
      },
      error: (error) => {
        console.error('Error updating status:', error);
        this.errorMessage = 'Failed to update task status';
      }
    });
  }

  setAsInProgress(taskId: number) {
    this.updateTaskStatus(taskId, 'IN_PROGRESS');
  }

  getResolvedTasking(formValue: any): string {
    return formValue.taskingType === 'CUSTOM'
      ? (formValue.customTasking || '').trim()
      : formValue.taskingType;
  }

  getTaskingDisplayName(tasking: string): string {
    return tasking.replace(/_/g, ' ');
  }

  getSkOfficialName(adminId: number): string {
    if (adminId === this.currentAdminId) {
      return this.skOfficialName;
    }
    return `SK Official #${adminId}`;
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

  formatDate(dateString?: string): string {
    if (!dateString) return 'No date set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatDateForInput(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Pagination getters and methods
  get tasksCurrentPage(): number {
    return this.activeTab === 'all' ? this.allTasksCurrentPage : this.assignedTasksCurrentPage;
  }

  set tasksCurrentPage(value: number) {
    if (this.activeTab === 'all') {
      this.allTasksCurrentPage = value;
    } else {
      this.assignedTasksCurrentPage = value;
    }
  }

  get paginatedTasks(): TaskResponse[] {
    const startIndex = (this.tasksCurrentPage - 1) * this.tasksItemsPerPage;
    const endIndex = startIndex + this.tasksItemsPerPage;
    return this.filteredTasks.slice(startIndex, endIndex);
  }

  get tasksTotalPages(): number {
    return Math.ceil(this.filteredTasks.length / this.tasksItemsPerPage);
  }

  get tasksVisiblePages(): number[] {
    const totalPages = this.tasksTotalPages;
    const currentPage = this.tasksCurrentPage;

    if (totalPages <= 0) {
      return [];
    }

    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 2) {
      return [1, 2, 3];
    }

    if (currentPage >= totalPages - 1) {
      return [totalPages - 2, totalPages - 1, totalPages];
    }

    return [currentPage - 1, currentPage, currentPage + 1];
  }

  get showTasksLeftEllipsis(): boolean {
    const pages = this.tasksVisiblePages;
    return this.tasksTotalPages > 3 && pages.length > 0 && pages[0] > 1;
  }

  get showTasksRightEllipsis(): boolean {
    const pages = this.tasksVisiblePages;
    return this.tasksTotalPages > 3 && pages.length > 0 && pages[pages.length - 1] < this.tasksTotalPages;
  }

  get showTasksPagination(): boolean {
    return this.filteredTasks.length > this.tasksItemsPerPage;
  }

  goToTasksPage(page: number): void {
    if (page >= 1 && page <= this.tasksTotalPages) {
      this.tasksCurrentPage = page;
    }
  }

  nextTasksPage(): void {
    if (this.tasksCurrentPage < this.tasksTotalPages) {
      this.tasksCurrentPage++;
    }
  }

  previousTasksPage(): void {
    if (this.tasksCurrentPage > 1) {
      this.tasksCurrentPage--;
    }
  }

  private resetActivePagination(): void {
    this.tasksCurrentPage = 1;
  }

  private clampActivePagination(): void {
    if (this.tasksTotalPages === 0) {
      this.tasksCurrentPage = 1;
      return;
    }

    if (this.tasksCurrentPage > this.tasksTotalPages) {
      this.tasksCurrentPage = this.tasksTotalPages;
    }
  }

  trackByTaskId(index: number, task: TaskResponse): number {
    return task.taskId;
  }
}
