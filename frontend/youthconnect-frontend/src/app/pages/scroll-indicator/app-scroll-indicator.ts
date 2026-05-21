import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-scroll-indicator',
  standalone: true,
  template: `
    <div class="scroll-indicator" [class.hidden]="hasScrolled">
      <div class="scroll-chevron-stack">
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
  `,
  styleUrl: './app-scroll-indicator.scss'
})
export class ScrollIndicatorComponent implements OnInit, OnDestroy {
  hasScrolled = false;
  private scrollListener: any;

  ngOnInit(): void {
    this.scrollListener = this.onScroll.bind(this);
    window.addEventListener('scroll', this.scrollListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollListener);
  }

  private onScroll(): void {
    if (window.scrollY > 100) {
      this.hasScrolled = true;
      window.removeEventListener('scroll', this.scrollListener);
    }
  }
}