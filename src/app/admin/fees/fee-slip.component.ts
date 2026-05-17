import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';

import { FeeService, Bill } from './fee.service';

@Component({
  selector:    'app-fee-slip',
  templateUrl: './fee-slip.component.html',
  styleUrls:   ['./fee-slip.component.scss'],
})
export class FeeSlipComponent implements OnInit, OnDestroy {

  bill:    Bill | null = null;
  loading  = true;
  billId   = '';
  printedAt = new Date();

  private destroy$ = new Subject<void>();

  constructor(
    private route:   ActivatedRoute,
    private router:  Router,
    private feeSvc:  FeeService,
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(p => {
      this.billId = p['billId'];
      this.load();
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.feeSvc.getBill(this.billId)
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({
        next:  res => { if (res.data) this.bill = res.data; },
        error: () => this.router.navigate(['/admin/fees']),
      });
  }

  print(): void {
    this.printedAt = new Date();
    window.print();
  }

  goBack(): void { this.router.navigate(['/admin/fees']); }

  // ── Helpers ────────────────────────────────────────────────────────────────
  fmt(n: number): string {
    return '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  formatDate(d: string | Date | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDatetime(d: Date): string {
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  statusLabel(s: string): string {
    return { pending: 'Pending', partial: 'Partial', paid: 'Paid', waived: 'Waived' }[s] ?? s;
  }

  modeLabel(mode: string): string {
    return { cash: 'Cash', cheque: 'Cheque', upi: 'UPI', bank_transfer: 'Bank Transfer', dd: 'DD', other: 'Other' }[mode] ?? mode;
  }

  get shortBillId(): string {
    return this.billId ? this.billId.slice(-8).toUpperCase() : '';
  }

  get hasWaiver(): boolean {
    return (this.bill?.feeBreakdown ?? []).some(f => (f.waivedAmount ?? 0) > 0);
  }

  get totalWaived(): number {
    return (this.bill?.feeBreakdown ?? []).reduce((s, f) => s + (f.waivedAmount ?? 0), 0);
  }

  get hasPayments(): boolean {
    return (this.bill?.feeBreakdown ?? []).some(f => (f.payments?.length ?? 0) > 0);
  }
}
