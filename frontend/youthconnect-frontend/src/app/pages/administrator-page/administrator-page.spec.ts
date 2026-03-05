import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdministratorPage } from './administrator-page';

describe('AdministratorPage', () => {
  let component: AdministratorPage;
  let fixture: ComponentFixture<AdministratorPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdministratorPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdministratorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
