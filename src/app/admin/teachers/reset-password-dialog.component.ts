import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AuthService }         from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

export interface ResetPasswordDialogData {
  userId: string;
  userName: string;
}

function passwordMatch(group: AbstractControl): ValidationErrors | null {
  const pw  = group.get('newPassword')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { mismatch: true } : null;
}

@Component({
  selector: 'app-reset-password-dialog',
  template: `
    <h2 mat-dialog-title>Reset Password</h2>
    <mat-dialog-content>
      <p class="rp-subtitle">Set a new password for <strong>{{ data.userName }}</strong></p>
      <form [formGroup]="form" class="rp-form">

        <mat-form-field appearance="outline" class="rp-field">
          <mat-label>New Password</mat-label>
          <input matInput [type]="hideNew ? 'password' : 'text'" formControlName="newPassword" autocomplete="new-password" />
          <button mat-icon-button matSuffix type="button" (click)="hideNew = !hideNew">
            <mat-icon>{{ hideNew ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <mat-hint>Min 6 chars with uppercase, lowercase, and a number</mat-hint>
          <mat-error *ngIf="f['newPassword'].hasError('required')">Password is required</mat-error>
          <mat-error *ngIf="f['newPassword'].hasError('minlength')">At least 6 characters</mat-error>
          <mat-error *ngIf="f['newPassword'].hasError('pattern')">Must include uppercase, lowercase, and a digit</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="rp-field">
          <mat-label>Confirm Password</mat-label>
          <input matInput [type]="hideConfirm ? 'password' : 'text'" formControlName="confirmPassword" autocomplete="new-password" />
          <button mat-icon-button matSuffix type="button" (click)="hideConfirm = !hideConfirm">
            <mat-icon>{{ hideConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <mat-error *ngIf="f['confirmPassword'].hasError('required')">Please confirm the password</mat-error>
          <mat-error *ngIf="form.hasError('mismatch') && !f['confirmPassword'].hasError('required')">Passwords do not match</mat-error>
        </mat-form-field>

      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancel</button>
      <button mat-raised-button color="warn" (click)="submit()" [disabled]="form.invalid || loading">
        <mat-spinner *ngIf="loading" diameter="18" style="display:inline-block;margin-right:6px;"></mat-spinner>
        {{ loading ? 'Resetting…' : 'Reset Password' }}
      </button>
    </mat-dialog-actions>

    <style>
      .rp-subtitle { margin: 0 0 16px; color: #616161; font-size: 14px; }
      .rp-form { display: flex; flex-direction: column; width: 100%; min-width: min(320px, 80vw); }
      .rp-field { width: 100%; margin-bottom: 8px; }
    </style>
  `,
})
export class ResetPasswordDialogComponent {

  form: FormGroup;
  loading     = false;
  hideNew     = true;
  hideConfirm = true;

  constructor(
    private fb:      FormBuilder,
    private auth:    AuthService,
    private notify:  NotificationService,
    public  dialogRef: MatDialogRef<ResetPasswordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ResetPasswordDialogData,
  ) {
    this.form = this.fb.group({
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
    this.auth.resetUserPassword(this.data.userId, this.form.value.newPassword).subscribe({
      next: () => {
        this.notify.success(`Password for "${this.data.userName}" reset successfully.`);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.notify.error(err?.error?.message || 'Failed to reset password.');
        this.loading = false;
      },
    });
  }
}
