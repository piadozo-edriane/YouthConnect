import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScrollIndicatorComponent } from './app-scroll-indicator';

describe('AppScrollIndicator', () => {
  let component: ScrollIndicatorComponent;
  let fixture: ComponentFixture<ScrollIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScrollIndicatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScrollIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
