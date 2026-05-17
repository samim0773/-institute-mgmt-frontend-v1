import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import {
  FormBuilder, FormGroup, Validators, AbstractControl,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject }                from 'rxjs';
import { takeUntil, finalize }    from 'rxjs/operators';
import { MatStepper }             from '@angular/material/stepper';

import { StudentService, ClassSection } from './student.service';
import { NotificationService }          from '../../core/services/notification.service';

const BLOOD_GROUPS  = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const GENDERS       = [
  { value: 'male',   label: 'Male'   },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other'  },
];
const GUARDIAN_RELS = ['Father','Mother','Guardian','Uncle','Aunt','Grandparent','Other'];

@Component({
  selector:    'app-student-form',
  templateUrl: './student-form.component.html',
  styleUrls:   ['./student-form.component.scss'],
})
export class StudentFormComponent implements OnInit, OnDestroy {

  @ViewChild('stepper') stepper!: MatStepper;

  form!:    FormGroup;
  isEdit    = false;
  studentId = '';
  saving    = false;
  loading   = false;

  classNames:   string[]       = [];
  sections:     string[]       = [];
  classList:    ClassSection[] = [];
  bloodGroups  = BLOOD_GROUPS;
  genders      = GENDERS;
  guardianRels = GUARDIAN_RELS;

  private destroy$ = new Subject<void>();

