import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';

export interface UserPayload {
  username: string;
  email: string;
  exp: number;
}

const TOKEN_KEY = 'access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly isLoggedIn = computed(() => {
    const t = this.token();
    if (!t) return false;
    try {
      const { exp } = jwtDecode<UserPayload>(t);
      return Date.now() < exp * 1000;
    } catch {
      return false;
    }
  });

  readonly currentUser = computed((): UserPayload | null => {
    const t = this.token();
    if (!t || !this.isLoggedIn()) return null;
    try {
      return jwtDecode<UserPayload>(t);
    } catch {
      return null;
    }
  });

  login(username: string, email: string) {
    return this.http
      .post<{ accessToken: string }>(`${environment.apiUrl}/auth/login`, { username, email })
      .subscribe({
        next: ({ accessToken }) => {
          localStorage.setItem(TOKEN_KEY, accessToken);
          this.token.set(accessToken);
          void this.router.navigate(['/products']);
        },
      });
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    void this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.token();
  }
}
