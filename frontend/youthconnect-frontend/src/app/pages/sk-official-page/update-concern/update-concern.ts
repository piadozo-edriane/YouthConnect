import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminConcernService, Concern, ConcernUpdate, AdminConcernUpdateRequest } from '../../../services/admin-concern.service';
import { SkOfficialManagementService } from '../../../services/sk-official-management.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-update-concern',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-concern.html',
  styleUrls: ['./update-concern.scss']
})
export class UpdateConcern implements OnInit {
  responseForm!: FormGroup;
  concern: Concern | null = null;
  concernUpdates: ConcernUpdate[] = [];
  isLoading = false;
  isLoadingUpdates = false;
  updateLoadError: string = '';
  currentAdminId: number = 0;
  concernId: number = 0;
  statusOptions: { value: Concern['status']; label: string }[] = [];
  skOfficialName = 'SK Official';
  skOfficialEmail = '';
  skOfficialPosition = 'SK Official';
  skOfficialInitials = 'SK';
  toasts: Array<{ message: string; type: string; id: number }> = [];

  constructor(
    private adminConcernService: AdminConcernService,
    private fb: FormBuilder,
    private authService: AuthService,
    private skOfficialService: SkOfficialManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.getCurrentUser();
    this.loadSkOfficialProfile();
    
    // Get concern ID from route
    this.route.params.subscribe(params => {
      this.concernId = +params['concernId'];
      if (this.concernId) {
        this.loadConcern();
        this.loadConcernUpdates(this.concernId);
      } else {
        this.showToast('Invalid concern ID', 'error');
        setTimeout(() => this.goBack(), 2000);
      }
    });

    // Subscribe to toast service
    this.toastService.toast$.subscribe(toast => {
      this.addToast(toast.message, toast.type, toast.duration || 3000);
    });
  }

  initForm() {
    this.responseForm = this.fb.group({
      response: ['', [Validators.required, Validators.minLength(10)]],
      status: ['IN_PROGRESS', Validators.required]
    });
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

  loadConcern() {
    this.isLoading = true;
    
    this.adminConcernService.getAllConcerns().subscribe({
      next: (concerns) => {
        this.concern = concerns.find(c => c.concernId === this.concernId) || null;
        
        if (!this.concern) {
          this.showToast('Concern not found', 'error');
          setTimeout(() => this.goBack(), 2000);
        } else {
          this.statusOptions = this.buildStatusOptions(this.concern.status);
          this.responseForm.patchValue({
            status: this.getDefaultStatus(this.concern.status)
          });
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading concern:', error);
        this.showToast('Failed to load concern. Please try again.', 'error');
        this.isLoading = false;
        setTimeout(() => this.goBack(), 2000);
      }
    });
  }

  sendResponse() {
    this.responseForm.markAllAsTouched();

    if (this.responseForm.invalid || !this.concern) {
      this.showToast('Please fill in all required fields', 'error');
      return;
    }

    if (!this.currentAdminId) {
      this.showToast('User information not found', 'error');
      return;
    }

    const formValue = this.responseForm.value;
    const request: AdminConcernUpdateRequest = {
      adminId: this.currentAdminId,
      updateText: formValue.response,
      status: formValue.status
    };

    this.isLoading = true;
    
    this.adminConcernService.addConcernUpdate(this.concern.concernId, request).subscribe({
      next: () => {
        this.showToast('Response sent and status updated successfully!', 'success');
        this.responseForm.reset();
        
        // Update the concern status locally
        if (this.concern) {
          this.concern.status = formValue.status;
          this.statusOptions = this.buildStatusOptions(this.concern.status);
          this.responseForm.patchValue({
            status: this.getDefaultStatus(this.concern.status)
          });
        }
        
        // Only refresh update history
        this.loadConcernUpdates(this.concern!.concernId);
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error sending response:', error);
        this.showToast(error.error || 'Failed to send response. Please try again.', 'error');
        this.isLoading = false;
      }
    });
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

  getStatusLabel(status: Concern['status']): string {
    const labelMap: Record<Concern['status'], string> = {
      OPEN: 'Open',
      IN_PROGRESS: 'In Progress',
      RESOLVED: 'Resolved',
      CLOSED: 'Closed'
    };
    return labelMap[status] || status;
  }

  getSenderLabel(update: ConcernUpdate): string {
    if (update.senderType === 'YOUTH') {
      return update.senderName || 'Youth';
    }
    if (update.senderType === 'SK_OFFICIAL') {
      return update.senderName || 'SK Official';
    }
    return update.senderName || 'System';
  }

  isYouthMessage(update: ConcernUpdate): boolean {
    return update.senderType === 'YOUTH';
  }

  private getDefaultStatus(status?: Concern['status']): Concern['status'] {
    if (status === 'OPEN') {
      return 'IN_PROGRESS';
    }
    return status || 'IN_PROGRESS';
  }

  private buildStatusOptions(status?: Concern['status']): { value: Concern['status']; label: string }[] {
    switch (status) {
      case 'OPEN':
        return [{ value: 'IN_PROGRESS', label: 'In Progress' }];
      case 'IN_PROGRESS':
        return [
          { value: 'IN_PROGRESS', label: 'In Progress' },
          { value: 'RESOLVED', label: 'Resolved' },
          { value: 'CLOSED', label: 'Closed' }
        ];
      case 'RESOLVED':
        return [
          { value: 'RESOLVED', label: 'Resolved' },
          { value: 'CLOSED', label: 'Closed' }
        ];
      case 'CLOSED':
        return [{ value: 'CLOSED', label: 'Closed' }];
      default:
        return [{ value: 'IN_PROGRESS', label: 'In Progress' }];
    }
  }

  loadConcernUpdates(concernId: number) {
    this.isLoadingUpdates = true;
    this.updateLoadError = '';

    this.adminConcernService.getConcernUpdates(concernId).subscribe({
      next: (updates) => {
        this.concernUpdates = updates;
        this.isLoadingUpdates = false;
        
        // Scroll to bottom to show latest update
        setTimeout(() => {
          const container = document.querySelector('.history-container');
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }, 100);
      },
      error: (error) => {
        console.error('Error loading concern updates:', error);
        this.updateLoadError = 'Failed to load updates. Please try again.';
        this.isLoadingUpdates = false;
      }
    });
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

  formatDateShort(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  canSendResponse(status: string): boolean {
    return status !== 'CLOSED';
  }

  goBack() {
    this.router.navigate(['/sk-official/concerns']);
  }

  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning') {
    this.toastService.show(message, type);
  }

  addToast(message: string, type: string, duration: number) {
    const id = Date.now();
    this.toasts.push({ message, type, id });
    setTimeout(() => {
      this.removeToast(id);
    }, duration);
  }

  removeToast(id: number) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
  }
}
