import { Component, OnInit, OnDestroy }  from '@angular/core';
import {
  FormBuilder, FormGroup, FormArray,
  Validators, AbstractControl,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject }                from 'rxjs';
import { takeUntil, finalize }    from 'rxjs/operators';

import { ExamService }         from './exam.service';
import { ClassService, ClassRecord } from '../classes/class.service';
import { SubjectService }      from '../subjects/subject.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector:    'app-exam-form',
  templateUrl: './exam-form.component.html',
  styleUrls:   ['./exam-form.component.scss'],
})
export class ExamFormComponent implements OnInit, OnDestroy {

  form!:    FormGroup;
  isEdit    = false;
  examId    = '';
  saving    = false;
  loading   = false;

  classNames:        string[]       = [];
  sections:          string[]       = [];
  availableSubjects: string[]       = [];
  loadingSubjects    = false;

  private allClasses: ClassRecord[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private fb:         FormBuilder,
    private route:      ActivatedRoute,
    private router:     Router,
    private examSvc:    ExamService,
    private classSvc:   ClassService,
    private subjectSvc: SubjectService,
    private notify:     NotificationService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadClasses(() => {
      this.setupClassSectionWatchers();
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe(p => {
        if (p['id']) { this.isEdit = true; this.examId = p['id']; this.loadExam(p['id']); }
      });
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ─── Build form ────────────────────────────────────────────────────────────
  private buildForm(): void {
    this.form = this.fb.group({
      name:               ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      class:              ['', Validators.required],
      section:            ['ALL'],
      startDate:          [null, Validators.required],
      endDate:            [null, Validators.required],
      academicYear:       ['', Validators.pattern(/^\d{4}-\d{2}$/)],
      center:             ['', Validators.maxLength(200)],
      instructions:       ['', Validators.maxLength(1000)],
      admitCardIssueDate: [null],
      subjects:           this.fb.array([this.newSubjectRow()], Validators.minLength(1)),
    }, { validators: this.endAfterStart });
  }

  private endAfterStart(group: AbstractControl) {
    const start = group.get('startDate')?.value;
    const end   = group.get('endDate')?.value;
    if (start && end) {
      const s = new Date(start); s.setHours(0, 0, 0, 0);
      const e = new Date(end);   e.setHours(0, 0, 0, 0);
      if (e < s) group.get('endDate')?.setErrors({ endBeforeStart: true });
    }
    return null;
  }

  // ─── Subject rows ──────────────────────────────────────────────────────────
  get subjects(): FormArray { return this.form.get('subjects') as FormArray; }

  newSubjectRow(): FormGroup {
    return this.fb.group({
      name:             ['', [Validators.required, Validators.maxLength(100)]],
      maxMarks:         [100, [Validators.required, Validators.min(1), Validators.max(1000)]],
      passingMarks:     [35,  [Validators.required, Validators.min(0)]],
      hasOral:          [false],
      writtenMaxMarks:  [null],
      oralMaxMarks:     [null],
      oralPassingMarks: [null],
      examDate:         [null],
      examTime:         ['', Validators.maxLength(50)],
    });
  }

  // Number of calendar days in the exam (start and end both inclusive), 0 if dates not set/invalid
  get examDays(): number {
    const start = this.form.get('startDate')?.value;
    const end   = this.form.get('endDate')?.value;
    if (!start || !end) return 0;
    const s = new Date(start); s.setHours(0, 0, 0, 0);
    const e = new Date(end);   e.setHours(0, 0, 0, 0);
    if (e < s) return 0;
    return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
  }

  get subjectLimitReached(): boolean {
    return this.examDays > 0 && this.subjects.length >= this.examDays;
  }

  addSubject(): void {
    if (this.subjectLimitReached) {
      this.notify.warn(
        `A ${this.examDays}-day exam can have at most ${this.examDays} subject(s). ` +
        `Extend the exam dates to add more.`
      );
      return;
    }
    this.subjects.push(this.newSubjectRow());
  }

  removeSubject(i: number): void {
    if (this.subjects.length > 1) this.subjects.removeAt(i);
    else this.notify.warn('An exam must have at least one subject.');
  }

  toggleOral(i: number): void {
    const row    = this.subjects.at(i) as FormGroup;
    const hasOral = row.get('hasOral')!.value;
    if (!hasOral) {
      row.patchValue({ writtenMaxMarks: null, oralMaxMarks: null, oralPassingMarks: null });
    }
  }

  // ─── Load classes (once, used for both classNames and sections) ─────────
  private loadClasses(callback?: () => void): void {
    this.classSvc.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.allClasses = res.data || [];
          const seen = new Set<string>();
          this.classNames = this.allClasses
            .map((c: ClassRecord) => c.className)
            .filter(n => seen.has(n) ? false : (seen.add(n), true));
          callback?.();
        },
        error: () => callback?.(),
      });
  }

