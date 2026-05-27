import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ConcernService, ConcernResponse, ConcernUpdate, YouthConcernReplyRequest } from '../../../services/concern.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-youth-concern-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './youth-concern-detail.html',
  styleUrls: ['./youth-concern-detail.scss']
})
export class YouthConcernDetail implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('historyContainer') historyContainer?: ElementRef<HTMLDivElement>;

  concern: ConcernResponse | null = null;
  concernUpdates: ConcernUpdate[] = [];
  replyForm!: FormGroup;
  isLoading = false;
  isLoadingUpdates = false;
  isSendingReply = false;
  updateLoadError = '';
  concernId = 0;
  currentYouthId = 0;

  toasts: Array<{ message: string; type: string; id: number }> = [];

  private pendingScrollToBottom = false;
  private pendingScrollSmooth = false;
  private pollingIntervalId: any = null;
  private readonly POLL_INTERVAL_MS = 2000;

  constructor(
    private concernService: ConcernService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.replyForm = this.fb.group({
      reply: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.youthId) {
      this.currentYouthId = user.youthId;
    }

    this.route.params.subscribe(params => {
      this.concernId = +params['concernId'];
      if (this.concernId) {
        this.loadConcern();
        this.loadConcernUpdates(this.concernId);
      } else {
        this.goBack();
      }
    });
  }

  ngAfterViewChecked(): void {
    if (!this.pendingScrollToBottom || !this.historyContainer) {
      return;
    }
    this.scrollHistoryToBottomInternal(this.pendingScrollSmooth);
    this.pendingScrollToBottom = false;
  }

  ngOnDestroy(): void {
    this.stopPollingUpdates();
  }

  loadConcern(): void {
    this.isLoading = true;
    this.concernService.getConcernById(this.concernId).subscribe({
      next: (concern) => {
        this.concern = concern;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading concern:', error);
        this.isLoading = false;
        this.goBack();
      }
    });
  }

  loadConcernUpdates(concernId: number): void {
    this.isLoadingUpdates = true;
    this.updateLoadError = '';

    this.concernService.getConcernUpdates(concernId).subscribe({
      next: (updates) => {
        this.concernUpdates = [...updates].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        this.isLoadingUpdates = false;
        this.scheduleScrollHistoryToBottom(false);
        this.startPollingUpdates();
      },
      error: (error) => {
        console.error('Error loading concern updates:', error);
        this.updateLoadError = 'Failed to load updates. Please try again.';
        this.isLoadingUpdates = false;
      }
    });
  }

  sendReply(): void {
    this.replyForm.markAllAsTouched();

    if (this.replyForm.invalid) {
      return;
    }

    if (this.concern?.status === 'CLOSED') {
      this.showToast('This concern is closed and cannot be updated.', 'error');
      return;
    }

    if (!this.currentYouthId) {
      this.showToast('Unable to send reply. Please log in again.', 'error');
      return;
    }

    const request: YouthConcernReplyRequest = {
      youthId: this.currentYouthId,
      updateText: this.replyForm.value.reply
    };

    this.isSendingReply = true;
    this.updateLoadError = '';

    this.concernService.addYouthReply(this.concernId, request).subscribe({
      next: (update) => {
        // Optimistic update
        const optimistic: ConcernUpdate = {
          ...update,
          createdAt: update.createdAt || new Date().toISOString()
        };
        this.concernUpdates = [...this.concernUpdates, optimistic].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        this.replyForm.reset();
        this.isSendingReply = false;
        this.scheduleScrollHistoryToBottom(true);
      },
      error: (error) => {
        console.error('Error sending reply:', error);
        this.showToast('Failed to send reply. Please try again.', 'error');
        this.isSendingReply = false;
      }
    });
  }

  private startPollingUpdates(): void {
    if (this.pollingIntervalId) {
      return;
    }
    this.pollingIntervalId = setInterval(() => {
      this.fetchUpdatesSilently();
    }, this.POLL_INTERVAL_MS);
  }

  private stopPollingUpdates(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }

  private fetchUpdatesSilently(): void {
    if (!this.concernId) {
      return;
    }
    this.concernService.getConcernUpdates(this.concernId).subscribe({
      next: (updates) => {
        const sorted = [...updates].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const newOnes = sorted.filter(
          u => !this.concernUpdates.some(existing => existing.updateId === u.updateId)
        );
        if (newOnes.length > 0) {
          newOnes.forEach(serverUpdate => {
            this.concernUpdates = this.concernUpdates.filter(local => {
              const sameSender = local.senderType === serverUpdate.senderType;
              const sameText = local.updateText?.trim() === serverUpdate.updateText?.trim();
              const timeDiff = Math.abs(
                new Date(local.createdAt).getTime() - new Date(serverUpdate.createdAt).getTime()
              );
              if (sameSender && sameText && timeDiff <= 5000) {
                return false;
              }
              return true;
            });
          });
          this.concernUpdates = [...this.concernUpdates, ...newOnes].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          this.scheduleScrollHistoryToBottom(true);
        }
      },
      error: () => {
        // silent fail for polling
      }
    });
  }

  private scheduleScrollHistoryToBottom(smooth: boolean): void {
    this.pendingScrollToBottom = true;
    this.pendingScrollSmooth = smooth;
  }

  private scrollHistoryToBottomInternal(smooth: boolean): void {
    const container = this.historyContainer?.nativeElement;
    if (!container) {
      return;
    }
    const behavior = smooth && 'scrollBehavior' in document.documentElement.style ? 'smooth' : 'auto';
    container.scrollTo({ top: container.scrollHeight, behavior });
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

  getStatusLabel(status: string): string {
    const labelMap: { [key: string]: string } = {
      'OPEN': 'Open',
      'IN_PROGRESS': 'In Progress',
      'RESOLVED': 'Resolved',
      'CLOSED': 'Closed'
    };
    return labelMap[status] || status;
  }

  getSenderLabel(update: ConcernUpdate): string {
    if (update.senderType === 'YOUTH') {
      return 'You';
    }
    if (update.senderType === 'SK_OFFICIAL') {
      return update.senderName || 'SK Official';
    }
    return update.senderName || 'System';
  }

  isYouthMessage(update: ConcernUpdate): boolean {
    return update.senderType === 'YOUTH';
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

  showToast(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
    const id = Date.now();
    this.toasts.push({ message, type, id });
    setTimeout(() => this.removeToast(id), 3000);
  }

  removeToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  goBack(): void {
    this.router.navigate(['/youth/create-concern']);
  }
}
