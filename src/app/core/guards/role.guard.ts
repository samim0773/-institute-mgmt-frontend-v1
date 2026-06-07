import { Injectable }     from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService }    from '../services/auth.service';
import { UserRole }       from '../models';

/**
 * RoleGuard
 *
 * Checks the logged-in user's role against `data.roles` on the route.
 * Must be used AFTER AuthGuard (AuthGuard ensures isLoggedIn first).
 *
 * Role hierarchy: super_admin > admin > teacher
 * super_admin implicitly passes any role check (they can do everything).
 *
 * Usage in routing:
 *   {
 *     path: 'admin',
 *     canActivate: [AuthGuard, RoleGuard],
 *     data: { roles: ['admin'] },
 *     ...
 *   }
 */
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  // super_admin inherits all permissions — they can access any role-protected route
  private readonly ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
    super_admin: ['super_admin', 'admin', 'teacher', 'student'],
    admin:       ['admin', 'teacher'],
    teacher:     ['teacher'],
    student:     ['student'],
  };

  constructor(
    private authService: AuthService,
    private router:      Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRoles = (route.data?.['roles'] as UserRole[]) ?? [];
    const userRole      = this.authService.role;

    // No roles specified on the route → allow any authenticated user
    if (requiredRoles.length === 0) return true;

    if (!userRole) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    // Check direct match OR hierarchy elevation
    const allowedRoles = this.ROLE_HIERARCHY[userRole] ?? [userRole];
    const hasAccess    = requiredRoles.some(r => allowedRoles.includes(r));

    if (hasAccess) return true;

    // Wrong role — redirect to their own dashboard instead of showing 403
    this.authService.redirectByRole();
    return false;
  }
}
