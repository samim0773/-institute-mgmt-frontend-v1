import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder, FormGroup, Validators, AbstractControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../core/services/notification.service';
import { StudentService } from '../../admin/students/student.service';

const COMMON_SUBJECTS = [
  'Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology',
  'English', 'Hindi', 'History', 'Geography', 'Social Studies',
  'Computer Science', 'Physical Education', 'Arts', 'Music', 'Other',
];

@Component({
  selector: 'app-add-teacher',
  templateUrl: './add-teacher.component.html',
  styleUrls: ['./add-teacher.component.scss'],
})
export class AddTeacherComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  saving = false;
  showPassword = false;
  classNames: string[] = [];
  subjects = COMMON_SUBJECTS;
  customSubject = false;   // toggle for free-text subject entry

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private notify: NotificationService,
    private studentSvc: StudentService,
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.loadClassNames();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private buildForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
      ]],
      subject: [''],
      customSubjectText: [''],
      assignedClasses: [[]],
    });

    // When subject dropdown changes to "Other", switch to free-text
    this.form.get('subject')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => {
        this.customSubject = val === 'Other';
        if (val !== 'Other') {
          this.form.get('customSubjectText')!.setValue('');
        }
      });
  }

  private loadClassNames(): void {
    this.studentSvc.getClassNames()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => { this.classNames = res.data || []; });
    this.studentSvc.getClasses().pipe(takeUntil(this.destroy$)).subscribe();
  }

  toggleClass(cls: string): void {
    const current: string[] = this.form.get('assignedClasses')!.value || [];
    const idx = current.indexOf(cls);
    const updated = idx === -1
      ? [...current, cls]
      : current.filter(c => c !== cls);
    this.form.get('assignedClasses')!.setValue(updated);
  }

  isClassSelected(cls: string): boolean {
    return (this.form.get('assignedClasses')!.value || []).includes(cls);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warn('Please fill in all required fields.');
      return;
    }

    const v = this.form.value;
    // Resolve subject — use custom text if "Other" was selected
    const subject = this.customSubject
      ? v.customSubjectText?.trim()
      : (v.subject || undefined);

    const payload = {
      name: v.name.trim(),
      email: v.email.trim(),
      password: v.password,
      subject: subject || undefined,
      assignedClasses: v.assignedClasses || [],
    };

    this.saving = true;
    this.http.post<any>(`${environment.apiUrl}/auth/add-teacher`, payload)
      .pipe(finalize(() => this.saving = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.notify.success(
            `${res.data?.name || 'Teacher'} added successfully. They can now log in.`
          );
          this.router.navigate(['/admin/teachers']);
        },
      });
  }

  // ── Template helpers ───────────────────────────────────────────────────────
  g(path: string): AbstractControl { return this.form.get(path)!; }

  getError(path: string): string {
    const ctrl = this.g(path);
    if (!ctrl.touched || ctrl.valid) return '';
    if (ctrl.hasError('required')) return 'This field is required';
    if (ctrl.hasError('minlength')) return `Min ${ctrl.errors?.['minlength']?.requiredLength} characters`;
    if (ctrl.hasError('email')) return 'Enter a valid email address';
    if (ctrl.hasError('pattern')) {
      if (path === 'password') return 'Must contain uppercase, lowercase, and a number';
      return 'Invalid format';
    }
    return 'Invalid value';
  }

  get passwordStrength(): 'weak' | 'ok' | 'strong' {
    const v = this.g('password').value || '';
    if (v.length < 6) return 'weak';
    const hasUpper = /[A-Z]/.test(v);
    const hasLower = /[a-z]/.test(v);
    const hasNum = /\d/.test(v);
    const hasSpec = /[^A-Za-z0-9]/.test(v);
    const score = [hasUpper, hasLower, hasNum, hasSpec, v.length >= 10].filter(Boolean).length;
    return score >= 4 ? 'strong' : 'ok';
  }

  cancel(): void { this.router.navigate(['/admin/teachers']); }

  hasUppercase(): boolean {
    const password = this.g('password').value || '';
    return /[A-Z]/.test(password);
  }

  hasNumber(): boolean {
    const password = this.g('password').value || '';
    return /[0-9]/.test(password);
  }
}
