import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminAuthService, AdminInfoService } from '../../../services/admin-auth.service';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-adminstrator-login',
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './adminstrator-login.html',
  styleUrl: './adminstrator-login.scss',
})
export class AdminstratorLogin {
  formBuilder = inject(FormBuilder);
  adminAuthService = inject(AdminAuthService);
  adminInfoService = inject(AdminInfoService);
  authService = inject(AuthService);
  router = inject(Router);

  loginForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  showPassword = false;

  constructor() {
    this.loginForm = this.formBuilder.group({
      email: ['', {
        validators: [Validators.required, Validators.email],
        updateOn: 'change'
      }],
      password: ['', {
        validators: [Validators.required],
        updateOn: 'change'
      }],
    });
  }

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  isFormValid(): boolean {
    return this.loginForm.valid && this.emailControl?.value && this.passwordControl?.value;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  login(): void {
    if (!this.isFormValid()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const email = this.emailControl?.value;
    const password = this.passwordControl?.value;

    this.adminAuthService.login(email, password).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        if (response.success) {
          const resolvedEmail = response.email ?? email;

          this.adminInfoService.setAdminInfo({
            token: response.token,
            administratorId: response.administratorId,
            email: resolvedEmail,
            username: response.username
          });
          
          // Store token and role in localStorage for authentication
          if (response.token) localStorage.setItem('auth_token', response.token);
          localStorage.setItem('auth_role', 'admin');
          localStorage.setItem('auth_name', response.username || '');
          if (response.administratorId) localStorage.setItem('admin_id', response.administratorId.toString());
          
          // Redirect to admin dashboard
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.errorMessage = response.message || 'Login failed';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'An error occurred during login';
        console.error('Login error:', error);
      }
    });
  }
}
