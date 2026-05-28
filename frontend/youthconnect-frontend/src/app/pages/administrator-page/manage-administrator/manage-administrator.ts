import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import {
  AdministratorAccount,
  AdministratorManagementService,
  AdministratorUpdatePayload,
  CreateAdministratorPayload
} from '../../../services/administrator-management.service';
import { AddAdministratorFeature } from '../feature/add-administrator-feature/add-administrator-feature';
import { DeleteAdministratorFeature } from '../feature/delete-administrator-feature/delete-administrator-feature';
import { EditAdministratorFeature } from '../feature/edit-administrator-feature/edit-administrator-feature';

@Component({
  selector: 'app-manage-administrator',
  standalone: true,
  imports: [CommonModule, FormsModule, AddAdministratorFeature, EditAdministratorFeature, DeleteAdministratorFeature],
  templateUrl: './manage-administrator.html',
  styleUrl: './manage-administrator.scss',
})
export class ManageAdministrator implements OnInit {
  private administratorManagementService = inject(AdministratorManagementService);
  readonly itemsPerPage = 9;
  administrators: AdministratorAccount[] = [];
  searchTerm = '';
  currentPage = 1;
  isLoading = false;
  errorMessage: string | null = null;
  private updatingAdministratorIds = new Set<number>();
  showAddModal = false;
  isCreatingAdministrator = false;
  addAdminErrorMessage: string | null = null;
  
  showEditModal = false;
  editingAdministrator: AdministratorAccount | null = null;
  isEditingAdministrator = false;
  editAdminErrorMessage: string | null = null;
  showEditSuccessModal = false;
  editSuccessMessage = '';
  showDeleteModal = false;
  deletingAdministrator: AdministratorAccount | null = null;
  isDeletingAdministrator = false;
  deleteAdminErrorMessage: string | null = null;
  showDeleteSuccessModal = false;
  deleteSuccessMessage = '';

  ngOnInit(): void {
    this.loadAdministrators();
  }

  get filteredAdministrators(): AdministratorAccount[] {
    const normalizedSearchTerm = this.searchTerm.trim().toLowerCase();
    if (!normalizedSearchTerm) {
      return this.administrators;
    }

    return this.administrators.filter((administrator) => {
      const statusText = this.getStatusLabel(administrator.active).toLowerCase();
      return (
        String(administrator.administratorId).includes(normalizedSearchTerm)
        || (administrator.username ?? '').toLowerCase().includes(normalizedSearchTerm)
        || (administrator.email ?? '').toLowerCase().includes(normalizedSearchTerm)
        || statusText.includes(normalizedSearchTerm)
      );
    });
  }

  get paginatedAdministrators(): AdministratorAccount[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredAdministrators.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredAdministrators.length / this.itemsPerPage);
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

  isUpdating(administratorId: number): boolean {
    return this.updatingAdministratorIds.has(administratorId);
  }

  toggleStatus(administrator: AdministratorAccount): void {
    if (this.isUpdating(administrator.administratorId)) {
      return;
    }

    const nextActiveStatus = !administrator.active;
    this.updatingAdministratorIds.add(administrator.administratorId);
    this.errorMessage = null;

    const payload: AdministratorUpdatePayload = {
      username: administrator.username,
      email: administrator.email,
      active: nextActiveStatus
    };

    this.administratorManagementService
      .updateAdministrator(administrator.administratorId, payload)
      .subscribe({
        next: (updatedAdministrator) => {
          this.administrators = this.administrators.map((item) =>
            item.administratorId === updatedAdministrator.administratorId ? updatedAdministrator : item
          );
          this.updatingAdministratorIds.delete(administrator.administratorId);
        },
        error: () => {
          this.errorMessage = 'Unable to update administrator status right now.';
          this.updatingAdministratorIds.delete(administrator.administratorId);
        }
      });
  }

  editAdministrator(administrator: AdministratorAccount): void {
    this.editingAdministrator = administrator;
    this.showEditModal = true;
    this.editAdminErrorMessage = null;
  }

  closeEditAdminModal(): void {
    if (this.isEditingAdministrator) {
      return;
    }

    this.showEditModal = false;
    this.editingAdministrator = null;
    this.editAdminErrorMessage = null;
  }

