import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CreateSkOfficialPayload,
  SkOfficialAccount,
  SkOfficialManagementService,
  UpdateSkOfficialPayload
} from '../../../services/sk-official-management.service';
import { AddSkOfficialFeature } from '../feature/add-sk-official-feature/add-sk-official-feature';
import { DeleteSkOfficialFeature } from '../feature/delete-sk-official-feature/delete-sk-official-feature';
import { EditSkOfficialFeature } from '../feature/edit-sk-official-feature/edit-sk-official-feature';

@Component({
  selector: 'app-manage-sk-officials',
  standalone: true,
  imports: [CommonModule, FormsModule, AddSkOfficialFeature, EditSkOfficialFeature, DeleteSkOfficialFeature],
  templateUrl: './manage-sk-officials.html',
  styleUrl: './manage-sk-officials.scss',
})
export class ManageSkOfficials implements OnInit {
  private skOfficialManagementService = inject(SkOfficialManagementService);
  readonly itemsPerPage = 9;

  skOfficials: SkOfficialAccount[] = [];
  searchTerm = '';
  currentPage = 1;
  isLoading = false;
  errorMessage: string | null = null;

  showAddModal = false;
  isCreatingSkOfficial = false;
  addSkOfficialErrorMessage: string | null = null;

  showEditModal = false;
  editingSkOfficial: SkOfficialAccount | null = null;
  isEditingSkOfficial = false;
  editSkOfficialErrorMessage: string | null = null;
  showEditSuccessModal = false;
  editSuccessMessage = '';

  showDeleteModal = false;
  deletingSkOfficial: SkOfficialAccount | null = null;
  isDeletingSkOfficial = false;
  deleteSkOfficialErrorMessage: string | null = null;
  showDeleteSuccessModal = false;
  deleteSuccessMessage = '';

  showActivateModal = false;
  activatingSkOfficial: SkOfficialAccount | null = null;
  isActivatingSkOfficial = false;
  activateSkOfficialErrorMessage: string | null = null;
  showActivateSuccessModal = false;
  activateSuccessMessage = '';

  showDeactivateModal = false;
  deactivatingSkOfficial: SkOfficialAccount | null = null;
  isDeactivatingSkOfficial = false;
  deactivateSkOfficialErrorMessage: string | null = null;
  showDeactivateSuccessModal = false;
  deactivateSuccessMessage = '';

  ngOnInit(): void {
    this.loadSkOfficials();
  }

  get filteredSkOfficials(): SkOfficialAccount[] {
    const normalizedSearchTerm = this.searchTerm.trim().toLowerCase();
    if (!normalizedSearchTerm) {
      return this.skOfficials;
    }

    return this.skOfficials.filter((skOfficial) => {
      const fullName = this.getFullName(skOfficial).toLowerCase();
      const statusText = this.getStatusLabel(this.getIsActive(skOfficial)).toLowerCase();
      return (
        String(skOfficial.adminId).includes(normalizedSearchTerm)
        || fullName.includes(normalizedSearchTerm)
        || (skOfficial.email ?? '').toLowerCase().includes(normalizedSearchTerm)
        || statusText.includes(normalizedSearchTerm)
      );
    });
  }

  get paginatedSkOfficials(): SkOfficialAccount[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredSkOfficials.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredSkOfficials.length / this.itemsPerPage);
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

