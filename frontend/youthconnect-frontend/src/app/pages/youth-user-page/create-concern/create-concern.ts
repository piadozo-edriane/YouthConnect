import { Component, inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ConcernService, ConcernResponse, ConcernUpdate } from '../../../services/concern.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-create-concern',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-concern.html',
  styleUrl: './create-concern.scss',
})
export class CreateConcern implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private concernService = inject(ConcernService);
  private authService = inject(AuthService);
  private router = inject(Router);

  showModal = false;
  showDeleteModal = false;
  showDetailsModal = false;
  concernForm: FormGroup;
  editingConcernId: number | null = null;
  concernToDelete: ConcernResponse | null = null;
  selectedConcern: ConcernResponse | null = null;
  youthId: number = 0;
  isLoading = false;
  isLoadingUpdates = false;
  errorMessage = '';
  successMessage = '';
  updateLoadError = '';
  expandedConcernId: number | null = null;
  concernUpdates: ConcernUpdate[] = [];

  concerns: ConcernResponse[] = [];
  filteredConcerns: ConcernResponse[] = [];
  paginatedConcerns: ConcernResponse[] = [];
  searchQuery = '';
  selectedStatusFilter: string = 'ALL';
  selectedTypeFilter: string = 'ALL';

  // Pagination
  currentPage = 1;
  itemsPerPage = 5;
  totalPages = 1;

  statusFilters = [
    { value: 'ALL', label: 'All Status' },
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'CLOSED', label: 'Closed' }
  ];

  typeFilters = [
    { value: 'ALL', label: 'All Types' },
    { value: 'PROJECT_CONCERN', label: 'Project' },
    { value: 'COMMUNITY_CONCERN', label: 'Community' },
    { value: 'SYSTEM_CONCERN', label: 'System' }
  ];

  concernTypes = [
    { value: 'PROJECT_CONCERN', label: 'Project Concern' },
    { value: 'COMMUNITY_CONCERN', label: 'Community Concern' },
    { value: 'SYSTEM_CONCERN', label: 'System Concern' }
  ];

  constructor() {
    this.concernForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      typeOfConcern: ['', Validators.required],
      description: ['', [Validators.required, Validators.maxLength(1000)]]
    });
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.youthId) {
      this.youthId = user.youthId;
      this.loadConcerns();
    } else {
      this.errorMessage = 'Unable to load user information';
    }
  }

  ngAfterViewInit(): void {
    this.setupScrollIndicators();
  }

  setupScrollIndicators(): void {
    setTimeout(() => {
      const modalBodyWrappers = document.querySelectorAll('.modal-body-wrapper');

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

  loadConcerns(): void {
    this.isLoading = true;
    this.concernService.getOwnConcerns(this.youthId).subscribe({
      next: (concerns) => {
        this.concerns = concerns;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading concerns:', error);
        this.errorMessage = 'Failed to load concerns';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.concerns];

    // Apply status filter
    if (this.selectedStatusFilter !== 'ALL') {
      filtered = filtered.filter(c => c.status === this.selectedStatusFilter);
    }

    // Apply type filter
    if (this.selectedTypeFilter !== 'ALL') {
      filtered = filtered.filter(c => c.typeOfConcern === this.selectedTypeFilter);
    }

    // Apply search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
      );
    }

    this.filteredConcerns = filtered;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredConcerns.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedConcerns = this.filteredConcerns.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1); // ellipsis
        pages.push(this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        pages.push(this.currentPage - 1);
        pages.push(this.currentPage);
        pages.push(this.currentPage + 1);
        pages.push(-1);
        pages.push(this.totalPages);
      }
    }

    return pages;
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.applyFilters();
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatusFilter = status;
    this.applyFilters();
  }

  onTypeFilterChange(type: string): void {
    this.selectedTypeFilter = type;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStatusFilter = 'ALL';
    this.selectedTypeFilter = 'ALL';
    this.applyFilters();
  }

  viewConcern(concern: ConcernResponse): void {
    this.router.navigate(['/youth/concern', concern.concernId]);
  }

  openModal() {
    this.showModal = true;
    this.editingConcernId = null;
    this.concernForm.reset();
    this.errorMessage = '';
    setTimeout(() => this.setupScrollIndicators(), 100);
  }

  openConcernDetails(concern: ConcernResponse): void {
    this.selectedConcern = concern;
    this.showDetailsModal = true;
    this.updateLoadError = '';
    this.loadConcernUpdates(concern.concernId);
    setTimeout(() => this.setupScrollIndicators(), 100);
  }

  closeModal() {
    this.showModal = false;
    this.editingConcernId = null;
    this.concernForm.reset();
    this.errorMessage = '';
  }

  closeConcernDetails(): void {
    this.showDetailsModal = false;
    this.selectedConcern = null;
    this.concernUpdates = [];
    this.updateLoadError = '';
  }

  showSuccessToast(message: string): void {
    this.successMessage = message;
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  toggleConcernDetails(concernId: number): void {
    this.expandedConcernId = this.expandedConcernId === concernId ? null : concernId;
  }

  loadConcernUpdates(concernId: number): void {
    this.isLoadingUpdates = true;
    this.updateLoadError = '';

    this.concernService.getConcernUpdates(concernId).subscribe({
      next: (updates) => {
        this.concernUpdates = updates;
        this.isLoadingUpdates = false;
      },
      error: (error) => {
        console.error('Error loading concern updates:', error);
        this.updateLoadError = 'Failed to load updates. Please try again.';
        this.isLoadingUpdates = false;
      }
    });
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

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getConcernTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'PROJECT_CONCERN': '📋',
      'COMMUNITY_CONCERN': '🏘️',
      'SYSTEM_CONCERN': '⚙️'
    };
    return icons[type] || '📝';
  }

  getConcernTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'PROJECT_CONCERN': 'Project',
      'COMMUNITY_CONCERN': 'Community',
      'SYSTEM_CONCERN': 'System'
    };
    return labels[type] || type;
  }

  submitConcern() {
    if (this.concernForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      const formValue = this.concernForm.value;

      if (this.editingConcernId) {
        // Update existing concern
        const updateRequest = {
          typeOfConcern: formValue.typeOfConcern,
          title: formValue.title,
          description: formValue.description
        };

        this.concernService.editConcern(this.editingConcernId, updateRequest).subscribe({
          next: (response) => {
            console.log('Concern updated:', response);
            this.loadConcerns();
            this.closeModal();
            this.showSuccessToast('Concern updated successfully!');
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error updating concern:', error);
            this.errorMessage = error.error?.message || 'Failed to update concern';
            this.isLoading = false;
          }
        });
      } else {
        // Create new concern
        const createRequest = {
          youthId: this.youthId,
          typeOfConcern: formValue.typeOfConcern,
          title: formValue.title,
          description: formValue.description
        };

        this.concernService.submitConcern(createRequest).subscribe({
          next: (response) => {
            console.log('Concern created:', response);
            this.loadConcerns();
            this.closeModal();
            this.showSuccessToast('Concern created successfully!');
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error creating concern:', error);
            this.errorMessage = error.error?.message || 'Failed to create concern';
            this.isLoading = false;
          }
        });
      }
    } else {
      this.concernForm.markAllAsTouched();
    }
  }

  editConcern(concern: ConcernResponse) {
    this.editingConcernId = concern.concernId;
    this.concernForm.patchValue({
      title: concern.title,
      typeOfConcern: concern.typeOfConcern,
      description: concern.description
    });
    this.showModal = true;
    this.errorMessage = '';
    console.log('Editing concern:', concern);
    setTimeout(() => this.setupScrollIndicators(), 100);
  }

  deleteConcern(concern: ConcernResponse) {
    this.concernToDelete = concern;
    this.showDeleteModal = true;
  }

  confirmDelete() {
    if (this.concernToDelete) {
      this.isLoading = true;
      this.concernService.deleteConcern(this.concernToDelete.concernId).subscribe({
        next: () => {
          console.log('Concern deleted:', this.concernToDelete);
          this.loadConcerns();
          this.cancelDelete();
          this.showSuccessToast('Concern deleted successfully!');
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error deleting concern:', error);
          this.errorMessage = 'Failed to delete concern';
          this.isLoading = false;
          this.cancelDelete();
        }
      });
    }
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.concernToDelete = null;
  }

  getStatusBadgeClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'OPEN': 'status-open',
      'IN_PROGRESS': 'status-in-progress',
      'RESOLVED': 'status-resolved',
      'CLOSED': 'status-closed'
    };
    return statusMap[status] || 'status-open';
  }

  getStatusLabel(status: string): string {
    const labelMap: { [key: string]: string } = {
      'OPEN': 'Open',
      'IN_PROGRESS': 'In Progress',
      'RESOLVED': 'Resolved',
      'CLOSED': 'Closed'
    };
    return labelMap[status] || status;
  }
}
