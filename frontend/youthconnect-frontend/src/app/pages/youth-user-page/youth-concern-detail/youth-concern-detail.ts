import { Component, OnInit } from '@angular/core';
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
export class YouthConcernDetail implements OnInit {
  concern: ConcernResponse | null = null;
  concernUpdates: ConcernUpdate[] = [];
  replyForm!: FormGroup;
  isLoading = false;
  isLoadingUpdates = false;
  isSendingReply = false;
  updateLoadError = '';
  concernId = 0;
  currentYouthId = 0;

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
        this.concernUpdates = updates;
        this.isLoadingUpdates = false;

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

  sendReply(): void {
    this.replyForm.markAllAsTouched();

    if (this.replyForm.invalid) {
      return;
    }

    if (this.concern?.status === 'CLOSED') {
      this.updateLoadError = 'This concern is closed and cannot be updated.';
      return;
    }

    if (!this.currentYouthId) {
      this.updateLoadError = 'Unable to send reply. Please log in again.';
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
        this.concernUpdates = [...this.concernUpdates, update];
        this.replyForm.reset();
        this.isSendingReply = false;
        this.loadConcernUpdates(this.concernId);
      },
      error: (error) => {
        console.error('Error sending reply:', error);
        this.updateLoadError = 'Failed to send reply. Please try again.';
        this.isSendingReply = false;
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

  getStatusLabel(status: string): string {
    const labelMap: { [key: string]: string } = {
      'OPEN': 'Open',
      'IN_PROGRESS': 'In Progress',
      'RESOLVED': 'Resolved',
      'CLOSED': 'Closed'
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

  getSenderLabel(update: ConcernUpdate): string {
    if (update.senderType === 'YOUTH') {
      return update.youthId === this.currentYouthId ? 'You' : (update.senderName || 'Youth');
    }
    if (update.senderType === 'SK_OFFICIAL') {
      return update.senderName || 'SK Official';
    }
    return update.senderName || 'System';
  }

  isYouthMessage(update: ConcernUpdate): boolean {
    return update.senderType === 'YOUTH';
  }

  goBack(): void {
    this.router.navigate(['/youth/create-concern']);
  }
}