  getFullName(skOfficial: SkOfficialAccount): string {
    const firstName = skOfficial.firstName?.trim() ?? '';
    const lastName = skOfficial.lastName?.trim() ?? '';
    const suffix = skOfficial.suffix?.trim() ?? '';

    return `${firstName} ${lastName}${suffix ? ` ${suffix}` : ''}`.trim();
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

  openAddSkOfficialModal(): void {
    this.showAddModal = true;
    this.addSkOfficialErrorMessage = null;
  }

  closeAddSkOfficialModal(): void {
    if (this.isCreatingSkOfficial) {
      return;
    }

    this.showAddModal = false;
    this.addSkOfficialErrorMessage = null;
  }

  createSkOfficial(payload: CreateSkOfficialPayload): void {
    this.isCreatingSkOfficial = true;
    this.addSkOfficialErrorMessage = null;

    this.skOfficialManagementService.createSkOfficial(payload).subscribe({
      next: (newSkOfficial) => {
        this.skOfficials = [...this.skOfficials, newSkOfficial].sort((left, right) => left.adminId - right.adminId);
        this.ensureCurrentPageWithinBounds();
        this.showAddModal = false;
        this.addSkOfficialErrorMessage = null;
        this.isCreatingSkOfficial = false;
      },
      error: (error: HttpErrorResponse) => {
        this.addSkOfficialErrorMessage = this.extractCreateSkOfficialErrorMessage(error);
        this.isCreatingSkOfficial = false;
      }
    });
  }

  editSkOfficial(skOfficial: SkOfficialAccount): void {
    this.editingSkOfficial = skOfficial;
    this.showEditModal = true;
    this.editSkOfficialErrorMessage = null;
  }

  closeEditSkOfficialModal(): void {
    if (this.isEditingSkOfficial) {
      return;
    }

    this.showEditModal = false;
    this.editingSkOfficial = null;
    this.editSkOfficialErrorMessage = null;
  }

  updateSkOfficial(payload: UpdateSkOfficialPayload): void {
    if (!this.editingSkOfficial) {
      return;
    }

    this.isEditingSkOfficial = true;
    this.editSkOfficialErrorMessage = null;

    this.skOfficialManagementService.updateSkOfficial(this.editingSkOfficial.adminId, payload).subscribe({
      next: (updatedSkOfficial) => {
        this.skOfficials = this.skOfficials.map((item) =>
          item.adminId === updatedSkOfficial.adminId ? updatedSkOfficial : item
        );
        this.showEditModal = false;
        this.editingSkOfficial = null;
        this.editSkOfficialErrorMessage = null;
        this.isEditingSkOfficial = false;
        this.editSuccessMessage = 'SK Official account has been updated successfully.';
        this.showEditSuccessModal = true;
      },
      error: (error: HttpErrorResponse) => {
        this.editSkOfficialErrorMessage = this.extractUpdateSkOfficialErrorMessage(error);
        this.isEditingSkOfficial = false;
      }
    });
  }

  closeEditSuccessModal(): void {
    this.showEditSuccessModal = false;
    this.editSuccessMessage = '';
  }

  openDeleteSkOfficialModal(skOfficial: SkOfficialAccount): void {
    this.deletingSkOfficial = skOfficial;
    this.showDeleteModal = true;
    this.deleteSkOfficialErrorMessage = null;
  }

  closeDeleteSkOfficialModal(): void {
    if (this.isDeletingSkOfficial) {
      return;
    }

    this.showDeleteModal = false;
    this.deletingSkOfficial = null;
    this.deleteSkOfficialErrorMessage = null;
  }

  confirmDeleteSkOfficial(): void {
    if (!this.deletingSkOfficial) {
      return;
    }

    this.isDeletingSkOfficial = true;
    this.deleteSkOfficialErrorMessage = null;

    const adminId = this.deletingSkOfficial.adminId;
    const officialName = this.getFullName(this.deletingSkOfficial) || 'SK Official';

    this.skOfficialManagementService.deleteSkOfficial(adminId).subscribe({
      next: () => {
        this.skOfficials = this.skOfficials.filter((item) => item.adminId !== adminId);
        this.ensureCurrentPageWithinBounds();
        this.showDeleteModal = false;
        this.deletingSkOfficial = null;
        this.isDeletingSkOfficial = false;
        this.deleteSuccessMessage = `${officialName} has been deleted successfully.`;
        this.showDeleteSuccessModal = true;
      },
      error: (error: HttpErrorResponse) => {
        this.deleteSkOfficialErrorMessage = this.extractDeleteSkOfficialErrorMessage(error);
        this.isDeletingSkOfficial = false;
      }
    });
  }

  closeDeleteSuccessModal(): void {
    this.showDeleteSuccessModal = false;
    this.deleteSuccessMessage = '';
  }

  openActivateSkOfficialModal(skOfficial: SkOfficialAccount): void {
    this.activatingSkOfficial = skOfficial;
    this.showActivateModal = true;
    this.activateSkOfficialErrorMessage = null;
  }

  closeActivateSkOfficialModal(): void {
    if (this.isActivatingSkOfficial) {
      return;
    }

    this.showActivateModal = false;
    this.activatingSkOfficial = null;
    this.activateSkOfficialErrorMessage = null;
  }

  confirmActivateSkOfficial(): void {
    if (!this.activatingSkOfficial) {
      return;
    }

    this.isActivatingSkOfficial = true;
    this.activateSkOfficialErrorMessage = null;

    const adminId = this.activatingSkOfficial.adminId;
    const officialName = this.getFullName(this.activatingSkOfficial) || 'SK Official';

    this.skOfficialManagementService.activateSkOfficial(adminId).subscribe({
      next: (updatedOfficial) => {
        this.skOfficials = this.skOfficials.map((item) =>
          item.adminId === adminId ? { ...item, isActive: updatedOfficial.isActive, active: updatedOfficial.isActive } : item
        );

        this.showActivateModal = false;
        this.activatingSkOfficial = null;
        this.isActivatingSkOfficial = false;
        this.activateSuccessMessage = `${officialName} has been activated successfully.`;
        this.showActivateSuccessModal = true;
      },
      error: (error: HttpErrorResponse) => {
        this.activateSkOfficialErrorMessage = this.extractActivateDeactivateErrorMessage(error);
        this.isActivatingSkOfficial = false;
      }
    });
  }

  closeActivateSuccessModal(): void {
    this.showActivateSuccessModal = false;
    this.activateSuccessMessage = '';
  }

  openDeactivateSkOfficialModal(skOfficial: SkOfficialAccount): void {
    this.deactivatingSkOfficial = skOfficial;
    this.showDeactivateModal = true;
    this.deactivateSkOfficialErrorMessage = null;
  }

  closeDeactivateSkOfficialModal(): void {
    if (this.isDeactivatingSkOfficial) {
      return;
    }

    this.showDeactivateModal = false;
    this.deactivatingSkOfficial = null;
    this.deactivateSkOfficialErrorMessage = null;
  }

  confirmDeactivateSkOfficial(): void {
    if (!this.deactivatingSkOfficial) {
      return;
    }

    this.isDeactivatingSkOfficial = true;
    this.deactivateSkOfficialErrorMessage = null;

    const adminId = this.deactivatingSkOfficial.adminId;
    const officialName = this.getFullName(this.deactivatingSkOfficial) || 'SK Official';

    this.skOfficialManagementService.deactivateSkOfficial(adminId).subscribe({
      next: (updatedOfficial) => {
        this.skOfficials = this.skOfficials.map((item) =>
          item.adminId === adminId ? { ...item, isActive: updatedOfficial.isActive, active: updatedOfficial.isActive } : item
        );

        this.showDeactivateModal = false;
        this.deactivatingSkOfficial = null;
        this.isDeactivatingSkOfficial = false;
        this.deactivateSuccessMessage = `${officialName} has been deactivated successfully.`;
        this.showDeactivateSuccessModal = true;
      },
      error: (error: HttpErrorResponse) => {
        this.deactivateSkOfficialErrorMessage = this.extractActivateDeactivateErrorMessage(error);
        this.isDeactivatingSkOfficial = false;
      }
    });
  }

  closeDeactivateSuccessModal(): void {
    this.showDeactivateSuccessModal = false;
    this.deactivateSuccessMessage = '';
  }

  private getIsActive(skOfficial: SkOfficialAccount): boolean {
    return Boolean(skOfficial.active ?? skOfficial.isActive ?? true);
  }

  private extractCreateSkOfficialErrorMessage(error: HttpErrorResponse): string {
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

    return 'Unable to create SK Official right now.';
  }

  private extractUpdateSkOfficialErrorMessage(error: HttpErrorResponse): string {
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

    return 'Unable to update SK Official right now.';
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

  private extractDeleteSkOfficialErrorMessage(error: HttpErrorResponse): string {
    const responseBody = error?.error;

    if (typeof responseBody === 'string' && responseBody.trim() !== '') {
      return responseBody;
    }

    if (responseBody && typeof responseBody === 'object' && typeof responseBody.message === 'string') {
      return responseBody.message;
    }

    return 'Unable to delete SK Official right now.';
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

  private loadSkOfficials(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.skOfficialManagementService.getSkOfficials().subscribe({
      next: (skOfficials) => {
        this.skOfficials = Array.isArray(skOfficials)
          ? [...skOfficials].sort((left, right) => left.adminId - right.adminId)
          : [];
        this.ensureCurrentPageWithinBounds();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load SK Officials right now.';
        this.isLoading = false;
      }
    });
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
