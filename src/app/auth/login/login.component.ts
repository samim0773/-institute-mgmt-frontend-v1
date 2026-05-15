import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector:    'app-login',
  templateUrl: './login.component.html',
  styleUrls:   ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {

  form!:           FormGroup;
  loading          = false;
  showPassword     = false;
  serverError      = '';
  private destroy$ = new Subject<void>();

  // returnUrl: where to send user after login (set by AuthGuard)
  private returnUrl = '';

  constructor(
    private fb:          FormBuilder,
    private authService: AuthService,
    private route:       ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Form construction ────────────────────────────────────────────────────
  private buildForm(): void {
    this.form = this.fb.group({
      email: [
        '',
        [Validators.required, Validators.email],
      ],
      password: [
        '',
        [Validators.required, Validators.minLength(1)],
      ],
    });

    // Clear server error when user starts typing again
    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.serverError) this.serverError = '';
      });
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid || this.loading) return;

    this.loading     = true;
    this.serverError = '';

    const { email, password } = this.form.value;

    this.authService
      .login({ email: email.trim().toLowerCase(), password })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      )
      .subscribe({
        next: () => {
          // Navigate to returnUrl if present, otherwise role-based redirect
          if (this.returnUrl) {
            // Use replaceUrl so the back-button doesn't loop to login
            window.location.replace(this.returnUrl);
          } else {
            this.authService.redirectByRole();
          }
        },
        error: (err) => {
          // 401 → wrong credentials. 403 → account deactivated.
          // ErrorInterceptor handles snackbar; we set the inline message too.
          const status = err?.status;
          if (status === 401) {
            this.serverError = 'Invalid email or password.';
          } else if (status === 403) {
            this.serverError = err.error?.message || 'Your account has been deactivated.';
          } else if (status === 0) {
            this.serverError = 'Cannot reach server. Check your connection.';
          } else {
            this.serverError = err.error?.message || 'Login failed. Please try again.';
          }
        },
      });
  }

  // ─── Getters for template ─────────────────────────────────────────────────
  get emailControl()    { return this.form.get('email')!;    }
  get passwordControl() { return this.form.get('password')!; }

  get emailError(): string {
    const c = this.emailControl;
    if (c.hasError('required')) return 'Email is required';
    if (c.hasError('email'))    return 'Enter a valid email address';
    return '';
  }

  get passwordError(): string {
    const c = this.passwordControl;
    if (c.hasError('required'))   return 'Password is required';
    if (c.hasError('minlength'))  return 'Password is too short';
    return '';
  }
}
