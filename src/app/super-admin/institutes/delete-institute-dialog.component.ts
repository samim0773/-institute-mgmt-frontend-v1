import { Component, Inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { SuperAdminService }   from '../super-admin.service';
import { NotificationService } from '../../core/services/notification.service';

export interface DeleteInstituteDialogData {
  instituteId:   string;
  instituteName: string;
  stats: {
    totalStudents: number;
    totalUsers:    number;
    totalAdmins:   number;
    totalTeachers: number;
  };
}

@Component({
  selector: 'app-delete-institute-dialog',
  template: `
    <!-- ── Step 1: Warning ─────────────────────────────────────────────── -->
    <ng-container *ngIf="step === 1">
      <div class="di-warn-header">
        <mat-icon class="di-warn-icon">warning</mat-icon>
        <h2 mat-dialog-title>Delete Institute</h2>
      </div>

      <mat-dialog-content class="di-content">
        <p class="di-inst-name">{{ data.instituteName }}</p>

        <div class="di-danger-box">
          <mat-icon>dangerous</mat-icon>
          <p>
            <strong>This action is permanent and cannot be undone.</strong><br>
            Every piece of data belonging to this institute will be erased forever.
          </p>
        </div>

        <p class="di-will-delete-label">The following will be permanently deleted:</p>
        <div class="di-stat-grid">
          <div class="di-stat-chip">
            <mat-icon>people</mat-icon>
            <span><strong>{{ data.stats.totalStudents }}</strong> Students</span>
          </div>
          <div class="di-stat-chip">
            <mat-icon>shield</mat-icon>
            <span><strong>{{ data.stats.totalAdmins }}</strong> Admins</span>
          </div>
          <div class="di-stat-chip">
            <mat-icon>school</mat-icon>
            <span><strong>{{ data.stats.totalTeachers }}</strong> Teachers</span>
          </div>
          <div class="di-stat-chip">
            <mat-icon>folder_delete</mat-icon>
            <span>All classes, exams, results, fees, notices &amp; records</span>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="di-actions">
        <button mat-stroked-button [mat-dialog-close]="null">
          <mat-icon>close</mat-icon> No, Keep It
        </button>
        <button mat-raised-button color="warn" (click)="step = 2">
          <mat-icon>delete_forever</mat-icon> Yes, Delete Everything
        </button>
      </mat-dialog-actions>
    </ng-container>

    <!-- ── Step 2: Password confirmation ──────────────────────────────── -->
    <ng-container *ngIf="step === 2">
      <div class="di-warn-header">
        <mat-icon class="di-lock-icon">lock</mat-icon>
        <h2 mat-dialog-title>Confirm with Password</h2>
      </div>

      <mat-dialog-content class="di-content">
        <p class="di-confirm-subtitle">
          Enter your Super Admin password to permanently delete
          <strong>{{ data.instituteName }}</strong>.
        </p>

        <mat-form-field appearance="outline" class="di-pw-field">
          <mat-label>Your Password</mat-label>
          <input matInput
            [type]="hidePw ? 'password' : 'text'"
            [formControl]="passwordCtrl"
            autocomplete="current-password"
            (keydown.enter)="submit()"
          />
          <button mat-icon-button matSuffix type="button" (click)="hidePw = !hidePw">
            <mat-icon>{{ hidePw ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <mat-error *ngIf="passwordCtrl.hasError('required')">Password is required</mat-error>
          <mat-error *ngIf="passwordCtrl.hasError('serverError')">{{ serverError }}</mat-error>
        </mat-form-field>

        <div class="di-final-warning">
          <mat-icon>info</mat-icon>
          <span>This will immediately and irreversibly delete <strong>all data</strong> for this institute.</span>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="di-actions">
        <button mat-stroked-button (click)="step = 1" [disabled]="loading">
          <mat-icon>arrow_back</mat-icon> Back
        </button>
        <button mat-raised-button color="warn" (click)="submit()" [disabled]="passwordCtrl.invalid || loading">
          <mat-spinner *ngIf="loading" diameter="18" style="display:inline-block;margin-right:6px;"></mat-spinner>
          <mat-icon *ngIf="!loading">delete_forever</mat-icon>
          {{ loading ? 'Deleting…' : 'Permanently Delete' }}
        </button>
      </mat-dialog-actions>
    </ng-container>

    <style>
      .di-warn-header {
        display: flex; align-items: center; gap: 10px; padding: 20px 24px 0;
      }
      .di-warn-icon { color: #d32f2f; font-size: 28px; width: 28px; height: 28px; }
      .di-lock-icon { color: #f57c00; font-size: 28px; width: 28px; height: 28px; }
      .di-warn-header h2 { margin: 0; font-size: 20px; }
      .di-content { padding: 16px 24px; min-width: 420px; max-width: 480px; }
      .di-inst-name {
        font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 16px;
        border-left: 4px solid #d32f2f; padding-left: 12px;
      }
      .di-danger-box {
        display: flex; gap: 12px; background: #ffebee; border: 1px solid #ef9a9a;
        border-radius: 8px; padding: 14px; margin-bottom: 16px; color: #b71c1c;
      }
      .di-danger-box mat-icon { flex-shrink: 0; margin-top: 2px; }
      .di-danger-box p { margin: 0; font-size: 14px; line-height: 1.5; }
      .di-will-delete-label { font-size: 13px; color: #616161; margin: 0 0 8px; }
      .di-stat-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 4px;
      }
      .di-stat-chip {
        display: flex; align-items: flex-start; gap: 8px;
        background: #f5f5f5; border-radius: 6px; padding: 8px 10px; font-size: 13px;
      }
      .di-stat-chip mat-icon { font-size: 18px; width: 18px; height: 18px; color: #616161; flex-shrink: 0; margin-top: 1px; }
      .di-actions { padding: 8px 24px 20px; gap: 10px; }
      .di-confirm-subtitle { font-size: 14px; color: #616161; margin: 0 0 20px; line-height: 1.5; }
      .di-pw-field { width: 100%; }
      .di-final-warning {
        display: flex; gap: 8px; align-items: flex-start; background: #fff3e0;
        border: 1px solid #ffcc80; border-radius: 8px; padding: 12px; margin-top: 12px;
        font-size: 13px; color: #e65100;
      }
      .di-final-warning mat-icon { flex-shrink: 0; font-size: 18px; width: 18px; height: 18px; margin-top: 1px; }
    </style>
  `,
})
export class DeleteInstituteDialogComponent {

  step        = 1;
  loading     = false;
  hidePw      = true;
  serverError = '';

  passwordCtrl = new FormControl('', Validators.required);

  constructor(
    private superSvc:  SuperAdminService,
    private notify:    NotificationService,
    public  dialogRef: MatDialogRef<DeleteInstituteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteInstituteDialogData,
  ) {}

  submit(): void {
    if (this.passwordCtrl.invalid || this.loading) return;
    this.loading = true;
    this.serverError = '';
    this.passwordCtrl.setErrors(null);

    this.superSvc.deleteInstitute(this.data.instituteId, this.passwordCtrl.value!).subscribe({
      next: (res) => {
        this.notify.success(res.message || `"${this.data.instituteName}" deleted successfully.`);
        this.dialogRef.close({ deleted: true });
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message || 'Failed to delete institute.';
        // Show incorrect-password error inline in the field
        if (err?.status === 401) {
          this.serverError = msg;
          this.passwordCtrl.setErrors({ serverError: true });
        } else {
          this.notify.error(msg);
        }
      },
    });
  }
}
