import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkOfficial } from './sk-official';

describe('SkOfficial', () => {
  let component: SkOfficial;
  let fixture: ComponentFixture<SkOfficial>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkOfficial]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SkOfficial);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
