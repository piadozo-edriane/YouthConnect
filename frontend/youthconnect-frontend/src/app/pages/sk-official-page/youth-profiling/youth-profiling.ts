import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { YouthMemberManagementService, YouthMemberListItem } from '../../../services/youth-member-management.service';
import { SkOfficialManagementService } from '../../../services/sk-official-management.service';
import { CivilStatus, Gender } from '../../../models/enums';
import { forkJoin, Observable } from 'rxjs';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';

@Component({
  selector: 'app-youth-profiling',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './youth-profiling.html',
  styleUrl: './youth-profiling.scss',
})
export class YouthProfiling implements OnInit {
  youthProfiles: YouthMemberListItem[] = [];
  filteredProfiles: YouthMemberListItem[] = [];
  userAccountByUserId = new Map<number, { email: string; roleId: number; isActive: boolean; status: 'pending' | 'approved' | 'rejected' }>();
  searchQuery: string = '';
  approvalSearchQuery: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Pagination for approval panel
  approvalCurrentPage: number = 1;
  approvalItemsPerPage: number = 10;

  // Cache flag to prevent reloading
  private profilesLoaded = false;

  // Tab management
  activeTab: 'active' | 'inactive' | 'pending' | 'rejected' = 'active';

  isApprovalPanelOpen = false;
  approvalFilter: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'all' = 'pending';
  approvalMessage: string = '';
  approvalError: string = '';
  updatingApprovalUserId: number | null = null;
  updatingApprovalAction: 'approve' | 'reject' | 'reactivate' | null = null;
  rejectingUserId: number | null = null;
  rejectionReason: string = '';
  isRejectModalOpen: boolean = false;
  isDetailsModalOpen: boolean = false;
  skOfficialName = 'SK Official';
  skOfficialEmail = '';
  skOfficialPosition = 'SK Official';
  skOfficialInitials = 'SK';

  // Notification system
  notifications: { id: number; message: string; type: 'success' | 'error' }[] = [];
  private notificationCounter = 0;

  // Modal states
  isEditModalOpen = false;
  isDeactivateModalOpen = false;
  isEditConfirmationModalOpen = false;
  isDeactivateConfirmationModalOpen = false;
  isReactivateConfirmationModalOpen = false;
  isYouthDetailsModalOpen = false;
  selectedProfile: YouthMemberListItem | null = null;
  selectedYouthProfile: YouthMemberListItem | null = null;
  editForm!: FormGroup;
  isSubmitting = false;
  pendingEditPayload: any = null;

  constructor(
    private youthMemberManagementService: YouthMemberManagementService,
    private skOfficialService: SkOfficialManagementService,
    private fb: FormBuilder
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    this.loadSkOfficialProfile();
    this.loadYouthProfiles();
  }

  ngAfterViewInit() {
    this.setupScrollIndicators();
  }

  setupScrollIndicators() {
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

  loadSkOfficialProfile(): void {
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

  initForms(): void {
    this.editForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      middleName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      suffix: [''],
      gender: ['', Validators.required],
      birthday: ['', Validators.required],
      contactNumber: ['', [Validators.required, Validators.maxLength(15)]],
      civilStatus: ['', Validators.required],
      completeAddress: ['', [Validators.required, Validators.maxLength(200)]],
      youthClassification: ['', Validators.required],
      educationBackground: ['', Validators.required],
      workStatus: ['', Validators.required],
      skVoter: [false],
      nationalVoter: [false],
      pastVoter: [false],
      numberOfAttendedAssemblies: [0, Validators.required],
      reason: ['', Validators.required]
    });
  }

  private normalizeStatus(status?: string | null): string {
    return (status ?? '').trim().toLowerCase();
  }

  private toApprovalStatus(status?: string | null): 'pending' | 'approved' | 'rejected' {
    const normalized = this.normalizeStatus(status);
    if (normalized === 'approved' || normalized === 'rejected' || normalized === 'pending') {
      return normalized;
    }
    return 'pending';
  }

  isPendingProfile(profile: YouthMemberListItem): boolean {
    return this.normalizeStatus(profile.status) === 'pending';
  }

  isRejectedProfile(profile: YouthMemberListItem): boolean {
    return this.normalizeStatus(profile.status) === 'rejected';
  }

  isApprovedProfile(profile: YouthMemberListItem): boolean {
    return this.normalizeStatus(profile.status) === 'approved';
  }

  isDeactivatedProfile(profile: YouthMemberListItem): boolean {
    return this.isApprovedProfile(profile) && profile.isActive === false;
  }

  isActiveApprovedProfile(profile: YouthMemberListItem): boolean {
    return this.isApprovedProfile(profile) && profile.isActive === true;
  }

  getApprovalStatusLabel(profile: YouthMemberListItem): string {
    if (this.isPendingProfile(profile)) {
      return 'Pending';
    }

    if (this.isRejectedProfile(profile)) {
      return 'Rejected';
    }

    if (this.isDeactivatedProfile(profile)) {
      return 'Deactivated';
    }

    if (this.isApprovedProfile(profile)) {
      return 'Approved';
    }

    return 'Unknown';
  }