  updateAdministrator(payload: AdministratorUpdatePayload): void {
    if (!this.editingAdministrator) {
      return;
    }

    this.isEditingAdministrator = true;
    this.editAdminErrorMessage = null;

    this.administratorManagementService
      .updateAdministrator(this.editingAdministrator.administratorId, payload)
      .subscribe({
        next: (updatedAdministrator) => {
          this.administrators = this.administrators.map((item) =>
            item.administratorId === updatedAdministrator.administratorId ? updatedAdministrator : item
          );
          this.showEditModal = false;
          this.editingAdministrator = null;
          this.editAdminErrorMessage = null;
          this.isEditingAdministrator = false;
          this.editSuccessMessage = 'Administrator account has been updated successfully.';
          this.showEditSuccessModal = true;
        },
        error: (error: HttpErrorResponse) => {
          this.editAdminErrorMessage = this.extractUpdateAdminErrorMessage(error);
          this.isEditingAdministrator = false;
        }
      });
  }

  closeEditSuccessModal(): void {
    this.showEditSuccessModal = false;
    this.editSuccessMessage = '';
  }

  openDeleteAdminModal(administrator: AdministratorAccount): void {
    this.deletingAdministrator = administrator;
    this.showDeleteModal = true;
    this.deleteAdminErrorMessage = null;
  }

  closeDeleteAdminModal(): void {
    if (this.isDeletingAdministrator) {
      return;
    }

    this.showDeleteModal = false;
    this.deletingAdministrator = null;
    this.deleteAdminErrorMessage = null;
  }

  confirmDeleteAdministrator(): void {
    if (!this.deletingAdministrator) {
      return;
    }

    this.isDeletingAdministrator = true;
    this.deleteAdminErrorMessage = null;

    const administratorId = this.deletingAdministrator.administratorId;
    const administratorName = this.deletingAdministrator.username || 'Administrator';

    this.administratorManagementService.deleteAdministrator(administratorId).subscribe({
      next: () => {
        this.administrators = this.administrators.filter((item) => item.administratorId !== administratorId);
        this.ensureCurrentPageWithinBounds();
        this.showDeleteModal = false;
        this.deletingAdministrator = null;
        this.isDeletingAdministrator = false;
        this.deleteSuccessMessage = `${administratorName} has been deleted successfully.`;
        this.showDeleteSuccessModal = true;
      },
      error: (error: HttpErrorResponse) => {
        this.deleteAdminErrorMessage = this.extractDeleteAdminErrorMessage(error);
        this.isDeletingAdministrator = false;
      }
    });
  }

  closeDeleteSuccessModal(): void {
    this.showDeleteSuccessModal = false;
    this.deleteSuccessMessage = '';
  }

  // Add Administrator Modal Methods
  openAddAdminModal(): void {
    this.showAddModal = true;
    this.addAdminErrorMessage = null;
  }

  closeAddAdminModal(): void {
    if (this.isCreatingAdministrator) {
      return;
    }

    this.showAddModal = false;
    this.addAdminErrorMessage = null;
  }

  createAdministrator(payload: CreateAdministratorPayload): void {
    this.isCreatingAdministrator = true;
    this.addAdminErrorMessage = null;

    this.administratorManagementService.createAdministrator(payload).subscribe({
      next: (newAdministrator) => {
        this.administrators = [
          ...this.administrators,
          newAdministrator
        ].sort((left, right) => left.administratorId - right.administratorId);
        this.ensureCurrentPageWithinBounds();
        this.showAddModal = false;
        this.addAdminErrorMessage = null;
        this.isCreatingAdministrator = false;
      },
      error: (error: HttpErrorResponse) => {
        this.addAdminErrorMessage = this.extractCreateAdminErrorMessage(error);
        this.isCreatingAdministrator = false;
      }
    });
  }

  private extractCreateAdminErrorMessage(error: HttpErrorResponse): string {
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

    return 'Unable to create administrator right now.';
  }

  private extractUpdateAdminErrorMessage(error: HttpErrorResponse): string {
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

    return 'Unable to update administrator right now.';
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

  private extractDeleteAdminErrorMessage(error: HttpErrorResponse): string {
    const responseBody = error?.error;

    if (typeof responseBody === 'string' && responseBody.trim() !== '') {
      return responseBody;
    }

    if (responseBody && typeof responseBody === 'object' && typeof responseBody.message === 'string') {
      return responseBody.message;
    }

    return 'Unable to delete administrator right now.';
  }

  private loadAdministrators(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.administratorManagementService.getAdministrators().subscribe({
      next: (administrators) => {
        this.administrators = Array.isArray(administrators)
          ? [...administrators].sort((left, right) => left.administratorId - right.administratorId)
          : [];
        this.ensureCurrentPageWithinBounds();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load administrators right now.';
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
