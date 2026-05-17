import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import { MatDialog }                    from '@angular/material/dialog';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';

import { FeeService, StudentFeeHistory, Bill, BillFeeItem } from './fee.service';
import { NotificationService }           from '../../core/services/notification.service';
import { RecordPaymentDialogComponent }  from './record-payment.component';

@Component({
  selector:    'app-payment-history',
  templateUrl: './payment-history.component.html',
  styleUrls:   ['./payment-history.component.scss'],
})
export class PaymentHistoryComponent implements OnInit, OnDestroy {

  studentId  = '';
  history:   StudentFeeHistory | null = null;
  loading    = true;
  deletingId = '';

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

  openPaymentDialog(item: BillFeeItem): void {
    const ref = this.dialog.open(RecordPaymentDialogComponent, {
      width:        '440px',
      disableClose: true,
      data: {
        feeId:     item.id,
        feeType:   item.feeType,
        amountDue: item.amountDue,
      },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (ok) { this.notify.success('Payment recorded.'); this.load(); }
    });
  }

  openBillPaymentDialog(bill: Bill): void {
    const unpaid = bill.feeBreakdown.filter(f => f.status !== 'paid' && f.status !== 'waived');
    const billLabel = unpaid.map(f => f.feeType).join(' + ') || 'All Fees';
    const ref = this.dialog.open(RecordPaymentDialogComponent, {
      width:        '440px',
      disableClose: true,
      data:         { billId: bill.billId, billLabel, amountDue: bill.totalDue },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(ok => {
      if (ok) { this.notify.success('Bill payment recorded.'); this.load(); }
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

  overallIcon(bill: Bill): string {
    if (bill.overallStatus === 'paid')   return 'check_circle';
    if (bill.overallStatus === 'waived') return 'do_not_disturb_on';
    if (bill.isOverdue)                  return 'warning';
    return 'receipt_long';
  }

  modeIcon(mode: string): string {
    const map: Record<string, string> = {
      cash: 'payments', cheque: 'receipt_long',
      upi: 'phone_android', bank_transfer: 'account_balance',
      dd: 'description', other: 'more_horiz',
    };
    return map[mode] ?? 'payment';
  }

  trackByBillId(_: number, b: Bill):    string { return b.billId; }
  trackByFeeId (_: number, f: BillFeeItem): string { return f.id; }
  trackByPayId (_: number, p: any):     string { return p._id; }
}
