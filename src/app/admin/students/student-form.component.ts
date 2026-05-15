import {
  Component, OnInit, OnDestroy,
} from '@angular/core';
import {
  FormBuilder, FormGroup, Validators, AbstractControl,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject }                from 'rxjs';
import { takeUntil, finalize }    from 'rxjs/operators';

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

  form!:    FormGroup;
  isEdit    = false;
  studentId = '';
  saving    = false;
  loading   = false;   // loading existing student data for edit

  // Dropdown data
  classNames:   string[]       = [];
  sections:     string[]       = [];
  classList:    ClassSection[] = [];
  bloodGroups  = BLOOD_GROUPS;
  genders      = GENDERS;
  guardianRels = GUARDIAN_RELS;

  // UI state
  activeTab = 0;  // 0: Personal, 1: Guardian, 2: Address

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

    // Detect edit vs create from route
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        this.isEdit    = true;
        this.studentId = params['id'];
        this.loadStudent(params['id']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Form construction ─────────────────────────────────────────────────────
  private buildForm(): void {
    this.form = this.fb.group({
      // ── Academic placement ─────────────────────────────────────────────────
      class: ['', Validators.required],
      section: ['', Validators.required],
      rollNo: ['', [Validators.required, Validators.maxLength(20)]],
      admissionNo: ['', Validators.maxLength(30)],
      academicYear: [''],

      // ── Personal ──────────────────────────────────────────────────────────
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      dob: [null],
      gender: [''],
      bloodGroup: [''],

      // ── Guardian ──────────────────────────────────────────────────────────
      guardianName: ['', [Validators.required, Validators.maxLength(100)]],
      guardianPhone: ['', [
        Validators.required,
        Validators.pattern(/^[0-9+\-\s()]{7,15}$/),
      ]],
      guardianEmail: ['', Validators.email],
      guardianRelation: [''],

      // ── Emergency contact ─────────────────────────────────────────────────
      emergencyContact: this.fb.group({
        name: [''],
        relationship: [''],
        phone: [''],
      }),

      // ── Address ───────────────────────────────────────────────────────────
      address: this.fb.group({
        street:  [''],
        city:    [''],
        state:   [''],
        pincode: ['', Validators.pattern(/^[0-9]{6}$/)],
      }),
    });
  }

  // ─── Load dropdown data ────────────────────────────────────────────────────
  private loadDropdownData(): void {
    // Load class names for the class dropdown
    this.studentSvc.getClassNames()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.classNames = res.data || [];
      });

    // Load full class list (needed to derive sections)
    this.studentSvc.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.classList = res.data || [];
      });
  }

  // ─── When class changes, update sections dropdown ──────────────────────────
  private watchClassChange(): void {
    this.form.get('class')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(cls => {
        // Reset section when class changes
        this.form.get('section')!.setValue('', { emitEvent: false });
        this.sections = cls ? this.studentSvc.getSectionsForClass(cls) : [];
      });
  }

  // ─── Load existing student for editing ────────────────────────────────────
  private loadStudent(id: string): void {
    this.loading = true;
    this.studentSvc.getStudent(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      )
      .subscribe({
        next: res => {
          const s = res.data!;
          // Populate sections for this class first
          this.sections = this.studentSvc.getSectionsForClass(s.class);

          this.form.patchValue({
            class:            s.class,
            section:          s.section,
            rollNo:           s.rollNo,
            admissionNo:      (s as any).admissionNo || '',
            academicYear:     (s as any).academicYear || '',
            name:             s.name,
            dob:              s.dob ? new Date(s.dob) : null,
            gender:           s.gender || '',
            bloodGroup:       s.bloodGroup || '',
            guardianName:     s.guardianName,
            guardianPhone:    s.guardianPhone,
            guardianEmail:    (s as any).guardianEmail || '',
            guardianRelation: (s as any).guardianRelation || '',
            emergencyContact: (s as any).emergencyContact || {},
            address:          s.address || {},
          });
        },
        error: () => {
          this.notify.error('Could not load student data.');
          this.router.navigate(['/admin/students']);
        },
      });
  }

  // ─── Submit ────────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Find first invalid tab and switch to it
      this.activeTab = this.firstInvalidTab();
      this.notify.warn('Please fill in all required fields.');
      return;
    }

    this.saving = true;
    const payload = this.buildPayload();

    const call = this.isEdit
      ? this.studentSvc.updateStudent(this.studentId, payload)
      : this.studentSvc.createStudent(payload);

    call.pipe(
      takeUntil(this.destroy$),
      finalize(() => (this.saving = false)),
    ).subscribe({
      next: res => {
        const action = this.isEdit ? 'updated' : 'added';
        this.notify.success(`${res.data?.name || 'Student'} ${action} successfully.`);
        this.router.navigate(['/admin/students']);
      },
    });
  }

  // ─── Build API payload — strip empty strings ───────────────────────────────
  private buildPayload(): Record<string, any> {
    const raw     = this.form.getRawValue();
    const payload: Record<string, any> = {};

    const set = (key: string, val: any) => {
      if (val !== null && val !== undefined && val !== '') {
        payload[key] = val;
      }
    };

    set('name',             raw.name);
    set('class',            raw.class.toUpperCase());
    set('section',          raw.section.toUpperCase());
    set('rollNo',           raw.rollNo);
    set('admissionNo',      raw.admissionNo);
    set('academicYear',     raw.academicYear);
    set('dob',              raw.dob ? (raw.dob instanceof Date ? raw.dob.toISOString() : raw.dob) : null);
    set('gender',           raw.gender);
    set('bloodGroup',       raw.bloodGroup);
    set('guardianName',     raw.guardianName);
    set('guardianPhone',    raw.guardianPhone);
    set('guardianEmail',    raw.guardianEmail);
    set('guardianRelation', raw.guardianRelation);

    // Nested objects — only include if at least one field has a value
    const ec = raw.emergencyContact;
    if (ec.name || ec.phone) {
      payload['emergencyContact'] = ec;
    }

    const addr = raw.address;
    if (addr.street || addr.city || addr.state || addr.pincode) {
      payload['address'] = addr;
    }

    return payload;
  }

  // ─── Find the first tab that has an invalid field ─────────────────────────
  private firstInvalidTab(): number {
    const tab0Fields = ['class','section','rollNo','name','dob','gender','bloodGroup'];
    const tab1Fields = ['guardianName','guardianPhone','guardianEmail','guardianRelation'];
    if (tab0Fields.some(f => this.form.get(f)?.invalid)) return 0;
    if (tab1Fields.some(f => this.form.get(f)?.invalid)) return 1;
    return 2;
  }

  // ─── Getters for template ──────────────────────────────────────────────────
  g(path: string): AbstractControl { return this.form.get(path)!; }

  hasError(path: string, error: string): boolean {
    const ctrl = this.g(path);
    return ctrl.hasError(error) && ctrl.touched;
  }

  getError(path: string): string {
    const ctrl = this.g(path);
    if (!ctrl.touched || ctrl.valid) return '';
    if (ctrl.hasError('required'))   return 'This field is required';
    if (ctrl.hasError('minlength'))  return `Minimum ${ctrl.errors?.['minlength']?.requiredLength} characters`;
    if (ctrl.hasError('maxlength'))  return `Maximum ${ctrl.errors?.['maxlength']?.requiredLength} characters`;
    if (ctrl.hasError('email'))      return 'Enter a valid email address';
    if (ctrl.hasError('pattern')) {
      if (path === 'guardianPhone') return 'Enter a valid phone number (7–15 digits)';
      if (path.includes('pincode')) return 'Pincode must be 6 digits';
      return 'Invalid format';
    }
    return 'Invalid value';
  }

  get pageTitle(): string {
    return this.isEdit ? 'Edit Student' : 'Add New Student';
  }

  cancel(): void {
    this.router.navigate(['/admin/students']);
  }
}
