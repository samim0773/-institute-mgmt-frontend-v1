import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  template: `
    <div class="unauth-page">
      <div class="unauth-card">
        <mat-icon class="unauth-icon">lock</mat-icon>
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
        <button mat-raised-button color="primary" (click)="goHome()">
          <mat-icon>home</mat-icon>
          Go to My Dashboard
        </button>
      </div>
    </div>
  `,
  styles: [`
    .unauth-page {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
    }
    .unauth-card {
      text-align: center;
      background: #fff;
      border-radius: 12px;
      padding: 48px 40px;
      box-shadow: 0 2px 20px rgba(0,0,0,0.08);
      max-width: 360px;
    }
    .unauth-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ef9a9a;
      margin-bottom: 16px;
    }
    h2 { margin: 0 0 8px; font-size: 1.5rem; color: #212121; }
    p  { color: #757575; margin: 0 0 24px; }
    button mat-icon { margin-right: 8px; font-size: 20px; }
  `],
})
export class UnauthorizedComponent {
  constructor(private authService: AuthService) {}

  goHome(): void {
    if (this.authService.isLoggedIn) {
      this.authService.redirectByRole();
    }
  }
}
