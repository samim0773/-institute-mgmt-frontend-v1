import { Injectable }        from '@angular/core';
import { HttpClient }        from '@angular/common/http';
import { Router }            from '@angular/router';
import { BehaviorSubject, Observable, of, tap, map, catchError, throwError } from 'rxjs';
import { MatSnackBar }       from '@angular/material/snack-bar';
import { environment }       from '../../../environments/environment';
import {
  AuthUser, AuthResponse, LoginPayload, StudentLoginPayload, UserRole, ApiResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly TOKEN_KEY = 'inst_token';
  private readonly USER_KEY  = 'inst_user';

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.loadUserFromStorage());
  readonly currentUser$ = this.currentUserSubject.asObservable();

  private instituteInfoSubject = new BehaviorSubject<{ name: string; code?: string; plan?: string; planExpiresAt?: string } | null>(null);

  constructor(
    private http:     HttpClient,
    private router:   Router,
    private snackBar: MatSnackBar,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  AUTH ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(
        tap(res => this.handleAuthSuccess(res)),
        catchError(err => throwError(() => err)),
      );
  }

  studentLogin(payload: StudentLoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/student-login`, payload)
      .pipe(
        tap(res => this.handleAuthSuccess(res)),
        catchError(err => throwError(() => err)),
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.instituteInfoSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

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

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http
      .put(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword })
      .pipe(
        tap((res: any) => {
          if (res.token) localStorage.setItem(this.TOKEN_KEY, res.token);
        }),
      );
  }

  resetUserPassword(userId: string, newPassword: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/auth/reset-password/${userId}`, { newPassword });
  }

  getMyInstituteInfo(): Observable<{ name: string; code?: string; plan?: string; planExpiresAt?: string } | null> {
    const cached = this.instituteInfoSubject.value;
    if (cached) return of(cached);
    return this.http.get<any>(`${environment.apiUrl}/auth/me`).pipe(
      map((res: any) => res?.data?.institute ?? null),
      tap(info => this.instituteInfoSubject.next(info)),
      catchError(() => of(null)),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SYNCHRONOUS GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  get isLoggedIn(): boolean {
    return !!this.token && !!this.currentUser && !this.isTokenExpired();
  }

  get role(): UserRole | null {
    return this.currentUser?.role ?? null;
  }

  get instituteId(): string | null {
    return this.currentUser?.instituteId ?? null;
  }

  get displayName(): string {
    return this.currentUser?.name ?? 'User';
  }

  get subject(): string | null {
    return this.currentUser?.subject ?? null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ROLE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  isRole(...roles: UserRole[]): boolean {
    return !!this.role && roles.includes(this.role);
  }

  get isAdmin():      boolean { return this.isRole('admin'); }
  get isTeacher():    boolean { return this.isRole('teacher'); }
  get isSuperAdmin(): boolean { return this.isRole('super_admin'); }
  get isStudent():    boolean { return this.isRole('student'); }

  redirectByRole(): void {
    const destinations: Record<UserRole, string> = {
      super_admin: '/super-admin/institutes',
      admin:       '/admin/dashboard',
      teacher:     '/teacher/dashboard',
      student:     '/student/dashboard',
    };
    const dest = this.role ? destinations[this.role] : '/auth/login';
    this.router.navigate([dest]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TOKEN UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

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

  isTokenExpired(): boolean {
    const payload = this.decodeToken();
    if (!payload?.['exp']) return true;
    return payload['exp'] * 1000 < Date.now();
  }

  tokenSecondsRemaining(): number {
    const payload = this.decodeToken();
    if (!payload?.['exp']) return 0;
    return Math.max(0, payload['exp'] - Math.floor(Date.now() / 1000));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private handleAuthSuccess(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    this.currentUserSubject.next(res.user);
  }

  private loadUserFromStorage(): AuthUser | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw) as AuthUser;
      if (!user._id || !user.role) return null;
      return user;
    } catch {
      return null;
    }
  }
}
