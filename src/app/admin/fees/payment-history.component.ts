import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import { MatDialog }                    from '@angular/material/dialog';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';

import { FeeService, StudentFeeHistory, FeeWithVirtuals } from './fee.service';
import { NotificationService }           from '../../core/services/notification.service';
import { RecordPaymentDialogComponent }  from './record-payment.component';

@Component({
  selector:    'app-payment-history',
  templateUrl: './payment-history.component.html',
  styleUrls:   ['./payment-history.component.scss'],
})
export class PaymentHistoryComponent implements OnInit, OnDestroy {

  studentId     = '';
  history:      StudentFeeHistory | null = null;
  loading       = true;
  deletingId    = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route:   ActivatedRoute,
    private router:  Router,
    private feeSvc:  FeeService,
    private notify:  NotificationService,
    private dialog:  MatDialog,
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(p => {
      this.studentId = p['studentId'];
      this.load();
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.feeSvc.getStudentFees(this.studentId)
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({
        next:  h => this.history = h,
        error: () => this.router.navigate(['/admin/fees']),
      });
  }

  openPaymentDialog(fee: FeeWithVirtuals): void {
    const ref = this.dialog.open(RecordPaymentDialogComponent, {
      width:        '440px',
      disableClose: true,
      data: {
        feeId:     fee._id,
        feeType:   fee.feeType,
        amountDue: fee.amountDue,
      },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (ok) { this.notify.success('Payment recorded.'); this.load(); }
    });
  }

  deletePayment(feeId: string, paymentId: string, amount: number): void {
    if (!confirm(`Remove payment of ${this.feeSvc.formatCurrency(amount)}?\nThis will revert the fee status.`)) return;
    this.deletingId = paymentId;
    this.feeSvc.deletePayment(feeId, paymentId)
      .pipe(finalize(() => this.deletingId = ''), takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.notify.success('Payment entry removed.'); this.load(); },
      });
  }

  goBack(): void { this.router.navigate(['/admin/fees']); }

  // ── Helpers ────────────────────────────────────────────────────────────────
  statusClass(s: string): string { return this.feeSvc.statusClass(s); }
  statusLabel(s: string): string { return this.feeSvc.statusLabel(s); }
  fmt(n: number):         string { return this.feeSvc.formatCurrency(n); }
  modeLabel(m: string):   string { return this.feeSvc.modeLabel(m); }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  trackByFeeId(_: number, f: FeeWithVirtuals):  string { return f._id; }
  trackByPayId(_: number, p: any):              string { return p._id; }

  modeIcon(mode: string): string {
  switch (mode) {
    case 'cash':
      return 'payments';

    case 'upi':
      return 'qr_code';

    case 'card':
      return 'credit_card';

    case 'bank':
    case 'bank_transfer':
      return 'account_balance';

    case 'cheque':
      return 'receipt';

    default:
      return 'payment';
  }
}
}
