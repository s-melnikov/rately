import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlertComponent } from '../../shared/components/alert.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, AlertComponent],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1 class="login-title">Welcome to Ratify</h1>
        <p class="login-subtitle">Sign in to write and manage reviews</p>

        @if (error()) {
          <app-alert [message]="error()!" type="error" />
        }

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm" novalidate>
          <div class="form-group">
            <label for="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              [(ngModel)]="username"
              required
              minlength="2"
              placeholder="Enter your username"
              #usernameInput="ngModel"
            />
            @if (usernameInput.invalid && usernameInput.touched) {
              <span class="field-error">Username must be at least 2 characters</span>
            }
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              [(ngModel)]="email"
              required
              email
              placeholder="Enter your email"
              #emailInput="ngModel"
            />
            @if (emailInput.invalid && emailInput.touched) {
              <span class="field-error">Please enter a valid email</span>
            }
          </div>

          <button type="submit" class="btn btn-primary" [disabled]="loading() || loginForm.invalid">
            {{ loading() ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #f9fafb; padding: 24px;
    }
    .login-card {
      background: white; padding: 40px; border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08); width: 100%; max-width: 400px;
    }
    .login-title { font-size: 1.75rem; font-weight: 700; margin: 0 0 8px; color: #111827; }
    .login-subtitle { color: #6b7280; margin: 0 0 24px; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 6px; color: #374151; }
    input {
      width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px;
      font-size: 1rem; box-sizing: border-box; outline: none;
    }
    input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
    .field-error { font-size: 0.8rem; color: #dc2626; margin-top: 4px; display: block; }
    .btn { width: 100%; padding: 11px; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; }
    .btn-primary { background: #4f46e5; color: white; font-weight: 600; }
    .btn-primary:hover:not(:disabled) { background: #4338ca; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  `],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected username = '';
  protected email = '';
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Redirect if already logged in
    if (this.auth.isLoggedIn()) {
      void this.router.navigate(['/products']);
    }
  }

  onSubmit() {
    if (!this.username || !this.email) return;
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.username, this.email);
    // AuthService handles navigation on success
    // On error, loading state stays — in production we'd handle the error observable
    setTimeout(() => this.loading.set(false), 1500);
  }
}
