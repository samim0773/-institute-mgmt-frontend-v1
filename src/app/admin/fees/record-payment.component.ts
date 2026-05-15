import { Component, Inject, OnDestroy }     from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA }    from '@angular/material/dialog';
import { Subject }                          from 'rxjs';
import { takeUntil, finalize }              from 'rxjs/operators';

import { FeeService, PAYMENT_MODES }  from './fee.service';
import { NotificationService }        from '../../core/services/notification.service';

export interface PaymentDialogData {
  feeId:     string;
  feeType:   string;
  amountDue: number;
}

@Component({
  selector:  'app-record-payment',
  template: `
<h2 mat-dialog-title class="dialog-title">
  <mat-icon>payment</mat-icon>
  Record Payment
</h2>

<mat-dialog-content class="dialog-content">

  <!-- Fee context info -->
  <div class="fee-context">
    <span class="context-label">Fee Type</span>
    <span class="context-value">{{ data.feeType }}</span>
    <span class="context-label">Outstanding</span>
    <span class="context-value context-value--amount">{{ fmt(data.amountDue) }}</span>
  </div>

  <form [formGroup]="form" (ngSubmit)="submit()" novalidate id="payForm">

    <!-- Amount -->
    <mat-form-field appearance="outline" class="field-full">
      <mat-label>Amount Received (₹) *</mat-label>
      <mat-icon matPrefix>currency_rupee</mat-icon>
      <input
        matInput
        type="number"
        formControlName="amount"
        placeholder="0"
        min="1"
        [max]="data.amountDue"
        step="0.01"
      />
      <mat-hint>Maximum: {{ fmt(data.amountDue) }}</mat-hint>
      <mat-error *ngIf="form.get('amount')?.touched">
        <ng-container *ngIf="form.get('amount')?.hasError('required')">Amount is required</ng-container>
        <ng-container *ngIf="form.get('amount')?.hasError('min')">Must be at least ₹1</ng-container>
      </mat-error>
    </mat-form-field>

    <!-- Mode -->
    <mat-form-field appearance="outline" class="field-full">
      <mat-label>Payment Mode *</mat-label>
      <mat-select formControlName="mode">
        <mat-option *ngFor="let m of modes" [value]="m.value">
          <mat-icon class="mode-icon">{{ modeIcon(m.value) }}</mat-icon>
          {{ m.label }}
        </mat-option>
      </mat-select>
      <mat-error *ngIf="form.get('mode')?.touched && form.get('mode')?.invalid">
        Select a payment mode
      </mat-error>
    </mat-form-field>

    <!-- Date -->
    <mat-form-field appearance="outline" class="field-full">
      <mat-label>Payment Date</mat-label>
      <input matInput [matDatepicker]="datePicker" formControlName="date" />
      <mat-datepicker-toggle matIconSuffix [for]="datePicker"></mat-datepicker-toggle>
      <mat-datepicker #datePicker></mat-datepicker>
      <mat-hint>Defaults to today if left blank</mat-hint>
    </mat-form-field>

    <!-- Reference number (shows for non-cash modes) -->
    <mat-form-field
      appearance="outline"
      class="field-full"
      *ngIf="showReference"
    >
      <mat-label>
        {{ form.get('mode')?.value === 'upi' ? 'UTR / Transaction ID' :
           form.get('mode')?.value === 'cheque' ? 'Cheque Number' :
           'Reference / Transaction Number' }}
      </mat-label>
      <input matInput formControlName="referenceNo" placeholder="Optional" />
    </mat-form-field>

    <!-- Note -->
    <mat-form-field appearance="outline" class="field-full">
      <mat-label>Note (optional)</mat-label>
      <input matInput formControlName="note" placeholder="e.g. First instalment" />
    </mat-form-field>

  </form>

</mat-dialog-content>

<mat-dialog-actions align="end" class="dialog-actions">
  <button mat-stroked-button (click)="close()" [disabled]="saving">Cancel</button>
  <button
    mat-raised-button
    color="primary"
    type="submit"
    form="payForm"
    [disabled]="saving || form.invalid"
    class="save-btn"
  >
    <mat-spinner *ngIf="saving" diameter="18" class="btn-spinner"></mat-spinner>
    <mat-icon *ngIf="!saving">check_circle</mat-icon>
    {{ saving ? 'Saving…' : 'Record Payment' }}
  </button>
</mat-dialog-actions>
`,
  styles: [`
    .dialog-title {
      display: flex; align-items: center; gap: 8px; font-size: 1.1rem;
      mat-icon { color: #1565c0; }
    }
    .dialog-content { min-width: 320px; padding-top: 8px !important; }
    .fee-context {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 4px 16px; background: #f5f5f5;
      border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;
    }
    .context-label { font-size: 0.75rem; color: #757575; text-transform: uppercase; }
    .context-value { font-size: 0.95rem; font-weight: 600; color: #212121; }
    .context-value--amount { color: #c62828; font-size: 1.1rem; }
    .field-full { width: 100%; margin-bottom: 8px; }
    .mode-icon  { font-size: 18px; width: 18px; height: 18px; vertical-align: middle; margin-right: 4px; }
    .dialog-actions { padding: 8px 16px 16px; gap: 8px; }
    .save-btn { display: flex; align-items: center; gap: 8px; }
    .btn-spinner { ::ng-deep circle { stroke: rgba(255,255,255,0.8) !important; } }
  `],
})
export class RecordPaymentDialogComponent implements OnDestroy {

  form:   FormGroup;
  saving  = false;
  modes   = PAYMENT_MODES;

  private destroy$ = new Subject<void>();

  constructor(
    private fb:      FormBuilder,
    private feeSvc:  FeeService,
    private notify:  NotificationService,
    private dialogRef: MatDialogRef<RecordPaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PaymentDialogData,
  ) {
    this.form = this.fb.group({
      amount:      [null, [Validators.required, Validators.min(1)]],
      mode:        ['cash', Validators.required],
      date:        [new Date()],
      referenceNo: [''],
      note:        ['', Validators.maxLength(300)],
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  get showReference(): boolean {
    return ['cheque','upi','bank_transfer','dd'].includes(this.form.get('mode')?.value ?? '');
  }

  modeIcon(mode: string): string {
    const map: Record<string,string> = {
      cash: 'payments', cheque: 'receipt_long',
      upi: 'phone_android', bank_transfer: 'account_balance',
      dd: 'description', other: 'more_horiz',
    };
    return map[mode] ?? 'payment';
  }

  fmt(n: number): string { return this.feeSvc.formatCurrency(n); }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;

    const v = this.form.value;
    const payload = {
      amount:      Number(v.amount),
      mode:        v.mode,
      date:        v.date instanceof Date ? v.date.toISOString() : v.date,
      referenceNo: v.referenceNo?.trim() || undefined,
      note:        v.note?.trim()        || undefined,
    };

    this.feeSvc.recordPayment(this.data.feeId, payload)
      .pipe(finalize(() => this.saving = false), takeUntil(this.destroy$))
      .subscribe({
        next:  () => this.dialogRef.close(true),
        error: () => { /* error interceptor shows snackbar */ },
      });
  }

  close(): void { this.dialogRef.close(false); }
}
