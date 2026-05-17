import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ConcernService, ConcernResponse, ConcernUpdate } from '../../../services/concern.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-youth-concern-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './youth-concern-detail.html',
  styleUrls: ['./youth-concern-detail.scss']
})
export class YouthConcernDetail implements OnInit {
  concern: ConcernResponse | null = null;
  concernUpdates: ConcernUpdate[] = [];
  isLoading = false;
  isLoadingUpdates = false;
  updateLoadError = '';
  concernId = 0;

  constructor(
    private concernService: ConcernService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
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

  goBack(): void {
    this.router.navigate(['/youth/create-concern']);
  }
}
