import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { PublicService } from '../../core/services/public.service';

// Validator: no spaces in code
function noSpaces(c: AbstractControl) {
  return /\s/.test(c.value ?? '') ? { noSpaces: true } : null;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnDestroy {

  step         = 1; // 1 = institute details, 2 = admin account, 3 = success
  loading      = false;
  serverError  = '';
  showPassword = false;
  successData: any = null;
  private destroy$ = new Subject<void>();

  form: FormGroup;

  constructor(
    private fb:     FormBuilder,
    private router: Router,
    private pub:    PublicService,
  ) {
    this.form = this.fb.group({
      // Step 1 — Institute details
      instituteName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      instituteCode: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(10),
                           Validators.pattern(/^[A-Za-z0-9]+$/), noSpaces]],
      address:       ['', [Validators.required, Validators.maxLength(300)]],
      contactEmail:  ['', [Validators.required, Validators.email]],
      contactPhone:  ['', [Validators.minLength(7), Validators.maxLength(15),
                           Validators.pattern(/^[+\-0-9]+$/)]],
      website:       [''],

      // Step 2 — Admin account
      adminName:     ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      adminEmail:    ['', [Validators.required, Validators.email]],
      adminPassword: ['', [Validators.required, Validators.minLength(6)]],
    });

    // Auto-uppercase institute code as user types
    this.form.get('instituteCode')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => {
        if (v && v !== v.toUpperCase()) {
          this.form.get('instituteCode')!.setValue(v.toUpperCase(), { emitEvent: false });
        }
      });

    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => { if (this.serverError) this.serverError = ''; });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ─── Step 1 fields ────────────────────────────────────────────────────────
  get step1Valid(): boolean {
    const fields = ['instituteName', 'instituteCode', 'address', 'contactEmail'];
    return fields.every(f => this.form.get(f)!.valid);
  }

  nextStep(): void {
    if (!this.step1Valid) {
      ['instituteName', 'instituteCode', 'address', 'contactEmail'].forEach(f =>
        this.form.get(f)!.markAsTouched()
      );
      return;
    }
    this.step = 2;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  prevStep(): void { this.step = 1; }

  // ─── Submit ───────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading     = true;
    this.serverError = '';

    const v = this.form.value;

    this.pub.registerInstitute({
      instituteName:  v.instituteName.trim(),
      instituteCode:  v.instituteCode.toUpperCase().trim(),
      address:        v.address.trim(),
      contactEmail:   v.contactEmail.trim().toLowerCase(),
      contactPhone:   v.contactPhone?.trim() || undefined,
      website:        v.website?.trim() || undefined,
      adminName:      v.adminName.trim(),
      adminEmail:     v.adminEmail.trim().toLowerCase(),
      adminPassword:  v.adminPassword,
    })
    .pipe(takeUntil(this.destroy$), finalize(() => (this.loading = false)))
    .subscribe({
      next: (res) => {
        this.successData = res.data;
        this.step = 3;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        const status = err?.status;
        if (status === 409) {
          this.serverError = err.error?.message || 'Duplicate entry — code or email already registered.';
          if (err.error?.message?.toLowerCase().includes('code')) {
            this.step = 1;
          }
        } else if (status === 422) {
          this.serverError = err.error?.message || 'Please check all fields and try again.';
        } else if (status === 0) {
          this.serverError = 'Cannot reach server. Please check your connection.';
        } else {
          this.serverError = err.error?.message || 'Registration failed. Please try again.';
        }
      },
    });
  }

  goToLogin():    void { this.router.navigate(['/auth/login']); }
  goToLanding(): void { this.router.navigate(['/']); }

  // ─── Field getters ────────────────────────────────────────────────────────
  f(name: string) { return this.form.get(name)!; }

  err(name: string): string {
    const c = this.f(name);
    if (!c.touched || !c.errors) return '';
    if (c.hasError('required'))    return `${this.labels[name] ?? name} is required`;
    if (c.hasError('email'))       return 'Enter a valid email address';
    if (c.hasError('minlength'))   return `Minimum ${c.errors['minlength'].requiredLength} characters`;
    if (c.hasError('maxlength'))   return 'Too long';
    if (c.hasError('pattern'))     return 'Alphanumeric characters only (no spaces)';
    if (c.hasError('noSpaces'))    return 'No spaces allowed';
    return '';
  }

  private labels: Record<string, string> = {
    instituteName: 'Institute name',
    instituteCode: 'Institute code',
    address:       'Address',
    contactEmail:  'Contact email',
    adminName:     'Admin name',
    adminEmail:    'Admin email',
    adminPassword: 'Password',
  };

  get trialEndDate(): string {
    if (!this.successData?.trialEndsAt) return '';
    return new Date(this.successData.trialEndsAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }
}
