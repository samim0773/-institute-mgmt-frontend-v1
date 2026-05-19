import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router }       from '@angular/router';
import { AuthService }  from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

function passwordMatch(group: AbstractControl): ValidationErrors | null {
  const pw  = group.get('newPassword')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { mismatch: true } : null;
}

@Component({
  selector:    'app-teacher-change-password',
  templateUrl: './change-password.component.html',
})
export class TeacherChangePasswordComponent {

  form: FormGroup;
  loading       = false;
  hideCurrentPw = true;
  hideNewPw     = true;
  hideConfirmPw = true;

  constructor(
    private fb:     FormBuilder,
    private auth:   AuthService,
    private notify: NotificationService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      currentPassword:  ['', Validators.required],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
      ]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordMatch });
  }

  get f() { return this.form.controls; }

  submit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    const { currentPassword, newPassword } = this.form.value;
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.notify.success('Password changed successfully.');
        this.router.navigate(['/teacher/dashboard']);
      },
      error: (err) => {
        this.notify.error(err?.error?.message || 'Failed to change password.');
        this.loading = false;
      },
    });
  }
}
