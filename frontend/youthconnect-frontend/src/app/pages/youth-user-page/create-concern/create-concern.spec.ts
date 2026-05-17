import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { CreateConcern } from './create-concern';

describe('CreateConcern', () => {
  let component: CreateConcern;
  let fixture: ComponentFixture<CreateConcern>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateConcern],
      providers: [
        provideHttpClient(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (k: string) => null } } } }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CreateConcern);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
