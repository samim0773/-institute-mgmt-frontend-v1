import { Injectable }     from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService }    from '../services/auth.service';

/**
 * AuthGuard
 *
 * Protects every route that requires the user to be logged in.
 * Redirects to /auth/login with a `returnUrl` query param so after
 * login the user lands back where they were trying to go.
 *
 * Usage in routing:
 *   { path: 'admin', canActivate: [AuthGuard], ... }
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router:      Router,
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state:  RouterStateSnapshot,
  ): boolean {

    if (this.authService.isLoggedIn) {
      return true;
    }

    // Save the attempted URL so we can redirect back after login
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }
}
