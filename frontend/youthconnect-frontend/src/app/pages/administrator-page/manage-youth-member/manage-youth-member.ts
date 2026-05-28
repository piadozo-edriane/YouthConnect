import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { DeleteYouthMemberFeature } from '../feature/delete-youth-member-feature/delete-youth-member-feature';
import {
  EditYouthMemberFeature,
  UpdateYouthMemberPayload
} from '../feature/edit-youth-member-feature/edit-youth-member-feature';
import {
  YouthMemberListItem,
  YouthMemberManagementService,
  YouthProfileAccount,
  YouthUserAccount
} from '../../../services/youth-member-management.service';
import { UserApprovalService } from '../../../services/user-approval.service';

@Component({
  selector: 'app-manage-youth-member',
  standalone: true,
  imports: [CommonModule, FormsModule, EditYouthMemberFeature, DeleteYouthMemberFeature],
  templateUrl: './manage-youth-member.html',
  styleUrl: './manage-youth-member.scss',
})
export class ManageYouthMember implements OnInit {
  private youthMemberManagementService = inject(YouthMemberManagementService);
  private userApprovalService = inject(UserApprovalService);
  readonly itemsPerPage = 9;

  youthMembers: YouthMemberListItem[] = [];
  searchTerm = '';
  currentPage = 1;
  isLoading = false;
  errorMessage: string | null = null;

  showEditModal = false;
  editingYouthMember: YouthMemberListItem | null = null;
  isEditingYouthMember = false;
  editYouthMemberErrorMessage: string | null = null;
  showEditSuccessModal = false;
  editSuccessMessage = '';

  showDeleteModal = false;
  deletingYouthMember: YouthMemberListItem | null = null;
  isDeletingYouthMember = false;
  deleteYouthMemberErrorMessage: string | null = null;
  showDeleteSuccessModal = false;
  deleteSuccessMessage = '';

  showApproveModal = false;
  approvingYouthMember: YouthMemberListItem | null = null;
  isApprovingYouthMember = false;
  approveYouthMemberErrorMessage: string | null = null;
  showApproveSuccessModal = false;
  approveSuccessMessage = '';

  showRejectModal = false;
  rejectingYouthMember: YouthMemberListItem | null = null;
  rejectionReason = '';
  isRejectingYouthMember = false;
  rejectYouthMemberErrorMessage: string | null = null;
  showRejectSuccessModal = false;
  rejectSuccessMessage = '';

  showActivateModal = false;
  activatingYouthMember: YouthMemberListItem | null = null;
  isActivatingYouthMember = false;
  activateYouthMemberErrorMessage: string | null = null;
  showActivateSuccessModal = false;
  activateSuccessMessage = '';

  showDeactivateModal = false;
  deactivatingYouthMember: YouthMemberListItem | null = null;
  isDeactivatingYouthMember = false;
  deactivateYouthMemberErrorMessage: string | null = null;
  showDeactivateSuccessModal = false;
  deactivateSuccessMessage = '';

  ngOnInit(): void {
    this.loadYouthMembers();
  }

  get filteredYouthMembers(): YouthMemberListItem[] {
    const normalizedSearchTerm = this.searchTerm.trim().toLowerCase();
    if (!normalizedSearchTerm) {
      return this.youthMembers;
    }

    return this.youthMembers.filter((youthMember) => {
      const fullName = this.getFullName(youthMember).toLowerCase();
      const statusText = this.getStatusLabel(youthMember.isActive).toLowerCase();
      return (
        String(youthMember.youthId).includes(normalizedSearchTerm)
        || fullName.includes(normalizedSearchTerm)
        || (youthMember.email ?? '').toLowerCase().includes(normalizedSearchTerm)
        || statusText.includes(normalizedSearchTerm)
      );
    });
  }

