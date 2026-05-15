import { Component, OnInit, OnDestroy }               from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router }                        from '@angular/router';
import { HttpClient }                                    from '@angular/common/http';
import { Subject }                                       from 'rxjs';
import { takeUntil, finalize }                           from 'rxjs/operators';

import { ClassService, ClassRecord } from './class.service';
import { NotificationService }       from '../../core/services/notification.service';
import { environment }               from '../../../environments/environment';

interface Teacher { _id: string; name: string; subject: string; email: string; }

@Component({
  selector:    'app-class-form',
  templateUrl: './class-form.component.html',
  styleUrls:   ['./class-form.component.scss'],
})
export class ClassFormComponent implements OnInit, OnDestroy {

  form!:         FormGroup;
  saving         = false;
  loading        = false;
  isEditMode     = false;
  classId        = '';

  teachers:      Teacher[] = [];
  classNames:    string[]  = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb:       FormBuilder,
    private route:    ActivatedRoute,
    private router:   Router,
    private http:     HttpClient,
    private classSvc: ClassService,
    private notify:   NotificationService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadTeachers();
    this.loadClassNames();

    this.classId = this.route.snapshot.paramMap.get('id') || '';
    if (this.classId) {
      this.isEditMode = true;
      this.loadClass(this.classId);
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private buildForm(): void {
    this.form = this.fb.group({
      className:      ['', [Validators.required, Validators.maxLength(10)]],
      section:        ['', [Validators.required, Validators.maxLength(5)]],
      classTeacherId: [null],
      academicYear:   ['', [Validators.pattern(/^\d{4}-\d{2}$/)]],
      roomNumber:     ['', [Validators.maxLength(20)]],
    });
  }

  private loadTeachers(): void {
    this.http.get<any>(`${environment.apiUrl}/auth/teachers`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: res => { this.teachers = res.data || []; } });
  }

  private loadClassNames(): void {
    this.classSvc.getClassNames()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: res => { this.classNames = res.data || []; } });
  }

  private loadClass(id: string): void {
    this.loading = true;
    this.classSvc.getClass(id)
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          const c: ClassRecord = res.data;
          this.form.patchValue({
            className:      c.className,
            section:        c.section,
            classTeacherId: c.classTeacherId?._id ?? null,
            academicYear:   c.academicYear || '',
            roomNumber:     c.roomNumber   || '',
          });
        },
        error: () => { this.router.navigate(['/admin/classes']); },
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warn('Please fix the errors before saving.');
      return;
    }

    const v = this.form.value;
    const payload: any = {
      className: v.className.trim().toUpperCase(),
      section:   v.section.trim().toUpperCase(),
    };

    // Only include optional fields if they have a value
    if (v.classTeacherId)          payload.classTeacherId = v.classTeacherId;
    if (!v.classTeacherId && this.isEditMode) payload.classTeacherId = null; // allow removal
    if (v.academicYear?.trim())    payload.academicYear  = v.academicYear.trim();
    if (v.roomNumber?.trim())      payload.roomNumber    = v.roomNumber.trim();

    this.saving = true;
    const req$ = this.isEditMode
      ? this.classSvc.updateClass(this.classId, payload)
      : this.classSvc.createClass(payload);

    req$.pipe(finalize(() => this.saving = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.notify.success(res.message || (this.isEditMode ? 'Class updated.' : 'Class created.'));
          this.router.navigate(['/admin/classes']);
        },
      });
  }

  g(path: string): AbstractControl { return this.form.get(path)!; }

  getError(path: string): string {
    const ctrl = this.g(path);
    if (!ctrl.touched || ctrl.valid) return '';
    if (ctrl.hasError('required'))   return 'This field is required';
    if (ctrl.hasError('maxlength'))  return `Max ${ctrl.errors?.['maxlength']?.requiredLength} characters`;
    if (ctrl.hasError('pattern'))    return 'Format must be YYYY-YY (e.g. 2025-26)';
    return 'Invalid value';
  }

  cancel(): void { this.router.navigate(['/admin/classes']); }
}
