import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlertComponent } from '../../shared/components/alert.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, AlertComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
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
