import { Component, OnInit, OnDestroy }                from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router }                       from '@angular/router';
import { HttpClient }                                   from '@angular/common/http';
import { Subject }                                      from 'rxjs';
import { takeUntil, finalize }                          from 'rxjs/operators';

import { SubjectService, SubjectAssignment } from './subject.service';
import { ClassService, ClassRecord }         from '../classes/class.service';
import { NotificationService }               from '../../core/services/notification.service';
import { environment }                       from '../../../environments/environment';

interface Teacher { _id: string; name: string; subject: string; email: string; }

const COMMON_SUBJECTS = [
  'Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology',
  'English', 'Hindi', 'History', 'Geography', 'Social Studies',
  'Computer Science', 'Physical Education', 'Arts', 'Music',
];

@Component({
  selector:    'app-subject-form',
  templateUrl: './subject-form.component.html',
  styleUrls:   ['./subject-form.component.scss'],
})
export class SubjectFormComponent implements OnInit, OnDestroy {

  form!:       FormGroup;
  saving       = false;
  loading      = false;
  isEditMode   = false;
  assignmentId = '';

  // Dropdown data
  allClasses:   ClassRecord[] = [];
  classNames:   string[]      = [];
  sections:     string[]      = [];
  teachers:     Teacher[]     = [];
  commonSubjects = COMMON_SUBJECTS;

  // For edit mode — read-only display
  existingAssignment: SubjectAssignment | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb:         FormBuilder,
    private route:      ActivatedRoute,
    private router:     Router,
    private http:       HttpClient,
    private subjectSvc: SubjectService,
    private classSvc:   ClassService,
    private notify:     NotificationService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadClasses();
    this.loadTeachers();
    this.watchClassChange();

    this.assignmentId = this.route.snapshot.paramMap.get('id') || '';
    if (this.assignmentId) {
      this.isEditMode = true;
      this.loadAssignment(this.assignmentId);
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private buildForm(): void {
    this.form = this.fb.group({
      // Create-only fields
      className:      ['', Validators.required],
      section:        ['', Validators.required],
      classSectionId: ['', Validators.required],
      subjectName:    ['', [Validators.required, Validators.maxLength(100)]],
      // Shared fields
      teacherId:      [null],
      isActive:       [true],
    });
  }

  private loadClasses(): void {
    this.classSvc.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.allClasses = (res.data || []).filter((c: ClassRecord) => c.isActive);
          this.classNames = [...new Set(this.allClasses.map((c: ClassRecord) => c.className))];
        },
      });
  }

  private loadTeachers(): void {
    this.http.get<any>(`${environment.apiUrl}/auth/teachers`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: res => { this.teachers = res.data || []; } });
  }

  private watchClassChange(): void {
    this.g('className').valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(cls => {
        this.g('section').setValue('');
        this.g('classSectionId').setValue('');
        this.sections = cls
          ? [...new Set(this.allClasses.filter(c => c.className === cls).map(c => c.section))]
          : [];
      });

    this.g('section').valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(sec => {
        const cls = this.g('className').value;
        const match = this.allClasses.find(c => c.className === cls && c.section === sec);
        this.g('classSectionId').setValue(match?._id || '');
      });
  }

  private loadAssignment(id: string): void {
    this.loading = true;
    this.subjectSvc.getSubject(id)
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.existingAssignment = res.data;
          const a = res.data as SubjectAssignment;
          // In edit mode only teacher + isActive are editable
          this.form.patchValue({
            teacherId: a.teacherId?._id ?? null,
            isActive:  a.isActive,
          });
          // Disable create-only fields
          ['className', 'section', 'classSectionId', 'subjectName'].forEach(f =>
            this.g(f).disable()
          );
        },
        error: () => this.router.navigate(['/admin/subjects']),
      });
  }

  pickSubject(name: string): void {
    this.g('subjectName').setValue(name);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warn('Please fill in all required fields.');
      return;
    }

    this.saving = true;

    if (this.isEditMode) {
      const payload: any = { teacherId: this.g('teacherId').value ?? null };
      if (this.g('isActive').value !== this.existingAssignment?.isActive) {
        payload.isActive = this.g('isActive').value;
      }
      this.subjectSvc.updateSubject(this.assignmentId, payload)
        .pipe(finalize(() => this.saving = false), takeUntil(this.destroy$))
        .subscribe({
          next: res => {
            this.notify.success(res.message || 'Assignment updated.');
            this.router.navigate(['/admin/subjects']);
          },
        });
    } else {
      const payload: any = {
        classSectionId: this.g('classSectionId').value,
        subjectName:    this.g('subjectName').value.trim(),
      };
      if (this.g('teacherId').value) payload.teacherId = this.g('teacherId').value;

      this.subjectSvc.createSubject(payload)
        .pipe(finalize(() => this.saving = false), takeUntil(this.destroy$))
        .subscribe({
          next: res => {
            this.notify.success(res.message || 'Subject assigned.');
            this.router.navigate(['/admin/subjects']);
          },
        });
    }
  }

  g(path: string): AbstractControl { return this.form.get(path)!; }

  getError(path: string): string {
    const ctrl = this.g(path);
    if (!ctrl.touched || ctrl.valid) return '';
    if (ctrl.hasError('required'))  return 'This field is required';
    if (ctrl.hasError('maxlength')) return `Max ${ctrl.errors?.['maxlength']?.requiredLength} characters`;
    return 'Invalid value';
  }

  cancel(): void { this.router.navigate(['/admin/subjects']); }
}