  loadYouthProfiles(): void {
    // Only load if not already loaded
    if (this.profilesLoaded && this.youthProfiles.length > 0) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      users: this.youthMemberManagementService.getUsers(),
      profiles: this.youthMemberManagementService.getYouthProfiles()
    }).subscribe({
      next: ({ users, profiles }) => {
        const userByYouthIdMap = new Map(users.map((user) => [user.youthId, user]));
        this.userAccountByUserId = new Map(
          users.map((user) => [
            user.userId,
            {
              email: user.email,
              roleId: user.roleId,
              isActive: user.isActive ?? true,
              status: this.toApprovalStatus(user.status)
            }
          ])
        );

        this.youthProfiles = profiles.map((profile: any) => {
          const matchingUser = userByYouthIdMap.get(profile.youthId);
          const normalizedStatus = this.toApprovalStatus(matchingUser?.status);

          return {
            userId: matchingUser?.userId || 0,
            youthId: profile.youthId,
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: matchingUser?.email || profile.email || '',
            gender: profile.gender as Gender,
            birthday: profile.birthday,
            contactNumber: profile.contactNumber,
            civilStatus: profile.civilStatus as CivilStatus,
            isActive: matchingUser?.isActive ?? (profile.isActive !== undefined ? profile.isActive : true),
            status: normalizedStatus,
            createdAt: matchingUser?.createdAt || profile.createdAt,
            middleName: profile.middleName || null,
            suffix: profile.suffix || null,
            completeAddress: profile.completeAddress,
            youthClassification: profile.youthClassification ? {
              youthClassification: profile.youthClassification.youthClassification || null,
              educationBackground: profile.youthClassification.educationBackground || null,
              workStatus: profile.youthClassification.workStatus || null,
              skVoter: profile.youthClassification.skVoter || false,
              nationalVoter: profile.youthClassification.nationalVoter || false,
              pastVoter: profile.youthClassification.pastVoter || false,
              numAttended: profile.youthClassification.numAttended || 0,
              nonAttendedReason: profile.youthClassification.nonAttendedReason || null
            } : undefined
          };
        });

        this.filteredProfiles = this.getProfilesByTab();
        this.profilesLoaded = true; // Mark as loaded
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading youth profiles:', error);
        this.errorMessage = 'Failed to load youth profiles. Please try again.';
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.filteredProfiles = this.getProfilesByTab();

    if (!this.searchQuery.trim()) {
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredProfiles = this.filteredProfiles.filter(profile =>
      profile.firstName.toLowerCase().includes(query) ||
      profile.lastName.toLowerCase().includes(query) ||
      (profile.middleName && profile.middleName.toLowerCase().includes(query)) ||
      profile.contactNumber.toLowerCase().includes(query) ||
      (profile.completeAddress && profile.completeAddress.toLowerCase().includes(query)) ||
      profile.civilStatus.toLowerCase().includes(query)
    );
  }

  // Tab management methods
  setActiveTab(tab: 'active' | 'inactive' | 'pending' | 'rejected'): void {
    this.activeTab = tab;
    this.searchQuery = '';
    this.filteredProfiles = this.getProfilesByTab();
  }

  getProfilesByTab(): YouthMemberListItem[] {
    let profiles: YouthMemberListItem[] = [];

    switch (this.activeTab) {
      case 'active':
        profiles = this.youthProfiles.filter((profile) => this.isActiveApprovedProfile(profile));
        break;
      case 'inactive':
        profiles = this.youthProfiles.filter((profile) => this.isDeactivatedProfile(profile));
        break;
      case 'pending':
        profiles = this.youthProfiles.filter((profile) => this.isPendingProfile(profile));
        break;
      case 'rejected':
        profiles = this.youthProfiles.filter((profile) => this.isRejectedProfile(profile));
        break;
    }

    if (!this.searchQuery.trim()) {
      return profiles;
    }

    const query = this.searchQuery.toLowerCase();
    return profiles.filter(profile =>
      profile.firstName.toLowerCase().includes(query) ||
      profile.lastName.toLowerCase().includes(query) ||
      (profile.middleName && profile.middleName.toLowerCase().includes(query)) ||
      profile.contactNumber.toLowerCase().includes(query) ||
      (profile.completeAddress && profile.completeAddress.toLowerCase().includes(query)) ||
      profile.civilStatus.toLowerCase().includes(query)
    );
  }

  get activeCount(): number {
    return this.youthProfiles.filter((profile) => this.isActiveApprovedProfile(profile)).length;
  }

  get inactiveCount(): number {
    return this.youthProfiles.filter((profile) => this.isDeactivatedProfile(profile)).length;
  }

  get approvalProfiles(): YouthMemberListItem[] {
    return this.youthProfiles.filter((profile) => {
      if (this.approvalFilter === 'approved') {
        return this.isActiveApprovedProfile(profile);
      }

      if (this.approvalFilter === 'pending') {
        return this.isPendingProfile(profile);
      }

      if (this.approvalFilter === 'rejected') {
        return this.isRejectedProfile(profile);
      }

      if (this.approvalFilter === 'deactivated') {
        return this.isDeactivatedProfile(profile);
      }

      return true;
    });
  }

  get filteredApprovalProfiles(): YouthMemberListItem[] {
    let profiles = this.approvalProfiles;

    if (!this.approvalSearchQuery.trim()) {
      return profiles;
    }

    const query = this.approvalSearchQuery.toLowerCase();
    return profiles.filter(profile =>
      profile.firstName.toLowerCase().includes(query) ||
      profile.lastName.toLowerCase().includes(query) ||
      (profile.middleName && profile.middleName.toLowerCase().includes(query)) ||
      (profile.email && profile.email.toLowerCase().includes(query)) ||
      profile.contactNumber.toLowerCase().includes(query)
    );
  }

  get deactivatedCount(): number {
    return this.youthProfiles.filter((profile) => this.isDeactivatedProfile(profile)).length;
  }

  get pendingCount(): number {
    return this.youthProfiles.filter((profile) => this.isPendingProfile(profile)).length;
  }

  get approvedCount(): number {
    return this.youthProfiles.filter((profile) => this.isApprovedProfile(profile)).length;
  }

  get rejectedCount(): number {
    return this.youthProfiles.filter((profile) => this.isRejectedProfile(profile)).length;
  }

  get allCount(): number {
    return this.youthProfiles.length;
  }

  openApprovalPanel(): void {
    this.isApprovalPanelOpen = true;
    this.approvalError = '';
    this.approvalMessage = '';
  }

  closeApprovalPanel(): void {
    if (this.updatingApprovalUserId !== null) {
      return;
    }

    this.isApprovalPanelOpen = false;
    this.approvalError = '';
    this.approvalMessage = '';
  }

  setApprovalFilter(filter: 'pending' | 'approved' | 'rejected' | 'deactivated' | 'all'): void {
    this.approvalFilter = filter;
    this.approvalSearchQuery = '';
    this.approvalCurrentPage = 1; // Reset to first page when filter changes
  }

  onApprovalSearch(): void {
    // The filtering is handled by the filteredApprovalProfiles getter
    // This method is here for explicit search button clicks if needed
    this.approvalCurrentPage = 1; // Reset to first page when searching
  }

  get paginatedApprovalProfiles(): YouthMemberListItem[] {
    const startIndex = (this.approvalCurrentPage - 1) * this.approvalItemsPerPage;
    const endIndex = startIndex + this.approvalItemsPerPage;
    return this.filteredApprovalProfiles.slice(startIndex, endIndex);
  }

  get approvalTotalPages(): number {
    return Math.ceil(this.filteredApprovalProfiles.length / this.approvalItemsPerPage);
  }

  get approvalPageNumbers(): (number | string)[] {
    const totalPages = this.approvalTotalPages;
    const currentPage = this.approvalCurrentPage;
    const pages: (number | string)[] = [];

    if (totalPages <= 5) {
      // Show all pages if 5 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Smart pagination with ellipsis
      if (currentPage <= 2) {
        // Near the start: 1 2 3 ... 7
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 1) {
        // Near the end: 1 ... 5 6 7
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        // In the middle: 1 ... 3 4 5 ... 7
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  }

  goToApprovalPage(page: number | string): void {
    if (typeof page === 'string') return; // Ignore ellipsis clicks
    if (page >= 1 && page <= this.approvalTotalPages) {
      this.approvalCurrentPage = page;
    }
  }

  nextApprovalPage(): void {
    if (this.approvalCurrentPage < this.approvalTotalPages) {
      this.approvalCurrentPage++;
    }
  }

  previousApprovalPage(): void {
    if (this.approvalCurrentPage > 1) {
      this.approvalCurrentPage--;
    }
  }

  reactivateFromPanel(profile: YouthMemberListItem): void {
    if (!profile.userId) {
      this.approvalError = 'Unable to reactivate this account.';
      return;
    }

    this.updatingApprovalUserId = profile.userId;
    this.updatingApprovalAction = 'reactivate';
    this.approvalError = '';
    this.approvalMessage = '';

    this.youthMemberManagementService.reactivateUser(profile.userId).subscribe({
      next: () => {
        this.approvalMessage = `Account for ${profile.firstName} ${profile.lastName} has been reactivated successfully!`;
        this.updatingApprovalUserId = null;
        this.updatingApprovalAction = null;

        // Reload profiles to reflect changes
        this.loadYouthProfiles();

        // Clear message after 3 seconds
        setTimeout(() => {
          this.approvalMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error reactivating user:', error);
        this.approvalError = 'Failed to reactivate account. Please try again.';
        this.updatingApprovalUserId = null;
        this.updatingApprovalAction = null;
      }
    });
  }

  setRegistrationApproval(profile: YouthMemberListItem, approve: boolean): void {
    const accountData = this.userAccountByUserId.get(profile.userId);

    if (!profile.userId || !accountData) {
      this.approvalError = 'Unable to update approval status for this account due to incomplete account data.';
      this.approvalMessage = '';
      return;
    }

    this.updatingApprovalUserId = profile.userId;
    this.updatingApprovalAction = 'approve';
    this.approvalError = '';
    this.approvalMessage = '';

    // Get the current SK official's admin ID
    const adminId = Number(localStorage.getItem('sk_official_id') || localStorage.getItem('adminId'));

    const approvalRequest$: Observable<{ userId: number; email: string; roleId: number; active?: boolean; isActive?: boolean; status: 'pending' | 'approved' | 'rejected'; }> = approve
      ? this.youthMemberManagementService.approveUser(profile.userId, adminId)
      : this.youthMemberManagementService.updateUser(profile.userId, {
        email: accountData.email,
        roleId: accountData.roleId,
        active: accountData.isActive,
        status: 'pending'
      });

    approvalRequest$.subscribe({
      next: (updatedUser) => {
        const updatedIsActive = updatedUser.isActive ?? updatedUser.active ?? true;
        const normalizedStatus = this.toApprovalStatus(updatedUser.status);

        this.userAccountByUserId.set(updatedUser.userId, {
          email: updatedUser.email,
          roleId: updatedUser.roleId,
          isActive: updatedIsActive,
          status: normalizedStatus
        });

        this.youthProfiles = this.youthProfiles.map((item) =>
          item.userId === updatedUser.userId
            ? {
              ...item,
              status: normalizedStatus,
              isActive: updatedIsActive,
              email: updatedUser.email
            }
            : item
        );

        this.filteredProfiles = normalizedStatus === 'approved' && updatedIsActive === true
          ? [
            ...this.filteredProfiles.filter((item) => item.userId !== updatedUser.userId),
            {
              userId: updatedUser.userId,
              youthId: profile.youthId,
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: updatedUser.email,
              gender: profile.gender,
              birthday: profile.birthday,
              contactNumber: profile.contactNumber,
              civilStatus: profile.civilStatus,
              isActive: updatedIsActive,
              status: normalizedStatus,
              createdAt: profile.createdAt,
              middleName: profile.middleName,
              suffix: profile.suffix,
              completeAddress: profile.completeAddress,
              youthClassification: profile.youthClassification
            }
          ]
          : this.filteredProfiles.filter((item) => item.userId !== updatedUser.userId);

        const fullName = `${profile.firstName} ${profile.lastName}`.trim();
        this.approvalMessage = approve
          ? `${fullName} has been approved.`
          : `${fullName} has been moved back to pending registration.`;
        this.updatingApprovalUserId = null;
        this.updatingApprovalAction = null;

        this.showNotification(
          approve
            ? `${fullName} has been approved successfully!`
            : `${fullName} has been moved back to pending.`,
          'success'
        );

        setTimeout(() => {
          this.approvalMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error updating approval status:', error);
        this.approvalError = 'Failed to update registration approval status. Please try again.';
        this.updatingApprovalUserId = null;
        this.updatingApprovalAction = null;

        setTimeout(() => {
          this.approvalError = '';
        }, 3000);
      }
    });
  }

  rejectRegistration(profile: YouthMemberListItem): void {
    if (!profile.userId) {
      this.approvalError = 'Unable to reject registration for this account due to missing user ID.';
      this.approvalMessage = '';
      return;
    }

    // Open rejection modal
    this.rejectingUserId = profile.userId;
    this.selectedProfile = profile;
    this.rejectionReason = '';
    this.isRejectModalOpen = true;
  }

  closeRejectModal(): void {
    this.isRejectModalOpen = false;
    this.rejectingUserId = null;
    this.updatingApprovalUserId = null;
    this.updatingApprovalAction = null;
    this.selectedProfile = null;
    this.rejectionReason = '';
  }

  confirmRejectRegistration(): void {
    if (!this.rejectingUserId || !this.selectedProfile) {
      return;
    }

    if (!this.rejectionReason.trim()) {
      this.approvalError = 'Please provide a rejection reason.';
      return;
    }

    this.updatingApprovalUserId = this.rejectingUserId;
    this.updatingApprovalAction = 'reject';
    this.approvalError = '';
    this.approvalMessage = '';

    this.youthMemberManagementService.rejectUser(this.rejectingUserId, this.rejectionReason).subscribe({
      next: (updatedUser) => {
        const updatedIsActive = updatedUser.isActive ?? false;
        const normalizedStatus = this.toApprovalStatus(updatedUser.status);

        this.userAccountByUserId.set(updatedUser.userId, {
          email: updatedUser.email,
          roleId: updatedUser.roleId,
          isActive: updatedIsActive,
          status: normalizedStatus
        });

        this.youthProfiles = this.youthProfiles.map((item) =>
          item.userId === updatedUser.userId
            ? {
              ...item,
              status: normalizedStatus,
              isActive: updatedIsActive,
              email: updatedUser.email
            }
            : item
        );

        this.filteredProfiles = this.filteredProfiles.filter((item) => item.userId !== updatedUser.userId);

        const fullName = `${this.selectedProfile?.firstName} ${this.selectedProfile?.lastName}`.trim();
        this.approvalMessage = `${fullName} has been rejected.`;
        this.updatingApprovalUserId = null;
        this.updatingApprovalAction = null;

        this.showNotification(`${fullName} has been rejected successfully!`, 'success');

        this.closeRejectModal();

        setTimeout(() => {
          this.approvalMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error rejecting registration:', error);
        this.approvalError = 'Failed to reject registration. Please try again.';
        this.updatingApprovalUserId = null;
        this.updatingApprovalAction = null;

        setTimeout(() => {
          this.approvalError = '';
        }, 3000);
      }
    });
  }

  exportToPDF(): void {
    if (this.filteredProfiles.length === 0) {
      alert('No data to export');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 5;
    const cellPaddingX = 0.8;
    const cellPaddingY = 1.1;
    const lineHeight = 3.4;
    let yPosition = 14;

    doc.setFontSize(16);
    doc.setFont('', 'bold');
    doc.text('YOUTH PROFILES REPORT', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont('', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US')} | Total Records: ${this.filteredProfiles.length}`, margin, yPosition);
    yPosition += 6;

    const headers = [
      'First Name', 'Middle Name', 'Last Name', 'Suffix', 'Age', 'Gender', 'Birthday', 'Contact', 'Address',
      'Civil Status', 'Classification', 'Education', 'Work Status', 'SK Voter', 'National Voter', 'Past Voter', 'Assemblies', 'Reason'
    ];
    const widthWeights = [1.25, 1.15, 1.25, 0.65, 0.55, 0.75, 1.05, 1.1, 2.2, 1.0, 1.3, 1.25, 1.05, 0.8, 0.95, 0.85, 0.85, 1.5];
    const totalWeight = widthWeights.reduce((sum, weight) => sum + weight, 0);
    const availableWidth = pageWidth - margin * 2;
    const colWidths = widthWeights.map((weight) => (weight / totalWeight) * availableWidth);

    const wrapText = (value: string, maxWidth: number): string[] => {
      const text = value?.trim() ? value : 'N/A';
      const lines = doc.splitTextToSize(text, maxWidth);
      return lines.length > 0 ? lines : ['N/A'];
    };

    const getRowMetrics = (values: string[], isHeader: boolean) => {
      doc.setFont('', isHeader ? 'bold' : 'normal');
      doc.setFontSize(isHeader ? 7.4 : 6.8);

      const wrapped = values.map((value, index) => wrapText(value, colWidths[index] - cellPaddingX * 2));
      const maxLines = wrapped.reduce((max, lines) => Math.max(max, lines.length), 1);
      const height = Math.max(6, maxLines * lineHeight + cellPaddingY * 2);

      return { wrapped, height };
    };

    const drawRow = (values: string[], isHeader: boolean, isStriped: boolean) => {
      const { wrapped, height } = getRowMetrics(values, isHeader);
      const rowTop = yPosition;
      const rowBottom = rowTop + height;

      if (isHeader) {
        doc.setFillColor(33, 66, 122);
        doc.rect(margin, rowTop, availableWidth, height, 'F');
      } else if (isStriped) {
        doc.setFillColor(245, 247, 250);
        doc.rect(margin, rowTop, availableWidth, height, 'F');
      }

      doc.setDrawColor(180, 190, 205);
      doc.setLineWidth(0.25);
      doc.line(margin, rowTop, margin + availableWidth, rowTop);
      doc.line(margin, rowBottom, margin + availableWidth, rowBottom);

      let x = margin;
      for (let i = 0; i < values.length; i++) {
        const colWidth = colWidths[i];

        doc.line(x, rowTop, x, rowBottom);

        doc.setFont('', isHeader ? 'bold' : 'normal');
        doc.setFontSize(isHeader ? 7.4 : 6.8);
        doc.setTextColor(isHeader ? 255 : 0, isHeader ? 255 : 0, isHeader ? 255 : 0);

        const textLines = wrapped[i];
        let textY = rowTop + cellPaddingY + lineHeight - 0.5;
        textLines.forEach((line) => {
          doc.text(line, x + cellPaddingX, textY, {
            maxWidth: colWidth - cellPaddingX * 2,
            align: 'left'
          });
          textY += lineHeight;
        });

        x += colWidth;
      }

      doc.line(margin + availableWidth, rowTop, margin + availableWidth, rowBottom);
      yPosition = rowBottom;
    };

    const drawHeader = () => {
      drawRow(headers, true, false);
    };

    drawHeader();

    this.filteredProfiles.forEach((profile, rowIndex) => {
      const rowData = [
        profile.firstName || 'N/A',
        profile.middleName || 'N/A',
        profile.lastName || 'N/A',
        profile.suffix || 'N/A',
        this.getAge(profile.birthday).toString(),
        profile.gender || 'N/A',
        profile.birthday ? profile.birthday.substring(0, 10) : 'N/A',
        profile.contactNumber || 'N/A',
        profile.completeAddress || 'N/A',
        profile.civilStatus || 'N/A',
        profile.youthClassification?.youthClassification || 'N/A',
        profile.youthClassification?.educationBackground || 'N/A',
        profile.youthClassification?.workStatus || 'N/A',
        profile.youthClassification?.skVoter ? 'Yes' : 'No',
        profile.youthClassification?.nationalVoter ? 'Yes' : 'No',
        profile.youthClassification?.pastVoter ? 'Yes' : 'No',
        (profile.youthClassification?.numAttended || 0).toString(),
        profile.youthClassification?.nonAttendedReason || 'N/A'
      ];

      const { height } = getRowMetrics(rowData, false);
      if (yPosition + height > pageHeight - 8) {
        doc.addPage();
        yPosition = 10;
        drawHeader();
      }

      drawRow(rowData, false, rowIndex % 2 === 0);
    });

    const dateTime = this.getFormattedDateTime();
    doc.save(`youth-profiles-report-${dateTime}.pdf`);
    this.showNotification('PDF exported successfully!');
  }

  exportToExcel(): void {
    if (this.filteredProfiles.length === 0) {
      alert('No data to export');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Youth Profiles');

    worksheet.columns = [
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Middle Name', key: 'middleName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Suffix', key: 'suffix', width: 10 },
      { header: 'Age', key: 'age', width: 8 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Birthday', key: 'birthday', width: 15 },
      { header: 'Contact Number', key: 'contactNumber', width: 15 },
      { header: 'Complete Address', key: 'completeAddress', width: 30 },
      { header: 'Civil Status', key: 'civilStatus', width: 12 },
      { header: 'Youth Classification', key: 'youthClassification', width: 20 },
      { header: 'Education Background', key: 'educationBackground', width: 20 },
      { header: 'Work Status', key: 'workStatus', width: 15 },
      { header: 'SK Voter', key: 'skVoter', width: 10 },
      { header: 'National Voter', key: 'nationalVoter', width: 12 },
      { header: 'Past Voter', key: 'pastVoter', width: 12 },
      { header: 'Assemblies Attended', key: 'numAttended', width: 15 },
      { header: 'Non-Attendance Reason', key: 'nonAttendedReason', width: 25 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    this.filteredProfiles.forEach((profile) => {
      worksheet.addRow({
        firstName: profile.firstName,
        middleName: profile.middleName || 'N/A',
        lastName: profile.lastName,
        suffix: profile.suffix || 'N/A',
        age: this.getAge(profile.birthday),
        gender: profile.gender,
        birthday: this.formatDate(profile.birthday),
        contactNumber: profile.contactNumber,
        completeAddress: profile.completeAddress || 'N/A',
        civilStatus: profile.civilStatus,
        youthClassification: profile.youthClassification?.youthClassification || 'N/A',
        educationBackground: profile.youthClassification?.educationBackground || 'N/A',
        workStatus: profile.youthClassification?.workStatus || 'N/A',
        skVoter: profile.youthClassification?.skVoter ? 'Yes' : 'No',
        nationalVoter: profile.youthClassification?.nationalVoter ? 'Yes' : 'No',
        pastVoter: profile.youthClassification?.pastVoter ? 'Yes' : 'No',
        numAttended: profile.youthClassification?.numAttended || 0,
        nonAttendedReason: profile.youthClassification?.nonAttendedReason || 'N/A'
      });
    });

    worksheet.eachRow((row: ExcelJS.Row) => {
      row.alignment = { horizontal: 'left', vertical: 'middle' };
      row.eachCell((cell: ExcelJS.Cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    workbook.xlsx.writeBuffer().then((data: ArrayBuffer) => {
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateTime = this.getFormattedDateTime();
      link.download = `youth-profiles-report-${dateTime}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      this.showNotification('Excel exported successfully!');
    });
  }

  getFullName(profile: YouthMemberListItem): string {
    const parts = [profile.firstName, profile.middleName, profile.lastName].filter(Boolean);
    return parts.join(' ');
  }

  getAge(birthday: string): number {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  formatDate(dateString: string): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  }

  getFormattedDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
  }

  onEdit(profile: YouthMemberListItem): void {
    const normalizedGender = (profile.gender || '').toString().toUpperCase();
    const normalizedCivilStatus = (profile.civilStatus || '').toString().toUpperCase();
    const normalizedSuffix = (profile.suffix || '').toString().toUpperCase();
    const normalizedYouthClassification = (profile.youthClassification?.youthClassification || '').toString().toUpperCase();
    const normalizedEducationBackground = (profile.youthClassification?.educationBackground || '').toString().toUpperCase();
    const normalizedWorkStatus = (profile.youthClassification?.workStatus || '').toString().toUpperCase();

    this.selectedProfile = profile;
    this.editForm.patchValue({
      firstName: profile.firstName,
      middleName: profile.middleName || '',
      lastName: profile.lastName,
      suffix: normalizedSuffix,
      gender: normalizedGender,
      birthday: profile.birthday ? profile.birthday.substring(0, 10) : '',
      contactNumber: profile.contactNumber,
      civilStatus: normalizedCivilStatus,
      completeAddress: profile.completeAddress || '',
      youthClassification: normalizedYouthClassification,
      educationBackground: normalizedEducationBackground,
      workStatus: normalizedWorkStatus,
      skVoter: profile.youthClassification?.skVoter ?? false,
      nationalVoter: profile.youthClassification?.nationalVoter ?? false,
      pastVoter: profile.youthClassification?.pastVoter ?? false,
      numberOfAttendedAssemblies: profile.youthClassification?.numAttended ?? 0,
      reason: profile.youthClassification?.nonAttendedReason || ''
    });
    this.isEditModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
    setTimeout(() => this.setupScrollIndicators(), 100);
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.selectedProfile = null;
    this.editForm.reset({ numberOfAttendedAssemblies: 0 });
    this.errorMessage = '';
    this.successMessage = '';
  }

  submitEditForm(): void {
    if (this.editForm.invalid || !this.selectedProfile) {
      return;
    }

    const formValue = this.editForm.value;

    this.pendingEditPayload = {
      firstName: formValue.firstName,
      middleName: formValue.middleName || null,
      lastName: formValue.lastName,
      suffix: formValue.suffix || null,
      gender: formValue.gender,
      birthday: formValue.birthday,
      contactNumber: formValue.contactNumber,
      completeAddress: formValue.completeAddress,
      civilStatus: formValue.civilStatus,
      youthClassification: {
        youthClassification: formValue.youthClassification,
        educationBackground: formValue.educationBackground,
        workStatus: formValue.workStatus,
        skVoter: formValue.skVoter ?? false,
        nationalVoter: formValue.nationalVoter ?? false,
        pastVoter: formValue.pastVoter ?? false,
        numAttended: Number(formValue.numberOfAttendedAssemblies || 0),
        nonAttendedReason: formValue.reason
      }
    };

    this.isEditConfirmationModalOpen = true;
  }

  confirmEditSubmission(): void {
    if (!this.selectedProfile || !this.pendingEditPayload) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.youthMemberManagementService.updateYouthProfile(this.selectedProfile.youthId, this.pendingEditPayload).subscribe({
      next: () => {
        const fullName = `${this.selectedProfile?.firstName} ${this.selectedProfile?.lastName}`;
        this.showNotification(`Profile for ${fullName} has been updated successfully!`);
        this.isSubmitting = false;
        this.closeEditConfirmationModal();
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.errorMessage = 'Failed to update profile. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  closeEditConfirmationModal(): void {
    this.isEditConfirmationModalOpen = false;
    this.pendingEditPayload = null;
    this.closeEditModal();
    this.loadYouthProfiles();
  }

  onDeactivate(profile: YouthMemberListItem): void {
    this.selectedProfile = profile;
    this.isDeactivateConfirmationModalOpen = true;
  }

  onReactivate(profile: YouthMemberListItem): void {
    this.selectedProfile = profile;
    this.isReactivateConfirmationModalOpen = true;
  }

  closeReactivateConfirmationModal(): void {
    this.isReactivateConfirmationModalOpen = false;
    this.selectedProfile = null;
  }

  confirmReactivateSubmission(): void {
    if (!this.selectedProfile) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.youthMemberManagementService.reactivateUser(this.selectedProfile.userId).subscribe({
      next: () => {
        this.showNotification(`Account for ${this.selectedProfile?.firstName} ${this.selectedProfile?.lastName} has been reactivated successfully`, 'success');
        this.isSubmitting = false;
        this.closeReactivateConfirmationModal();
        this.loadYouthProfiles();
      },
      error: (error) => {
        console.error('Error reactivating user:', error);
        this.errorMessage = 'Failed to reactivate account. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  closeDeactivateConfirmationModal(): void {
    this.isDeactivateConfirmationModalOpen = false;
    this.selectedProfile = null;
  }

  confirmDeactivateSubmission(): void {
    if (!this.selectedProfile) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.youthMemberManagementService.deactivateYouthProfile(this.selectedProfile.youthId).subscribe({
      next: () => {
        const fullName = `${this.selectedProfile?.firstName} ${this.selectedProfile?.lastName}`;
        this.showNotification(`Profile for ${fullName} has been deactivated successfully!`);
        this.isSubmitting = false;
        this.closeDeactivateConfirmationModal();
        this.loadYouthProfiles();
      },
      error: (error) => {
        console.error('Error deactivating profile:', error);
        this.errorMessage = 'Failed to deactivate profile. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  openDetailsModal(profile: YouthMemberListItem): void {
    this.selectedProfile = profile;
    this.isDetailsModalOpen = true;
    setTimeout(() => this.setupScrollIndicators(), 100);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen = false;
    this.selectedProfile = null;
  }

  approveFromDetailsModal(): void {
    if (this.selectedProfile) {
      const accountData = this.userAccountByUserId.get(this.selectedProfile.userId);

      if (!this.selectedProfile.userId || !accountData) {
        this.approvalError = 'Unable to update approval status for this account due to incomplete account data.';
        this.approvalMessage = '';
        return;
      }

      this.updatingApprovalUserId = this.selectedProfile.userId;
      this.updatingApprovalAction = 'approve';
      this.approvalError = '';
      this.approvalMessage = '';

      const adminId = Number(localStorage.getItem('sk_official_id') || localStorage.getItem('adminId'));

      this.youthMemberManagementService.approveUser(this.selectedProfile.userId, adminId).subscribe({
        next: (updatedUser) => {
          const updatedIsActive = updatedUser.isActive ?? true;
          const normalizedStatus = this.toApprovalStatus(updatedUser.status);

          this.userAccountByUserId.set(updatedUser.userId, {
            email: updatedUser.email,
            roleId: updatedUser.roleId,
            isActive: updatedIsActive,
            status: normalizedStatus
          });

          this.youthProfiles = this.youthProfiles.map((item) =>
            item.userId === updatedUser.userId
              ? {
                ...item,
                status: normalizedStatus,
                isActive: updatedIsActive,
                email: updatedUser.email
              }
              : item
          );

          this.filteredProfiles = normalizedStatus === 'approved' && updatedIsActive === true
            ? [
              ...this.filteredProfiles.filter((item) => item.userId !== updatedUser.userId),
              {
                userId: updatedUser.userId,
                youthId: this.selectedProfile!.youthId,
                firstName: this.selectedProfile!.firstName,
                lastName: this.selectedProfile!.lastName,
                email: updatedUser.email,
                gender: this.selectedProfile!.gender,
                birthday: this.selectedProfile!.birthday,
                contactNumber: this.selectedProfile!.contactNumber,
                civilStatus: this.selectedProfile!.civilStatus,
                isActive: updatedIsActive,
                status: normalizedStatus,
                createdAt: this.selectedProfile!.createdAt,
                middleName: this.selectedProfile!.middleName,
                suffix: this.selectedProfile!.suffix,
                completeAddress: this.selectedProfile!.completeAddress,
                youthClassification: this.selectedProfile!.youthClassification
              }
            ]
            : this.filteredProfiles.filter((item) => item.userId !== updatedUser.userId);

          const fullName = `${this.selectedProfile?.firstName} ${this.selectedProfile?.lastName}`.trim();
          this.approvalMessage = `${fullName} has been approved.`;
          this.updatingApprovalUserId = null;
          this.updatingApprovalAction = null;

          this.showNotification(`${fullName} has been approved successfully!`, 'success');

          // Close the details modal after successful approval
          this.closeDetailsModal();

          setTimeout(() => {
            this.approvalMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Error updating approval status:', error);
          this.approvalError = 'Failed to update registration approval status. Please try again.';
          this.updatingApprovalUserId = null;
          this.updatingApprovalAction = null;

          setTimeout(() => {
            this.approvalError = '';
          }, 3000);
        }
      });
    }
  }

  rejectFromDetailsModal(): void {
    if (this.selectedProfile) {
      // Store the profile temporarily
      const profileToReject = this.selectedProfile;
      // Close the details modal first
      this.closeDetailsModal();
      // Small delay to ensure smooth transition between modals
      setTimeout(() => {
        this.rejectRegistration(profileToReject);
      }, 100);
    }
  }

  openYouthDetailsModal(profile: YouthMemberListItem): void {
    this.selectedYouthProfile = profile;
    this.isYouthDetailsModalOpen = true;
    setTimeout(() => this.setupScrollIndicators(), 100);
  }

  closeYouthDetailsModal(): void {
    this.isYouthDetailsModalOpen = false;
    this.selectedYouthProfile = null;
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const id = ++this.notificationCounter;
    this.notifications = [...this.notifications, { id, message, type }];
    setTimeout(() => {
      this.notifications = this.notifications.filter(notification => notification.id !== id);
    }, 3000);
  }

  // TrackBy functions for optimal rendering
  trackByYouthId(index: number, profile: YouthMemberListItem): number {
    return profile.youthId;
  }

  trackByUserId(index: number, profile: YouthMemberListItem): number {
    return profile.userId;
  }
}
