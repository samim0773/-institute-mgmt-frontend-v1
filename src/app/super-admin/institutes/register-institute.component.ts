import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router }                       from '@angular/router';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';

import { SuperAdminService, PLANS } from '../super-admin.service';
import { NotificationService }      from '../../core/services/notification.service';

@Component({
  selector:    'app-register-institute',
  templateUrl: './register-institute.component.html',
  styleUrls:   ['./register-institute.component.scss'],
})
export class RegisterInstituteComponent implements OnInit, OnDestroy {

  form!:    FormGroup;
  saving    = false;
  showAdminPassword = false;
  plans     = PLANS;

  private destroy$ = new Subject<void>();

  constructor(
    private fb:       FormBuilder,
    private superSvc: SuperAdminService,
    private notify:   NotificationService,
    private router:   Router,
  ) {}

  ngOnInit(): void { this.buildForm(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private buildForm(): void {
    this.form = this.fb.group({
      // ── Institute fields ────────────────────────────────────────────────
      instituteName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      instituteCode: ['', [
        Validators.required, Validators.minLength(2), Validators.maxLength(10),
        Validators.pattern(/^[A-Za-z0-9]+$/),
      ]],
      address:       ['', [Validators.required, Validators.maxLength(300)]],
      contactEmail:  ['', [Validators.required, Validators.email]],
      contactPhone:  ['', Validators.pattern(/^[0-9+\-\s()]{7,15}$/)],
      website:       ['', Validators.pattern(/^https?:\/\/.+/)],
      plan:          ['trial'],
      planExpiresAt: [null],

      // ── First admin account ─────────────────────────────────────────────
      adminName:     ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      adminEmail:    ['', [Validators.required, Validators.email]],
      adminPassword: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
      ]],
    });
  }

  // Auto-generate code from institute name
  generateCode(): void {
    const name = this.form.get('instituteName')?.value || '';
    const code = name
      .split(/\s+/)
      .filter(Boolean)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 10);
    if (code) this.form.get('instituteCode')?.setValue(code);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warn('Please fill in all required fields correctly.');
      return;
    }

    this.saving = true;
    const v = this.form.value;

    this.superSvc.createInstitute({
      instituteName:  v.instituteName.trim(),
      instituteCode:  v.instituteCode.toUpperCase().trim(),
      address:        v.address.trim(),
      contactEmail:   v.contactEmail.trim(),
      contactPhone:   v.contactPhone?.trim() || undefined,
      website:        v.website?.trim()      || undefined,
      plan:           v.plan,
      planExpiresAt:  v.planExpiresAt ? new Date(v.planExpiresAt).toISOString() : undefined,
      adminName:      v.adminName.trim(),
      adminEmail:     v.adminEmail.trim(),
      adminPassword:  v.adminPassword,
    }).pipe(finalize(() => this.saving = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.notify.success(`"${res.data?.institute?.name}" registered successfully!`);
          this.router.navigate(['/super-admin/institutes']);
        },
      });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  g(path: string): AbstractControl { return this.form.get(path)!; }

  getError(path: string): string {
    const ctrl = this.g(path);
    if (!ctrl.touched || ctrl.valid) return '';
    if (ctrl.hasError('required'))  return 'This field is required';
    if (ctrl.hasError('minlength')) return `Min ${ctrl.errors?.['minlength'].requiredLength} characters`;
    if (ctrl.hasError('maxlength')) return `Max ${ctrl.errors?.['maxlength'].requiredLength} characters`;
    if (ctrl.hasError('email'))     return 'Enter a valid email address';
    if (ctrl.hasError('pattern')) {
      if (path === 'instituteCode')  return 'Letters and numbers only';
      if (path === 'contactPhone')   return 'Enter a valid phone number';
      if (path === 'website')        return 'Must start with https://';
      if (path === 'adminPassword')  return 'Must have uppercase, lowercase, and a number';
      return 'Invalid format';
    }
    return 'Invalid value';
  }

  cancel(): void { this.router.navigate(['/super-admin/institutes']); }
}
