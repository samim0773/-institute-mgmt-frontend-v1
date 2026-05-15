import { Injectable }        from '@angular/core';
import { HttpClient }        from '@angular/common/http';
import { Router }            from '@angular/router';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { MatSnackBar }       from '@angular/material/snack-bar';
import { environment }       from '../../../environments/environment';
import {
  AuthUser, AuthResponse, LoginPayload, UserRole, ApiResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {

  // ─── Storage keys ────────────────────────────────────────────────────────────
  private readonly TOKEN_KEY = 'inst_token';
  private readonly USER_KEY  = 'inst_user';

  // ─── Reactive state ──────────────────────────────────────────────────────────
  // BehaviorSubject emits the current user synchronously on subscribe.
  // Any component can inject AuthService and subscribe to currentUser$ to
  // reactively show/hide UI based on login state and role.
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.loadUserFromStorage());
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http:      HttpClient,
    private router:    Router,
    private snackBar:  MatSnackBar,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  AUTH ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/auth/login
   * Stores token + user, updates the BehaviorSubject.
   * Returns the raw Observable so the component can handle loading state.
   */
  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(
        tap(res => this.handleAuthSuccess(res)),
        catchError(err => {
          // Let the ErrorInterceptor handle 401/403 snackbars.
          // Re-throw so the LoginComponent's subscribe error handler fires.
          return throwError(() => err);
        }),
      );
  }

  /**
   * Clears all stored auth state and redirects to login.
   * Called by ErrorInterceptor on 401, or by user clicking "Sign Out".
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  /**
   * GET /api/auth/me
   * Refreshes user data from the server (use after profile changes).
   */
  refreshMe(): Observable<ApiResponse<AuthUser>> {
    return this.http
      .get<ApiResponse<AuthUser>>(`${environment.apiUrl}/auth/me`)
      .pipe(
        tap(res => {
          if (res.data) {
            localStorage.setItem(this.USER_KEY, JSON.stringify(res.data));
            this.currentUserSubject.next(res.data);
          }
        }),
      );
  }

  /**
   * PUT /api/auth/change-password
   * On success the backend returns a fresh token — store it.
   */
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http
      .put(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword })
      .pipe(
        tap((res: any) => {
          if (res.token) {
            localStorage.setItem(this.TOKEN_KEY, res.token);
          }
        }),
      );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SYNCHRONOUS GETTERS  (use these in guards and interceptors)
  // ═══════════════════════════════════════════════════════════════════════════

  /** The decoded user object from localStorage (no server round-trip). */
  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  /** Raw JWT string, or null if not logged in. */
  get token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /** True if a non-expired token and user are present. */
  get isLoggedIn(): boolean {
    return !!this.token && !!this.currentUser && !this.isTokenExpired();
  }

  /** The user's role string, or null if not logged in. */
  get role(): UserRole | null {
    return this.currentUser?.role ?? null;
  }

  /** The user's instituteId string, or null for super_admin. */
  get instituteId(): string | null {
    return this.currentUser?.instituteId ?? null;
  }

  /** The user's display name. */
  get displayName(): string {
    return this.currentUser?.name ?? 'User';
  }

  /** The teacher's assigned subject (teachers only). */
  get subject(): string | null {
    return this.currentUser?.subject ?? null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ROLE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Returns true if the current user has any of the specified roles. */
  isRole(...roles: UserRole[]): boolean {
    return !!this.role && roles.includes(this.role);
  }

  get isAdmin():      boolean { return this.isRole('admin'); }
  get isTeacher():    boolean { return this.isRole('teacher'); }
  get isSuperAdmin(): boolean { return this.isRole('super_admin'); }

  /**
   * Navigate to the correct dashboard based on role.
   * Called after login and from guards when a user tries a wrong route.
   */
  redirectByRole(): void {
    const destinations: Record<UserRole, string> = {
      super_admin: '/super-admin/institutes',
      admin:       '/admin/dashboard',
      teacher:     '/teacher/dashboard',
    };
    const dest = this.role ? destinations[this.role] : '/auth/login';
    this.router.navigate([dest]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TOKEN UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Decodes the JWT payload without verifying the signature.
   * Used to read exp, role, instituteId without a server call.
   */
  decodeToken(): Record<string, any> | null {
    const token = this.token;
    if (!token) return null;
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  /** Returns true if the stored token has passed its exp timestamp. */
  isTokenExpired(): boolean {
    const payload = this.decodeToken();
    if (!payload?.['exp']) return true;
    // exp is in seconds; Date.now() is in milliseconds
    return payload['exp'] * 1000 < Date.now();
  }

  /**
   * Returns seconds until token expiry.
   * Useful for showing a "session expiring soon" warning.
   */
  tokenSecondsRemaining(): number {
    const payload = this.decodeToken();
    if (!payload?.['exp']) return 0;
    return Math.max(0, payload['exp'] - Math.floor(Date.now() / 1000));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Persist token + user and notify all subscribers. */
  private handleAuthSuccess(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    this.currentUserSubject.next(res.user);
  }

  /** Safely parse the stored user JSON — returns null on any error. */
  private loadUserFromStorage(): AuthUser | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw) as AuthUser;
      // Basic sanity check — must have _id and role
      if (!user._id || !user.role) return null;
      return user;
    } catch {
      return null;
    }
  }
}