  // ─── Watch class/section to populate sections & subjects ────────────────
  private setupClassSectionWatchers(): void {
    this.form.get('class')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(cls => {
        this.form.get('section')!.setValue('ALL', { emitEvent: false });
        this.availableSubjects = [];
        if (cls) {
          const matched = this.allClasses.filter(c => c.className === cls);
          const seen    = new Set<string>();
          this.sections = matched
            .map(c => c.section)
            .filter(s => seen.has(s) ? false : (seen.add(s), true));
        } else {
          this.sections = [];
        }
      });

    this.form.get('section')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(sec => {
        this.availableSubjects = [];
        const cls = this.form.get('class')!.value;
        if (cls && sec && sec !== 'ALL') {
          this.loadSubjectsForClass(cls, sec);
        }
      });
  }

  private loadSubjectsForClass(className: string, section: string): void {
    this.loadingSubjects = true;
    this.subjectSvc.getSubjects({ className, section, isActive: true })
      .pipe(takeUntil(this.destroy$), finalize(() => this.loadingSubjects = false))
      .subscribe({
        next: res => {
          this.availableSubjects = (res.data || []).map((s: any) => s.subjectName as string);
        },
        error: () => { this.availableSubjects = []; },
      });
  }

  // ─── Load exam for edit ────────────────────────────────────────────────────
  private loadExam(id: string): void {
    this.loading = true;
    this.examSvc.getExam(id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: res => {
          const e = res.data;

          // Set class+section without triggering watchers
          this.form.get('class')!.setValue(e.class, { emitEvent: false });
          this.form.get('section')!.setValue(e.section || 'ALL', { emitEvent: false });

          // Derive sections from already-loaded class list
          if (e.class) {
            const matched = this.allClasses.filter(c => c.className === e.class);
            const seen    = new Set<string>();
            this.sections = matched
              .map(c => c.section)
              .filter(s => seen.has(s) ? false : (seen.add(s), true));
          }

          // Load available subjects for the exam's class-section
          if (e.class && e.section && e.section !== 'ALL') {
            this.loadSubjectsForClass(e.class, e.section);
          }

          // Rebuild subjects array
          while (this.subjects.length) this.subjects.removeAt(0);
          (e.subjects || []).forEach((s: any) => {
            const hasOral = !!(s.oralMaxMarks && s.oralMaxMarks > 0);
            this.subjects.push(this.fb.group({
              name:             [s.name,                    [Validators.required, Validators.maxLength(100)]],
              maxMarks:         [s.maxMarks,                [Validators.required, Validators.min(1), Validators.max(1000)]],
              passingMarks:     [s.passingMarks,            [Validators.required, Validators.min(0)]],
              hasOral:          [hasOral],
              writtenMaxMarks:  [hasOral ? s.writtenMaxMarks ?? null : null],
              oralMaxMarks:     [hasOral ? s.oralMaxMarks   ?? null : null],
              oralPassingMarks: [hasOral ? s.oralPassingMarks ?? null : null],
              examDate:         [s.examDate ? new Date(s.examDate) : null],
              examTime:         [s.examTime || '', Validators.maxLength(50)],
            }));
          });

          // Patch the remaining scalar fields (no emitEvent needed — no watcher on these)
          this.form.patchValue({
            name:               e.name,
            startDate:          e.startDate          ? new Date(e.startDate)          : null,
            endDate:            e.endDate            ? new Date(e.endDate)            : null,
            academicYear:       e.academicYear        || '',
            center:             e.center             || '',
            instructions:       e.instructions       || '',
            admitCardIssueDate: e.admitCardIssueDate ? new Date(e.admitCardIssueDate) : null,
          }, { emitEvent: false });
        },
        error: () => {
          this.notify.error('Could not load exam.');
          this.router.navigate(['/admin/exams']);
        },
      });
  }

  // ─── Submit ────────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warn('Please fix the highlighted errors.');
      return;
    }

    // Subject count must not exceed exam duration in days
    const days = this.examDays;
    const subs = this.form.getRawValue().subjects as any[];
    if (days > 0 && subs.length > days) {
      this.notify.warn(
        `A ${days}-day exam can have at most ${days} subject(s). ` +
        `Remove ${subs.length - days} subject(s) or extend the exam dates.`
      );
      return;
    }

    // Client-side: written + oral must equal maxMarks when both provided
    for (const s of subs) {
      if (s.hasOral && s.writtenMaxMarks != null && s.oralMaxMarks != null) {
        if (Number(s.writtenMaxMarks) + Number(s.oralMaxMarks) !== Number(s.maxMarks)) {
          this.notify.warn(`"${s.name}": Written (${s.writtenMaxMarks}) + Oral (${s.oralMaxMarks}) must equal Max Marks (${s.maxMarks}).`);
          return;
        }
      }
    }

    this.saving = true;
    const payload = this.buildPayload();
    const call    = this.isEdit
      ? this.examSvc.updateExam(this.examId, payload)
      : this.examSvc.createExam(payload);

    call.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false))
      .subscribe({
        next: res => {
          this.notify.success(
            this.isEdit ? `"${res.data?.name}" updated.` : `"${res.data?.name}" created as draft.`
          );
          this.router.navigate(['/admin/exams']);
        },
      });
  }

  private buildPayload(): Record<string, any> {
    const v = this.form.getRawValue();
    return {
      name:     v.name.trim(),
      class:    v.class.toUpperCase(),
      section:  (v.section || 'ALL').toUpperCase(),
      startDate: v.startDate instanceof Date ? v.startDate.toISOString() : v.startDate,
      endDate:   v.endDate   instanceof Date ? v.endDate.toISOString()   : v.endDate,
      ...(v.academicYear       && { academicYear:       v.academicYear }),
      ...(v.center             && { center:             v.center.trim() }),
      ...(v.instructions       && { instructions:       v.instructions.trim() }),
      ...(v.admitCardIssueDate && { admitCardIssueDate: v.admitCardIssueDate instanceof Date
        ? v.admitCardIssueDate.toISOString() : v.admitCardIssueDate }),
      subjects: v.subjects.map((s: any) => {
        const sub: Record<string, any> = {
          name:         s.name.trim(),
          maxMarks:     Number(s.maxMarks),
          passingMarks: Number(s.passingMarks),
          ...(s.examDate      && { examDate:      s.examDate instanceof Date ? s.examDate.toISOString() : s.examDate }),
          ...(s.examTime      && { examTime:      s.examTime.trim() }),
        };
        if (s.hasOral) {
          if (s.writtenMaxMarks  != null) sub['writtenMaxMarks']  = Number(s.writtenMaxMarks);
          if (s.oralMaxMarks     != null) sub['oralMaxMarks']     = Number(s.oralMaxMarks);
          if (s.oralPassingMarks != null) sub['oralPassingMarks'] = Number(s.oralPassingMarks);
        }
        return sub;
      }),
    };
  }

  // ─── Template helpers ─────────────────────────────────────────────────────
  g(path: string): AbstractControl { return this.form.get(path)!; }

  sg(i: number, field: string): AbstractControl {
    return (this.subjects.at(i) as FormGroup).get(field)!;
  }

  isOral(i: number): boolean {
    return !!(this.subjects.at(i) as FormGroup).get('hasOral')?.value;
  }

  writtenOralMismatch(i: number): boolean {
    const row     = this.subjects.at(i) as FormGroup;
    if (!row.get('hasOral')?.value) return false;
    const written = row.get('writtenMaxMarks')?.value;
    const oral    = row.get('oralMaxMarks')?.value;
    const max     = row.get('maxMarks')?.value;
    if (written == null || oral == null || !max) return false;
    return Number(written) + Number(oral) !== Number(max);
  }

  getError(path: string): string {
    const c = this.g(path);
    if (!c.touched || c.valid) return '';
    if (c.hasError('required'))       return 'Required';
    if (c.hasError('minlength'))      return `Min ${c.errors?.['minlength'].requiredLength} chars`;
    if (c.hasError('maxlength'))      return `Max ${c.errors?.['maxlength'].requiredLength} chars`;
    if (c.hasError('pattern'))        return 'Format: YYYY-YY (e.g. 2024-25)';
    if (c.hasError('endBeforeStart')) return 'End date cannot be before start date';
    if (c.hasError('min'))            return `Minimum value: ${c.errors?.['min'].min}`;
    if (c.hasError('max'))            return `Maximum value: ${c.errors?.['max'].max}`;
    return 'Invalid';
  }

  get pageTitle(): string { return this.isEdit ? 'Edit Exam' : 'Create New Exam'; }
  cancel():         void  { this.router.navigate(['/admin/exams']); }
}
