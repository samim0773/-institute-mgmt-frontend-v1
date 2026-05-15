import { Injectable }                                      from '@angular/core';
import { CanActivate, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService }                                     from '../services/auth.service';

/**
 * LoginRedirectGuard
 *
 * If the user is already logged in and navigates to /auth/login,
 * redirect them straight to their dashboard.
 *
 * Prevents the awkward scenario where a logged-in admin hits /auth/login
 * and sees the login form again.
 *
 * Usage in routing:
 *   { path: 'auth', canActivate: [LoginRedirectGuard], loadChildren: ... }
 */
@Injectable({ providedIn: 'root' })
export class LoginRedirectGuard implements CanActivate {

  constructor(private authService: AuthService) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): boolean {

    if (this.authService.isLoggedIn) {
      // Already logged in — send to their role dashboard
      this.authService.redirectByRole();
      return false;
    }

    // Not logged in — allow the auth routes (login page, etc.)
    return true;
  }
}