  get paginatedYouthMembers(): YouthMemberListItem[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredYouthMembers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredYouthMembers.length / this.itemsPerPage);
  }

  get paginationItems(): Array<number | string> {
    const total = this.totalPages;

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    const pages = new Set<number>([1, total]);
    pages.add(this.currentPage - 1);
    pages.add(this.currentPage);
    pages.add(this.currentPage + 1);

    const sortedPages = Array.from(pages)
      .filter((page) => page >= 1 && page <= total)
      .sort((left, right) => left - right);

    const condensed: Array<number | string> = [];

    for (let index = 0; index < sortedPages.length; index += 1) {
      const page = sortedPages[index];
      const previousPage = sortedPages[index - 1];

      if (index > 0 && page - previousPage > 1) {
        condensed.push('...');
      }

      condensed.push(page);
    }

    return condensed;
  }

  getFullName(youthMember: YouthMemberListItem): string {
    const firstName = youthMember.firstName?.trim() ?? '';
    const lastName = youthMember.lastName?.trim() ?? '';
    return `${firstName} ${lastName}`.trim();
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Active' : 'Deactivated';
  }

  onSearchTermChange(): void {
    this.currentPage = 1;
  }

  goToFirstPage(): void {
    if (this.totalPages === 0) {
      return;
    }

    this.currentPage = 1;
  }

  goToPreviousPage(): void {
    if (this.currentPage <= 1) {
      return;
    }

    this.currentPage -= 1;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
  }

  goToNextPage(): void {
    if (this.currentPage >= this.totalPages) {
      return;
    }

    this.currentPage += 1;
  }

  goToLastPage(): void {
    if (this.totalPages === 0) {
      return;
    }

    this.currentPage = this.totalPages;
  }

  isPaginationNumber(item: number | string): item is number {
    return typeof item === 'number';
  }

  editYouthMember(youthMember: YouthMemberListItem): void {
    this.editingYouthMember = youthMember;
    this.showEditModal = true;
    this.editYouthMemberErrorMessage = null;
  }

  closeEditYouthMemberModal(): void {
    if (this.isEditingYouthMember) {
      return;
    }

    this.showEditModal = false;
    this.editingYouthMember = null;
    this.editYouthMemberErrorMessage = null;
  }

  updateYouthMember(payload: UpdateYouthMemberPayload): void {
    if (!this.editingYouthMember) {
      return;
    }

    this.isEditingYouthMember = true;
    this.editYouthMemberErrorMessage = null;

    const editingItem = this.editingYouthMember;

    forkJoin({
      updatedUser: this.youthMemberManagementService.updateUser(editingItem.userId, payload.user),
      updatedProfile: this.youthMemberManagementService.updateYouthProfile(editingItem.youthId, payload.profile)
    }).subscribe({
      next: ({ updatedUser, updatedProfile }) => {
        const updatedIsActive = updatedUser.isActive ?? true;

        const updatedMember: YouthMemberListItem = {
          userId: updatedUser.userId,
          youthId: updatedProfile.youthId,
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          email: updatedUser.email,
          gender: updatedProfile.gender,
          birthday: updatedProfile.birthday,
          contactNumber: updatedProfile.contactNumber,
          civilStatus: updatedProfile.civilStatus,
          isActive: updatedIsActive,
          status: updatedUser.status ?? 'pending',
          createdAt: updatedUser.createdAt,
          middleName: updatedProfile.middleName,
          suffix: updatedProfile.suffix,
          completeAddress: updatedProfile.completeAddress
        };

        this.youthMembers = this.youthMembers.map((item) =>
          item.userId === updatedMember.userId ? updatedMember : item
        );

        this.showEditModal = false;
        this.editingYouthMember = null;
        this.editYouthMemberErrorMessage = null;
        this.isEditingYouthMember = false;
        this.editSuccessMessage = 'Youth member has been updated successfully.';
        this.showEditSuccessModal = true;
      },
      error: (error: HttpErrorResponse) => {
        this.editYouthMemberErrorMessage = this.extractUpdateYouthMemberErrorMessage(error);
        this.isEditingYouthMember = false;
      }
    });
  }

  closeEditSuccessModal(): void {
    this.showEditSuccessModal = false;
    this.editSuccessMessage = '';
  }

  openDeleteYouthMemberModal(youthMember: YouthMemberListItem): void {
    this.deletingYouthMember = youthMember;
    this.showDeleteModal = true;
    this.deleteYouthMemberErrorMessage = null;
  }

  closeDeleteYouthMemberModal(): void {
    if (this.isDeletingYouthMember) {
      return;
    }

    this.showDeleteModal = false;
    this.deletingYouthMember = null;
    this.deleteYouthMemberErrorMessage = null;
  }

  confirmDeleteYouthMember(): void {
    if (!this.deletingYouthMember) {
      return;
    }

    this.isDeletingYouthMember = true;
    this.deleteYouthMemberErrorMessage = null;

    const youthId = this.deletingYouthMember.youthId;
    const youthName = this.getFullName(this.deletingYouthMember) || 'Youth member';

    this.youthMemberManagementService.deleteYouthProfile(youthId).subscribe({
      next: () => {
        this.youthMembers = this.youthMembers.filter((item) => item.youthId !== youthId);
        this.ensureCurrentPageWithinBounds();
        this.showDeleteModal = false;
        this.deletingYouthMember = null;
        this.isDeletingYouthMember = false;
        this.deleteSuccessMessage = `${youthName} has been deleted successfully.`;
        this.showDeleteSuccessModal = true;
      },
      error: (error: HttpErrorResponse) => {
        this.deleteYouthMemberErrorMessage = this.extractDeleteYouthMemberErrorMessage(error);
        this.isDeletingYouthMember = false;
      }
    });
  }

  closeDeleteSuccessModal(): void {
    this.showDeleteSuccessModal = false;
    this.deleteSuccessMessage = '';
  }

  openApproveYouthMemberModal(youthMember: YouthMemberListItem): void {
    this.approvingYouthMember = youthMember;
    this.showApproveModal = true;
    this.approveYouthMemberErrorMessage = null;
  }

  closeApproveYouthMemberModal(): void {
    if (this.isApprovingYouthMember) {
      return;
    }

    this.showApproveModal = false;
    this.approvingYouthMember = null;
    this.approveYouthMemberErrorMessage = null;
  }

  confirmApproveYouthMember(): void {
    if (!this.approvingYouthMember) {
      return;
    }

    this.isApprovingYouthMember = true;
    this.approveYouthMemberErrorMessage = null;

    const userId = this.approvingYouthMember.userId;
    const youthName = this.getFullName(this.approvingYouthMember) || 'Youth member';

    this.userApprovalService.approveUser(userId).subscribe({
      next: () => {
        // Update the youth member status in the list
        this.youthMembers = this.youthMembers.map((item) =>
          item.userId === userId ? { ...item, status: 'approved', isActive: true } : item
        );

        this.showApproveModal = false;
        this.approvingYouthMember = null;
        this.isApprovingYouthMember = false;
        this.approveSuccessMessage = `${youthName} has been approved successfully. An email notification has been sent.`;
        this.showApproveSuccessModal = true;
      },
      error: (error: HttpErrorResponse) => {
        this.approveYouthMemberErrorMessage = this.extractApprovalErrorMessage(error);
        this.isApprovingYouthMember = false;
      }
    });
  }

  closeApproveSuccessModal(): void {
    this.showApproveSuccessModal = false;
    this.approveSuccessMessage = '';
  }

  openRejectYouthMemberModal(youthMember: YouthMemberListItem): void {
    this.rejectingYouthMember = youthMember;
    this.rejectionReason = '';
    this.showRejectModal = true;
    this.rejectYouthMemberErrorMessage = null;
  }

  closeRejectYouthMemberModal(): void {
    if (this.isRejectingYouthMember) {
      return;
    }

    this.showRejectModal = false;
    this.rejectingYouthMember = null;
    this.rejectionReason = '';
    this.rejectYouthMemberErrorMessage = null;
  }

  confirmRejectYouthMember(): void {
    if (!this.rejectingYouthMember) {
      return;
    }

    if (!this.rejectionReason.trim()) {
      this.rejectYouthMemberErrorMessage = 'Please provide a reason for rejection.';
      return;
    }

    this.isRejectingYouthMember = true;
    this.rejectYouthMemberErrorMessage = null;

    const userId = this.rejectingYouthMember.userId;
    const youthName = this.getFullName(this.rejectingYouthMember) || 'Youth member';

    this.userApprovalService.rejectUser(userId, this.rejectionReason).subscribe({
      next: () => {
        // Update the youth member status in the list
        this.youthMembers = this.youthMembers.map((item) =>
          item.userId === userId ? { ...item, status: 'rejected', isActive: false } : item
        );

        this.showRejectModal = false;
        this.rejectingYouthMember = null;
        this.rejectionReason = '';
        this.isRejectingYouthMember = false;
        this.rejectSuccessMessage = `${youthName} has been rejected. An email notification has been sent.`;
        this.showRejectSuccessModal = true;
      },
      error: (error: HttpErrorResponse) => {
        this.rejectYouthMemberErrorMessage = this.extractApprovalErrorMessage(error);
        this.isRejectingYouthMember = false;
      }
    });
  }

  closeRejectSuccessModal(): void {
    this.showRejectSuccessModal = false;
    this.rejectSuccessMessage = '';
  }

  openActivateYouthMemberModal(youthMember: YouthMemberListItem): void {
    this.activatingYouthMember = youthMember;
    this.showActivateModal = true;
    this.activateYouthMemberErrorMessage = null;
  }

  closeActivateYouthMemberModal(): void {
    if (this.isActivatingYouthMember) {
      return;
    }

    this.showActivateModal = false;
    this.activatingYouthMember = null;
    this.activateYouthMemberErrorMessage = null;
  }

  confirmActivateYouthMember(): void {
    if (!this.activatingYouthMember) {
      return;
    }

    this.isActivatingYouthMember = true;
    this.activateYouthMemberErrorMessage = null;

    const userId = this.activatingYouthMember.userId;
    const youthName = this.getFullName(this.activatingYouthMember) || 'Youth member';

    this.youthMemberManagementService.reactivateUser(userId).subscribe({
      next: (updatedUser) => {
        this.youthMembers = this.youthMembers.map((item) =>
          item.userId === userId ? { ...item, isActive: updatedUser.isActive } : item
        );

        this.showActivateModal = false;
        this.activatingYouthMember = null;
        this.isActivatingYouthMember = false;
        this.activateSuccessMessage = `${youthName} has been activated successfully.`;
        this.showActivateSuccessModal = true;
      },
      error: (error: HttpErrorResponse) => {
        this.activateYouthMemberErrorMessage = this.extractActivateDeactivateErrorMessage(error);
        this.isActivatingYouthMember = false;
      }
    });
  }

  closeActivateSuccessModal(): void {
    this.showActivateSuccessModal = false;
    this.activateSuccessMessage = '';
  }

  openDeactivateYouthMemberModal(youthMember: YouthMemberListItem): void {
    this.deactivatingYouthMember = youthMember;
    this.showDeactivateModal = true;
    this.deactivateYouthMemberErrorMessage = null;
  }

  closeDeactivateYouthMemberModal(): void {
    if (this.isDeactivatingYouthMember) {
      return;
    }

    this.showDeactivateModal = false;
    this.deactivatingYouthMember = null;
    this.deactivateYouthMemberErrorMessage = null;
  }

  confirmDeactivateYouthMember(): void {
    if (!this.deactivatingYouthMember) {
      return;
    }

    this.isDeactivatingYouthMember = true;
    this.deactivateYouthMemberErrorMessage = null;

    const userId = this.deactivatingYouthMember.userId;
    const youthName = this.getFullName(this.deactivatingYouthMember) || 'Youth member';

    this.youthMemberManagementService.deactivateUser(userId).subscribe({
      next: (updatedUser) => {
        this.youthMembers = this.youthMembers.map((item) =>
          item.userId === userId ? { ...item, isActive: updatedUser.isActive } : item
        );

        this.showDeactivateModal = false;
        this.deactivatingYouthMember = null;
        this.isDeactivatingYouthMember = false;
        this.deactivateSuccessMessage = `${youthName} has been deactivated successfully.`;
        this.showDeactivateSuccessModal = true;
      },
      error: (error: HttpErrorResponse) => {
        this.deactivateYouthMemberErrorMessage = this.extractActivateDeactivateErrorMessage(error);
        this.isDeactivatingYouthMember = false;
      }
    });
  }

  closeDeactivateSuccessModal(): void {
    this.showDeactivateSuccessModal = false;
    this.deactivateSuccessMessage = '';
  }

  private extractActivateDeactivateErrorMessage(error: HttpErrorResponse): string {
    const responseBody = error?.error;

    if (typeof responseBody === 'string' && responseBody.trim() !== '') {
      return responseBody;
    }

    if (responseBody && typeof responseBody === 'object' && typeof responseBody.message === 'string') {
      return responseBody.message;
    }

    return 'Unable to process request right now.';
  }

  private extractApprovalErrorMessage(error: HttpErrorResponse): string {
    const responseBody = error?.error;

    if (typeof responseBody === 'string' && responseBody.trim() !== '') {
      return responseBody;
    }

    if (responseBody && typeof responseBody === 'object' && typeof responseBody.error === 'string') {
      return responseBody.error;
    }

    return 'Unable to process request right now.';
  }

  private extractUpdateYouthMemberErrorMessage(error: HttpErrorResponse): string {
    const duplicateFieldMessage = this.extractDuplicateFieldErrorMessage(error);

    if (duplicateFieldMessage) {
      return duplicateFieldMessage;
    }

    const responseBody = error?.error;

    if (typeof responseBody === 'string' && responseBody.trim() !== '') {
      return responseBody;
    }

    if (responseBody && typeof responseBody === 'object' && typeof responseBody.message === 'string') {
      return responseBody.message;
    }

    return 'Unable to update youth member right now.';
  }

  private extractDuplicateFieldErrorMessage(error: HttpErrorResponse): string | null {
    const responseBody = error?.error;
    const responseText = typeof responseBody === 'string'
      ? responseBody
      : typeof responseBody?.message === 'string'
        ? responseBody.message
        : '';

    if (!responseText) {
      return null;
    }

    const duplicateFieldMatch = responseText.match(/(?:key|constraint)\s*[\["']?(username|email)[\]"']?/i);

    if (!duplicateFieldMatch) {
      return null;
    }

    const fieldName = duplicateFieldMatch[1].toLowerCase();
    return fieldName === 'username'
      ? 'Username is already in use.'
      : 'Email is already in use.';
  }

  private extractDeleteYouthMemberErrorMessage(error: HttpErrorResponse): string {
    const responseBody = error?.error;

    if (typeof responseBody === 'string' && responseBody.trim() !== '') {
      return responseBody;
    }

    if (responseBody && typeof responseBody === 'object' && typeof responseBody.message === 'string') {
      return responseBody.message;
    }

    return 'Unable to delete youth member right now.';
  }

  private loadYouthMembers(): void {
    this.isLoading = true;
    this.errorMessage = null;

    forkJoin({
      users: this.youthMemberManagementService.getUsers(),
      profiles: this.youthMemberManagementService.getYouthProfiles()
    }).subscribe({
      next: ({ users, profiles }) => {
        this.youthMembers = this.mapYouthMembers(users, profiles);
        this.ensureCurrentPageWithinBounds();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load youth members right now.';
        this.isLoading = false;
      }
    });
  }

  private mapYouthMembers(users: YouthUserAccount[], profiles: YouthProfileAccount[]): YouthMemberListItem[] {
    if (!Array.isArray(users) || !Array.isArray(profiles)) {
      return [];
    }

    const profileByYouthId = new Map<number, YouthProfileAccount>();
    profiles.forEach((profile) => {
      profileByYouthId.set(profile.youthId, profile);
    });

    return users
      .filter((user) => user.roleId === 1)
      .map((user) => {
        const profile = profileByYouthId.get(user.youthId);
        if (!profile) {
          return null;
        }

        return {
          userId: user.userId,
          youthId: user.youthId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: user.email,
          gender: profile.gender,
          birthday: profile.birthday,
          contactNumber: profile.contactNumber,
          civilStatus: profile.civilStatus,
          isActive: user.isActive ?? true,
          status: user.status ?? 'pending',
          createdAt: user.createdAt,
          middleName: profile.middleName,
          suffix: profile.suffix,
          completeAddress: profile.completeAddress
        } as YouthMemberListItem;
      })
      .filter((item): item is YouthMemberListItem => item !== null)
      .sort((left, right) => left.youthId - right.youthId);
  }

  private ensureCurrentPageWithinBounds(): void {
    const totalPages = this.totalPages;

    if (totalPages === 0) {
      this.currentPage = 1;
      return;
    }

    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
      return;
    }

    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
  }

}