  constructor(
    private fb:         FormBuilder,
    private route:      ActivatedRoute,
    private router:     Router,
    private studentSvc: StudentService,
    private notify:     NotificationService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadDropdownData();
    this.watchClassChange();

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        this.isEdit    = true;
        this.studentId = params['id'];
        this.loadStudent(params['id']);
      }
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ─── Form construction ─────────────────────────────────────────────────────
  private buildForm(): void {
    this.form = this.fb.group({
      personal: this.fb.group({
        class:        ['', Validators.required],
        section:      ['', Validators.required],
        rollNo:       ['', [Validators.required, Validators.maxLength(20)]],
        academicYear: [''],
        name:         ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
        dob:          [null],
        gender:       [''],
        bloodGroup:   [''],
      }),
      guardian: this.fb.group({
        guardianName:     ['', [Validators.required, Validators.maxLength(100)]],
        guardianPhone:    ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{7,15}$/)]],
        guardianEmail:    ['', Validators.email],
        guardianRelation: [''],
        emergencyContact: this.fb.group({
          name:         [''],
          relationship: [''],
          phone:        [''],
        }),
      }),
      address: this.fb.group({
        street:  [''],
        city:    [''],
        state:   [''],
        pincode: ['', Validators.pattern(/^[0-9]{6}$/)],
      }),
    });
  }

  get personalGroup(): FormGroup { return this.form.get('personal') as FormGroup; }
  get guardianGroup(): FormGroup { return this.form.get('guardian') as FormGroup; }
  get addressGroup():  FormGroup { return this.form.get('address')  as FormGroup; }

  // ─── Load dropdown data ────────────────────────────────────────────────────
  private loadDropdownData(): void {
    this.studentSvc.getClassNames()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => { this.classNames = res.data || []; });

    this.studentSvc.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => { this.classList = res.data || []; });
  }

  // ─── When class changes, update sections ──────────────────────────────────
  private watchClassChange(): void {
    this.personalGroup.get('class')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(cls => {
        this.personalGroup.get('section')!.setValue('', { emitEvent: false });
        this.sections = cls ? this.studentSvc.getSectionsForClass(cls) : [];
      });
  }

  // ─── Load existing student for editing ────────────────────────────────────
  private loadStudent(id: string): void {
    this.loading = true;
    this.studentSvc.getStudent(id)
      .pipe(takeUntil(this.destroy$), finalize(() => (this.loading = false)))
      .subscribe({
        next: res => {
          const s = res.data!;
          this.sections = this.studentSvc.getSectionsForClass(s.class);

          this.personalGroup.patchValue({
            class:        s.class,
            section:      s.section,
            rollNo:       s.rollNo,
            academicYear: (s as any).academicYear || '',
            name:         s.name,
            dob:          s.dob ? new Date(s.dob) : null,
            gender:       s.gender || '',
            bloodGroup:   s.bloodGroup || '',
          });

          this.guardianGroup.patchValue({
            guardianName:     s.guardianName,
            guardianPhone:    s.guardianPhone,
            guardianEmail:    (s as any).guardianEmail    || '',
            guardianRelation: (s as any).guardianRelation || '',
            emergencyContact: (s as any).emergencyContact || {},
          });

          this.addressGroup.patchValue((s as any).address || {});
        },
        error: () => {
          this.notify.error('Could not load student data.');
          this.router.navigate(['/admin/students']);
        },
      });
  }

  // ─── Stepper: validate current step then advance ──────────────────────────
  nextStep(groupName: string): void {
    const group = this.form.get(groupName) as FormGroup;
    group.markAllAsTouched();
    if (group.invalid) {
      this.notify.warn('Please fill in all required fields before continuing.');
      return;
    }
    this.stepper.next();
  }

  // ─── Submit ────────────────────────────────────────────────────────────────
  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notify.warn('Please fill in all required fields.');
      return;
    }

    this.saving = true;
    const payload = this.buildPayload();
    const call    = this.isEdit
      ? this.studentSvc.updateStudent(this.studentId, payload)
      : this.studentSvc.createStudent(payload);

    call.pipe(takeUntil(this.destroy$), finalize(() => (this.saving = false))).subscribe({
      next: res => {
        const action = this.isEdit ? 'updated' : 'added';
        this.notify.success(`${res.data?.name || 'Student'} ${action} successfully.`);
        this.router.navigate(['/admin/students']);
      },
    });
  }

  // ─── Build API payload ─────────────────────────────────────────────────────
  private buildPayload(): Record<string, any> {
    const p = this.personalGroup.getRawValue();
    const g = this.guardianGroup.getRawValue();
    const a = this.addressGroup.getRawValue();
    const payload: Record<string, any> = {};

    const set = (key: string, val: any) => {
      if (val !== null && val !== undefined && val !== '') payload[key] = val;
    };

    set('name',             p.name);
    set('class',            p.class.toUpperCase());
    set('section',          p.section.toUpperCase());
    set('rollNo',           p.rollNo);
    set('academicYear',     p.academicYear);
    set('dob',              p.dob ? (p.dob instanceof Date ? p.dob.toISOString() : p.dob) : null);
    set('gender',           p.gender);
    set('bloodGroup',       p.bloodGroup);
    set('guardianName',     g.guardianName);
    set('guardianPhone',    g.guardianPhone);
    set('guardianEmail',    g.guardianEmail);
    set('guardianRelation', g.guardianRelation);

    const ec = g.emergencyContact;
    if (ec.name || ec.phone) payload['emergencyContact'] = ec;

    if (a.street || a.city || a.state || a.pincode) payload['address'] = a;

    return payload;
  }

  // ─── Template helpers ──────────────────────────────────────────────────────
  g(groupName: string, field: string): AbstractControl {
    return this.form.get(`${groupName}.${field}`)!;
  }

  getError(groupName: string, field: string): string {
    const ctrl = this.g(groupName, field);
    if (!ctrl.touched || ctrl.valid) return '';
    if (ctrl.hasError('required'))  return 'This field is required';
    if (ctrl.hasError('minlength')) return `Minimum ${ctrl.errors?.['minlength']?.requiredLength} characters`;
    if (ctrl.hasError('maxlength')) return `Maximum ${ctrl.errors?.['maxlength']?.requiredLength} characters`;
    if (ctrl.hasError('email'))     return 'Enter a valid email address';
    if (ctrl.hasError('pattern')) {
      if (field === 'guardianPhone') return 'Enter a valid phone number (7–15 digits)';
      if (field === 'pincode')       return 'Pincode must be 6 digits';
      return 'Invalid format';
    }
    return 'Invalid value';
  }

  get pageTitle(): string { return this.isEdit ? 'Edit Student' : 'Add New Student'; }
  cancel(): void { this.router.navigate(['/admin/students']); }
}
