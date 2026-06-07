import { Component, OnInit } from '@angular/core';
import { StudentPortalService } from '../services/student-portal.service';
import { AuthService }          from '../../core/services/auth.service';
import { FeeBill }              from '../../core/models';

// Razorpay is loaded globally via index.html script tag
declare const Razorpay: any;

@Component({
  selector:    'app-student-fees',
  templateUrl: './student-fees.component.html',
  styleUrls:   ['./student-fees.component.scss'],
})
export class StudentFeesComponent implements OnInit {

  bills:    FeeBill[] = [];
  loading   = true;
  error     = '';
  expanded: Set<string> = new Set();

  // Payment state
  canPayOnline    = false;
  payingBillId    = '';
  paymentSuccess  = '';
  paymentError    = '';

  constructor(
    private portalService: StudentPortalService,
    private authService:   AuthService,
  ) {}

  ngOnInit(): void {
    this.portalService.getMyFees().subscribe({
      next:  res  => { this.bills = res.data || []; this.loading = false; },
      error: ()   => { this.error = 'Failed to load fee details.'; this.loading = false; },
    });

    // Check if institute is on Advance plan (online payment enabled)
    this.authService.getMyInstituteInfo().subscribe(info => {
      this.canPayOnline = info?.plan === 'advance';
    });
  }

  toggle(id: string): void {
    this.expanded.has(id) ? this.expanded.delete(id) : this.expanded.add(id);
  }

  get totalPending(): number {
    return this.bills.filter(b => b.overallStatus !== 'paid').reduce((s, b) => s + b.totalDue, 0);
  }

  get totalPaid(): number {
    return this.bills.reduce((s, b) => s + b.totalPaid, 0);
  }

  // ── Online payment via Razorpay ───────────────────────────────────────────
  initiatePayment(bill: FeeBill): void {
    if (!this.canPayOnline) return;
    this.payingBillId  = bill.billId;
    this.paymentSuccess = '';
    this.paymentError   = '';

    this.portalService.createPaymentOrder(bill.billId).subscribe({
      next: res => {
        const order = res.data!;
        const user  = this.authService.currentUser;

        const options = {
          key:         order.key,
          amount:      order.amountPaise,
          currency:    order.currency,
          name:        'Institute Fee Payment',
          description: `Bill Payment — ${bill.feeItems.length} item(s)`,
          order_id:    order.orderId,
          prefill: {
            name:  user?.name  || '',
            email: '',
            contact: '',
          },
          theme: { color: '#1a237e' },
          handler: (response: any) => {
            this.portalService.verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              billId: bill.billId,
            }).subscribe({
              next: verifyRes => {
                this.payingBillId   = '';
                this.paymentSuccess = verifyRes.message || 'Payment successful!';
                // Reload fees to reflect updated status
                this.portalService.getMyFees().subscribe(r => {
                  this.bills = r.data || [];
                });
              },
              error: err => {
                this.payingBillId  = '';
                this.paymentError  = err?.error?.message || 'Payment verification failed. Contact admin.';
              },
            });
          },
          modal: {
            ondismiss: () => { this.payingBillId = ''; },
          },
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          this.payingBillId = '';
          this.paymentError = `Payment failed: ${resp.error?.description || 'Unknown error'}`;
        });
        rzp.open();
      },
      error: err => {
        this.payingBillId = '';
        this.paymentError = err?.error?.message || 'Could not initiate payment. Please try again.';
      },
    });
  }
}
