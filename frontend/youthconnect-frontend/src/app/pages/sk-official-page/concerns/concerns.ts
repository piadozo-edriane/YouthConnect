import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminConcernService, Concern, ConcernUpdate, AdminConcernUpdateRequest } from '../../../services/admin-concern.service';
import { SkOfficialManagementService } from '../../../services/sk-official-management.service';

@Component({
  selector: 'app-concerns',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './concerns.html',
  styleUrl: './concerns.scss',
})
export class Concerns implements OnInit {
  concerns: Concern[] = [];
  filteredConcerns: Concern[] = [];
  isLoading = false;
  errorMessage: string = '';
  successMessage: string = '';
  searchTerm: string = '';
  selectedTypeFilter: string = 'ALL';
  selectedStatusFilter: string = 'ALL';
  currentAdminId: number = 0;

  concernTypeFilterOptions = [
    { value: 'ALL',               label: 'All Types' },
    { value: 'PROJECT_CONCERN',   label: 'Project Concern' },
    { value: 'COMMUNITY_CONCERN', label: 'Community Concern' },
    { value: 'SYSTEM_CONCERN',    label: 'System Concern' },
  ];

  concernStatusFilterOptions = [
    { value: 'ALL',         label: 'All Statuses' },
    { value: 'OPEN',        label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'RESOLVED',    label: 'Resolved' },
    { value: 'CLOSED',      label: 'Closed' },
  ];
  skOfficialName = 'SK Official';
  skOfficialEmail = '';
  skOfficialPosition = 'SK Official';
  skOfficialInitials = 'SK';
  concernsCurrentPage = 1;
  concernsItemsPerPage = 9;
  private pendingStatusFilter: string | null = null;

  constructor(
    private adminConcernService: AdminConcernService,
    private authService: AuthService,
    private skOfficialService: SkOfficialManagementService,
    private router: Router
  ) {}

  ngOnInit() {
    this.getCurrentUser();
    this.loadSkOfficialProfile();
    this.pendingStatusFilter = history.state?.statusFilter || null;
    this.loadConcerns();
  }

  getCurrentUser() {
    const user = this.authService.getCurrentUser() as any;
    if (user && user.adminId) {
      this.currentAdminId = user.adminId;
      localStorage.setItem('adminId', user.adminId.toString());
    }

    if (!this.currentAdminId) {
      const storedAdminId = localStorage.getItem('sk_official_id') || localStorage.getItem('adminId');
      this.currentAdminId = storedAdminId ? Number(storedAdminId) : 0;
    }
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

        this.skOfficialName = `${matched.firstName} ${matched.lastName}`.trim();
        this.skOfficialEmail = matched.email;
        this.skOfficialInitials = this.getInitials(this.skOfficialName);
        localStorage.setItem('sk_official_name', this.skOfficialName);
        localStorage.setItem('sk_official_email', matched.email);
      },
      error: (error) => {
        console.error('Error loading SK Official profile:', error);
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

  loadConcerns() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.adminConcernService.getAllConcerns().subscribe({
      next: (data) => {
        this.concerns = data;
        this.searchTerm = '';
        this.selectedTypeFilter = 'ALL';
        this.selectedStatusFilter = this.pendingStatusFilter || 'ALL';
        this.pendingStatusFilter = null;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading concerns:', error);
        this.errorMessage = 'Failed to load concerns. Please try again.';
        this.isLoading = false;
      }
    });
  }

  onTypeFilterChange(value: string) {
    this.selectedTypeFilter = value;
    this.applyFilters();
  }

  onStatusFilterChange(value: string) {
    this.selectedStatusFilter = value;
    this.applyFilters();
  }

  applyFilters() {
    let result = this.concerns;

    if (this.selectedTypeFilter !== 'ALL') {
      result = result.filter(c => c.typeOfConcern === this.selectedTypeFilter);
    }

    if (this.selectedStatusFilter !== 'ALL') {
      result = result.filter(c => c.status === this.selectedStatusFilter);
    }

    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(searchLower) ||
        c.description.toLowerCase().includes(searchLower) ||
        c.typeOfConcern.toLowerCase().includes(searchLower)
      );
    }

    this.filteredConcerns = result;
    this.concernsCurrentPage = 1;
  }

  searchConcerns(term: string) {
    this.searchTerm = term;
    this.applyFilters();
  }

  get paginatedConcerns(): Concern[] {
    const startIndex = (this.concernsCurrentPage - 1) * this.concernsItemsPerPage;
    const endIndex = startIndex + this.concernsItemsPerPage;
    return this.filteredConcerns.slice(startIndex, endIndex);
  }

  get concernsTotalPages(): number {
    return Math.ceil(this.filteredConcerns.length / this.concernsItemsPerPage);
  }

  get concernsVisiblePages(): number[] {
    const totalPages = this.concernsTotalPages;
    const currentPage = this.concernsCurrentPage;

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

  get showConcernsLeftEllipsis(): boolean {
    const pages = this.concernsVisiblePages;
    return this.concernsTotalPages > 3 && pages.length > 0 && pages[0] > 1;
  }

  get showConcernsRightEllipsis(): boolean {
    const pages = this.concernsVisiblePages;
    return this.concernsTotalPages > 3 && pages.length > 0 && pages[pages.length - 1] < this.concernsTotalPages;
  }

  get showConcernsPagination(): boolean {
    return this.filteredConcerns.length > this.concernsItemsPerPage;
  }

  goToConcernsPage(page: number): void {
    if (page >= 1 && page <= this.concernsTotalPages) {
      this.concernsCurrentPage = page;
    }
  }

  nextConcernsPage(): void {
    if (this.concernsCurrentPage < this.concernsTotalPages) {
      this.concernsCurrentPage++;
    }
  }

  previousConcernsPage(): void {
    if (this.concernsCurrentPage > 1) {
      this.concernsCurrentPage--;
    }
  }

  updateConcern(concern: Concern) {
    this.router.navigate(['/sk-official/concerns/update', concern.concernId]);
  }

  getConcernTypeDisplay(type: string): string {
    const typeMap: { [key: string]: string } = {
      'PROJECT_CONCERN': 'Project Concern',
      'COMMUNITY_CONCERN': 'Community Concern',
      'SYSTEM_CONCERN': 'System Concern'
    };
    return typeMap[type] || type;
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace('_', '-');
  }

  getStatusBadgeClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'OPEN':        'status-open',
      'IN_PROGRESS': 'status-in-progress',
      'RESOLVED':    'status-resolved',
      'CLOSED':      'status-closed'
    };
    return statusMap[status] || 'status-open';
  }

  getStatusLabel(status: string): string {
    const labelMap: { [key: string]: string } = {
      'OPEN':        'Open',
      'IN_PROGRESS': 'In Progress',
      'RESOLVED':    'Resolved',
      'CLOSED':      'Closed'
    };
    return labelMap[status] || status;
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

  canSendResponse(status: string): boolean {
    return status !== 'CLOSED';
  }
}


