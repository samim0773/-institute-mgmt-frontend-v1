import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA }     from '@angular/material/dialog';
import { finalize }                           from 'rxjs/operators';

import { InventoryService, Expense } from './inventory.service';
import { NotificationService }       from '../../core/services/notification.service';

@Component({
    selector: 'app-expense-dialog',
    template: `
<h2 mat-dialog-title>{{ isEdit ? 'Edit' : 'Record' }} Expense</h2>

<mat-dialog-content>
  <form [formGroup]="form" class="exp-form">

    <div class="form-row">
      <mat-form-field appearance="outline" class="field-cat">
        <mat-label>Category *</mat-label>
        <mat-select formControlName="category">
          <mat-option *ngFor="let c of svc.EXPENSE_CATEGORIES" [value]="c.value">
            {{ c.label }}
          </mat-option>
        </mat-select>
        <mat-error>Required</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="field-date">
        <mat-label>Date *</mat-label>
        <input matInput type="date" formControlName="date">
        <mat-error>Required</mat-error>
      </mat-form-field>
    </div>

    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Title / Description *</mat-label>
      <input matInput formControlName="title" placeholder="e.g. June Salary - Ravi Kumar">
      <mat-error>Required</mat-error>
    </mat-form-field>

    <div class="form-row">
      <mat-form-field appearance="outline" class="field-half">
        <mat-label>Amount (₹) *</mat-label>
        <input matInput type="number" min="0" formControlName="amount" placeholder="0">
        <mat-error>Must be a positive number</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="field-half">
        <mat-label>Payment Mode</mat-label>
        <mat-select formControlName="paymentMode">
          <mat-option *ngFor="let m of svc.PAYMENT_MODES" [value]="m.value">{{ m.label }}</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <div class="form-row">
      <mat-form-field appearance="outline" class="field-half">
        <mat-label>Paid To</mat-label>
        <input matInput formControlName="paidTo" placeholder="Vendor / Teacher name">
      </mat-form-field>

      <mat-form-field appearance="outline" class="field-half">
        <mat-label>Reference / Cheque No.</mat-label>
        <input matInput formControlName="referenceNo">
      </mat-form-field>
    </div>

    <!-- Salary-specific field -->
    <mat-form-field appearance="outline" class="full-width" *ngIf="form.get('category')?.value === 'salary'">
      <mat-label>Salary Month (YYYY-MM)</mat-label>
      <input matInput formControlName="salaryMonth" placeholder="e.g. 2024-06">
      <mat-hint>Enter the month this salary is for</mat-hint>
    </mat-form-field>

    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Notes</mat-label>
      <textarea matInput formControlName="description" rows="2"
                placeholder="Additional notes (optional)"></textarea>
    </mat-form-field>

  </form>
</mat-dialog-content>

<mat-dialog-actions align="end">
  <button mat-button mat-dialog-close>Cancel</button>
  <button mat-raised-button color="primary" [disabled]="saving" (click)="save()">
    <mat-spinner *ngIf="saving" diameter="18" style="display:inline-block; margin-right:8px"></mat-spinner>
    {{ isEdit ? 'Update' : 'Save' }} Expense
  </button>
</mat-dialog-actions>
    `,
    styles: [`
        .exp-form   { display: flex; flex-direction: column; gap: 0; padding-top: 8px; }
        .full-width { width: 100%; }
        .form-row   { display: flex; gap: 12px; }
        .field-cat  { flex: 1.5; }
        .field-date { flex: 1; }
        .field-half { flex: 1; }
        mat-dialog-content { min-width: 480px; max-width: 520px; }
        @media (max-width: 540px) {
            mat-dialog-content { min-width: unset; }
            .form-row { flex-direction: column; }
        }
    `],
})
export class ExpenseDialogComponent implements OnInit {

    form!:   FormGroup;
    saving = false;
    isEdit = false;

    get svc(): InventoryService { return this.data.svc; }

    constructor(
        private fb:       FormBuilder,
        private dialogRef: MatDialogRef<ExpenseDialogComponent>,
        private notify:   NotificationService,
        @Inject(MAT_DIALOG_DATA) public data: { expense?: Expense; svc: InventoryService },
    ) {}

    ngOnInit(): void {
        this.isEdit = !!this.data.expense;
        const e = this.data.expense;

        this.form = this.fb.group({
            category:    [e?.category    || '',     Validators.required],
            title:       [e?.title       || '',     Validators.required],
            amount:      [e?.amount      ?? null,   [Validators.required, Validators.min(0.01)]],
            date:        [this.toDateStr(e?.date),  Validators.required],
            paidTo:      [e?.paidTo      || ''],
            paymentMode: [e?.paymentMode || 'cash'],
            referenceNo: [e?.referenceNo || ''],
            salaryMonth: [e?.salaryMonth || ''],
            description: [e?.description || ''],
        });
    }

    private toDateStr(d?: string): string {
        if (!d) return new Date().toISOString().slice(0, 10);
        return new Date(d).toISOString().slice(0, 10);
    }

    save(): void {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.saving = true;

        const payload = { ...this.form.value };

        const obs = this.isEdit
            ? this.svc.updateExpense(this.data.expense!._id, payload)
            : this.svc.createExpense(payload);

        obs.pipe(finalize(() => (this.saving = false))).subscribe({
            next: () => {
                this.notify.success(this.isEdit ? 'Expense updated' : 'Expense recorded');
                this.dialogRef.close(true);
            },
            error: err => this.notify.error(err?.error?.message || 'Failed to save expense'),
        });
    }
}
