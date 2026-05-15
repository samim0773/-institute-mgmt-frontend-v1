import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder, FormGroup, Validators, AbstractControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { FeeService } from './fee.service';
import { StudentService } from '../students/student.service';
import { NotificationService } from '../../core/services/notification.service';

type FeeMode = 'bulk' | 'single';

const FEE_TYPES = [
  'Tuition Fee', 'Exam Fee', 'Library Fee', 'Sports Fee',
  'Transport Fee', 'Lab Fee', 'Activity Fee', 'Admission Fee', 'Other',
];

@Component({
  selector: 'app-generate-fee',
  templateUrl: './generate-fee.component.html',
  styleUrls: ['./generate-fee.component.scss'],
})
export class GenerateFeeComponent implements OnInit, OnDestroy {

  mode: FeeMode = 'bulk';
  form!: FormGroup;
  saving = false;

  classNames: string[] = [];
  sections: string[] = [];
  students: { _id: string; name: string; rollNo: string }[] = [];
  loadingStudents = false;
  feeTypes = FEE_TYPES;
  customFeeType = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private feeSvc: FeeService,
    private studentSvc: StudentService,
    private notify: NotificationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadClassNames();
    this.watchClassChange();
    this.watchFeeTypeChange();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private buildForm(): void {
    this.form = this.fb.group({
      class:             [''],
      section:           [''],
      studentId:         [''],
      feeType:           ['', Validators.required],
      customFeeTypeText: [''],
      amount:            [null, [Validators.required, Validators.min(1)]],
      dueDate:           [null, Validators.required],
      academicYear:      [''],
      lateFinePerDay:    [null, [Validators.min(0)]],
      notes:             ['', Validators.maxLength(500)],
    });
  }

  private loadClassNames(): void {
    this.studentSvc.getClassNames().pipe(takeUntil(this.destroy$))
      .subscribe(res => { this.classNames = res.data || []; });
    this.studentSvc.getClasses().pipe(takeUntil(this.destroy$)).subscribe();
  }

  private watchClassChange(): void {
    this.form.get('class')!.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(cls => {
        this.form.get('section')!.setValue('', { emitEvent: false });
        this.form.get('studentId')!.setValue('');
        this.sections = cls ? this.studentSvc.getSectionsForClass(cls) : [];
        this.students = [];
      });

    this.form.get('section')!.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(sec => {
        this.form.get('studentId')!.setValue('');
        const cls = this.form.get('class')!.value;
        if (this.mode === 'single' && cls && sec) {
          this.loadStudents(cls, sec);
        } else {
          this.students = [];
        }
      });
  }

  private watchFeeTypeChange(): void {
    this.form.get('feeType')!.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(val => {
        this.customFeeType = val === 'Other';
        if (val !== 'Other') this.form.get('customFeeTypeText')!.setValue('');
      });
  }

  setMode(m: FeeMode): void {
    this.mode = m;
    this.form.patchValue({ class: '', section: '', studentId: '' });
    this.sections = [];
    this.students = [];
  }

  private loadStudents(cls: string, sec: string): void {
    this.loadingStudents = true;
    this.studentSvc.getStudents({ class: cls, section: sec, limit: 200 } as any)
      .pipe(finalize(() => this.loadingStudents = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.students = (res.data || []).map((s: any) => ({
            _id: s._id, name: s.name, rollNo: s.rollNo,
          }));
        },
      });
  }

  onSubmit(): void {
    this.applyValidators();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warn('Please fill in all required fields.');
      return;
    }

    const v = this.form.value;
    const feeType = this.customFeeType
      ? (v.customFeeTypeText?.trim() || '')
      : v.feeType;

    const payload: any = {
      feeType,
      amount:  Number(v.amount),
      dueDate: v.dueDate instanceof Date ? v.dueDate.toISOString() : v.dueDate,
    };

    if (v.academicYear?.trim())                       payload.academicYear  = v.academicYear.trim();
    if (v.lateFinePerDay !== null && v.lateFinePerDay !== '') payload.lateFinePerDay = Number(v.lateFinePerDay);
    if (v.notes?.trim())                              payload.notes         = v.notes.trim();

    if (this.mode === 'bulk') {
      payload.class   = v.class;
      payload.section = v.section;
    } else {
      payload.studentId = v.studentId;
    }

    this.saving = true;
    this.feeSvc.generateFee(payload)
      .pipe(finalize(() => this.saving = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          const count = res.data?.count ?? res.data?.length ?? '';
          this.notify.success(
            this.mode === 'bulk'
              ? `Fees generated${count ? ' for ' + count + ' student(s)' : ''}.`
              : 'Fee generated successfully.'
          );
          this.router.navigate(['/admin/fees']);
        },
      });
  }

  private applyValidators(): void {
    const cls   = this.form.get('class')!;
    const sec   = this.form.get('section')!;
    const stdId = this.form.get('studentId')!;

    cls.setValidators(Validators.required);
    sec.setValidators(Validators.required);
    stdId.setValidators(this.mode === 'single' ? Validators.required : null);

    [cls, sec, stdId].forEach(c => c.updateValueAndValidity({ emitEvent: false }));
  }

  g(path: string): AbstractControl { return this.form.get(path)!; }

  getError(path: string): string {
    const ctrl = this.g(path);
    if (!ctrl.touched || ctrl.valid) return '';
    if (ctrl.hasError('required')) return 'This field is required';
    if (ctrl.hasError('min'))      return `Must be at least ${ctrl.errors?.['min']?.min}`;
    if (ctrl.hasError('maxlength')) return `Max ${ctrl.errors?.['maxlength']?.requiredLength} characters`;
    return 'Invalid value';
  }

  cancel(): void { this.router.navigate(['/admin/fees']); }
}
