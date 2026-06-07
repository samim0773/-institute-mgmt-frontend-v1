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

  // 0 = Staff (admin/teacher), 1 = Student
  activeTab        = 0;

  staffForm!:      FormGroup;
  studentForm!:    FormGroup;

  loading          = false;
  showPassword     = false;
  showStudentPwd   = false;
  serverError      = '';

  private returnUrl = '';
  private destroy$  = new Subject<void>();

  constructor(
    private fb:          FormBuilder,
    private authService: AuthService,
    private route:       ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.buildForms();
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '';

    // If ?tab=student in URL, open student tab automatically
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'student') this.activeTab = 1;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForms(): void {
    this.staffForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(1)]],
    });

    this.studentForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(1)]],
    });

    // Clear server error on input
    this.staffForm.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => { if (this.serverError) this.serverError = ''; });

    this.studentForm.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => { if (this.serverError) this.serverError = ''; });
  }

  selectTab(index: number): void {
    this.activeTab   = index;
    this.serverError = '';
  }

  // ─── Staff login ─────────────────────────────────────────────────────────
  onStaffSubmit(): void {
    if (this.staffForm.invalid || this.loading) return;

    this.loading     = true;
    this.serverError = '';

    const { email, password } = this.staffForm.value;

    this.authService
      .login({ email: email.trim().toLowerCase(), password })
      .pipe(takeUntil(this.destroy$), finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          if (this.returnUrl) {
            window.location.replace(this.returnUrl);
          } else {
            this.authService.redirectByRole();
          }
        },
        error: (err) => { this.serverError = this.parseError(err); },
      });
  }

  // ─── Student login ───────────────────────────────────────────────────────
  onStudentSubmit(): void {
    if (this.studentForm.invalid || this.loading) return;

    this.loading     = true;
    this.serverError = '';

    const { username, password } = this.studentForm.value;

    this.authService
      .studentLogin({ username: username.trim().toLowerCase(), password })
      .pipe(takeUntil(this.destroy$), finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.authService.redirectByRole();
        },
        error: (err) => { this.serverError = this.parseError(err); },
      });
  }

  private parseError(err: any): string {
    const status = err?.status;
    if (status === 401) return 'Invalid credentials. Please check and try again.';
    if (status === 402) return err.error?.message || 'Your plan has expired. Please contact your institute.';
    if (status === 403) return err.error?.message || 'Access denied. Please contact your institute.';
    if (status === 400) return err.error?.message || 'Please check your input and try again.';
    if (status === 0)   return 'Cannot reach server. Check your internet connection.';
    return err.error?.message || 'Login failed. Please try again.';
  }

  // ─── Form control getters ────────────────────────────────────────────────
  get emailControl()    { return this.staffForm.get('email')!; }
  get passwordControl() { return this.staffForm.get('password')!; }
  get usernameControl() { return this.studentForm.get('username')!; }
  get studentPwdControl() { return this.studentForm.get('password')!; }

  get emailError(): string {
    const c = this.emailControl;
    if (c.hasError('required')) return 'Email is required';
    if (c.hasError('email'))    return 'Enter a valid email address';
    return '';
  }

  get passwordError(): string {
    const c = this.passwordControl;
    if (c.hasError('required'))  return 'Password is required';
    if (c.hasError('minlength')) return 'Password is too short';
    return '';
  }

  get usernameError(): string {
    const c = this.usernameControl;
    if (c.hasError('required'))  return 'Username is required';
    if (c.hasError('minlength')) return 'Username is too short';
    return '';
  }
}
