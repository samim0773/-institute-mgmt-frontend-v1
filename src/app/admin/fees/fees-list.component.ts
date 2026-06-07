import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl }                  from '@angular/forms';
import { Router }                       from '@angular/router';
import { MatDialog }                    from '@angular/material/dialog';
import { Subject, combineLatest }       from 'rxjs';
import {
  takeUntil, finalize, startWith,
} from 'rxjs/operators';

import { FeeService, Bill, StudentDues, SummaryPeriod } from './fee.service';
import { StudentService }                from '../students/student.service';
import { NotificationService }           from '../../core/services/notification.service';
import { AuthService }                   from '../../core/services/auth.service';
import { RecordPaymentDialogComponent }  from './record-payment.component';

type ViewMode = 'all' | 'dues';

@Component({
  selector:    'app-fees-list',
  templateUrl: './fees-list.component.html',
  styleUrls:   ['./fees-list.component.scss'],
})
export class FeesListComponent implements OnInit, OnDestroy {

  // ── View toggle ────────────────────────────────────────────────────────────
  viewMode: ViewMode = 'dues';

  // ── All-fees (bills) view ──────────────────────────────────────────────────
  bills:        Bill[] = [];
  totalBills    = 0;
  totalPages    = 1;
  page          = 1;
  pageSize      = 20;
  statusFilter  = new FormControl('');
  loadingFees   = false;

  // ── Dues-by-class view ─────────────────────────────────────────────────────
  duesData:     StudentDues[] = [];
  grandTotalDue = 0;
  loadingDues   = false;
  classFilter   = new FormControl('');
  sectionFilter = new FormControl('');
  classNames:   string[] = [];
  sections:     string[] = [];

  // ── Summary stats ──────────────────────────────────────────────────────────
  totalBilled    = 0;
  totalCollected = 0;
  totalPending   = 0;
  overdueCount   = 0;
  billCount      = 0;
  loadingStats   = true;

  // ── Period selector ────────────────────────────────────────────────────────
  periodType:    SummaryPeriod = 'this-month';
  selectedMonth  = new Date().getMonth() + 1;   // 1–12
  selectedYear   = new Date().getFullYear();

  readonly MONTHS = [
    { v: 1,  l: 'January'  }, { v: 2,  l: 'February' }, { v: 3,  l: 'March'    },
    { v: 4,  l: 'April'    }, { v: 5,  l: 'May'       }, { v: 6,  l: 'June'     },
    { v: 7,  l: 'July'     }, { v: 8,  l: 'August'    }, { v: 9,  l: 'September'},
    { v: 10, l: 'October'  }, { v: 11, l: 'November'  }, { v: 12, l: 'December' },
  ];

  readonly YEARS: number[] = (() => {
    const y = new Date().getFullYear();
    return [y + 1, y, y - 1, y - 2, y - 3];
  })();

  readonly STATUS_OPTS = [
    { value: '',        label: 'All Statuses' },
    { value: 'pending', label: 'Pending'      },
    { value: 'partial', label: 'Partial'      },
    { value: 'paid',    label: 'Paid'         },
    { value: 'waived',  label: 'Waived'       },
  ];

  canExport    = false;
  exportingFees = false;

  private destroy$ = new Subject<void>();

  constructor(
    private feeSvc:      FeeService,
    private studentSvc:  StudentService,
    private notify:      NotificationService,
    private router:      Router,
    private dialog:      MatDialog,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadClassNames();
    this.watchSectionReset();
    this.watchDuesFilters();
    this.authService.getMyInstituteInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe(info => { this.canExport = info?.plan === 'advance'; });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  exportFees(): void {
    this.exportingFees = true;
    const status = this.statusFilter.value || undefined;
    this.feeSvc.exportFees({ status })
      .pipe(finalize(() => (this.exportingFees = false)), takeUntil(this.destroy$))
      .subscribe({
        next: blob => {
          const url  = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href     = url;
          link.download = `fees_${new Date().toISOString().slice(0, 10)}.xlsx`;
          link.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.notify.error('Export failed. Please try again.'),
      });
  }

  // ── Summary stat cards ─────────────────────────────────────────────────────
  loadStats(): void {
    this.loadingStats = true;
    const opts: { period: SummaryPeriod; month?: number; year?: number } = {
      period: this.periodType,
    };
    if (this.periodType === 'month') {
      opts.month = this.selectedMonth;
      opts.year  = this.selectedYear;
    }
    this.feeSvc.getFeeSummary(opts)
      .pipe(finalize(() => this.loadingStats = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          if (res.data) {
            this.totalBilled    = res.data.totalBilled;
            this.totalCollected = res.data.totalCollected;
            this.totalPending   = res.data.totalPending;
            this.overdueCount   = res.data.overdueCount;
            this.billCount      = res.data.billCount ?? 0;
          }
        },
      });
  }

  onPeriodChange(p: SummaryPeriod): void {
    this.periodType = p;
    if (p !== 'month') this.loadStats();
  }

  onMonthYearChange(): void {
    if (this.periodType === 'month') this.loadStats();
  }

  get periodLabel(): string {
    const now = new Date();
    switch (this.periodType) {
      case 'this-month': return now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      case 'month':      return `${this.MONTHS[this.selectedMonth - 1]?.l ?? ''} ${this.selectedYear}`;
      case 'this-year':  return String(now.getFullYear());
      case 'prev-year':  return String(now.getFullYear() - 1);
      case 'all':        return 'All Time';
      default:           return '';
    }
  }

  // ── Dropdown data ──────────────────────────────────────────────────────────
  private loadClassNames(): void {
    this.studentSvc.getClassNames().pipe(takeUntil(this.destroy$))
      .subscribe(res => { this.classNames = res.data || []; });
    this.studentSvc.getClasses().pipe(takeUntil(this.destroy$)).subscribe();
  }

  private watchSectionReset(): void {
    this.classFilter.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(cls => {
        this.sectionFilter.setValue('', { emitEvent: false });
        this.sections = cls ? this.studentSvc.getSectionsForClass(cls) : [];
      });
  }

  // ── Dues view: auto-load when class+section are set ────────────────────────
  private watchDuesFilters(): void {
    combineLatest([
      this.classFilter.valueChanges.pipe(startWith('')),
      this.sectionFilter.valueChanges.pipe(startWith('')),
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(([cls, sec]) => {
        if (cls && sec) { this.loadDues(cls, sec); }
        else            { this.duesData = []; this.grandTotalDue = 0; }
      });
  }

  loadDues(cls?: string, sec?: string): void {
    const c = cls || this.classFilter.value;
    const s = sec || this.sectionFilter.value;
    if (!c || !s) { this.notify.warn('Select both class and section to view dues.'); return; }

    this.loadingDues = true;
    this.feeSvc.getDuesByClass(c, s)
      .pipe(finalize(() => this.loadingDues = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.duesData      = res.data || [];
          this.grandTotalDue = res.grandTotalDue ?? 0;
        },
      });
  }

  // ── All-bills view ─────────────────────────────────────────────────────────
  loadAllFees(): void {
    this.loadingFees = true;
    this.feeSvc.getAllFees({
      status: this.statusFilter.value || undefined,
      page:   this.page,
      limit:  this.pageSize,
    }).pipe(finalize(() => this.loadingFees = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.bills      = res.data || [];
          this.totalBills = res.total ?? 0;
          this.totalPages = res.totalPages ?? 1;
        },
      });
  }

  onPageChange(evt: any): void {
    this.page     = evt.pageIndex + 1;
    this.pageSize = evt.pageSize;
    this.loadAllFees();
  }

  switchView(mode: ViewMode): void {
    this.viewMode = mode;
    if (mode === 'all') this.loadAllFees();
  }

  // ── Record payment dialog ──────────────────────────────────────────────────
  openPaymentDialog(feeId: string, feeType: string, amountDue: number): void {
    const ref = this.dialog.open(RecordPaymentDialogComponent, {
      width:        '440px',
      disableClose: true,
      data:         { feeId, feeType, amountDue },
    });

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(success => {
      if (success) {
        this.notify.success('Payment recorded successfully.');
        this.loadStats();
        if (this.viewMode === 'dues') { this.loadDues(); }
        else                          { this.loadAllFees(); }
      }
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

    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(success => {
      if (success) {
        this.notify.success('Bill payment recorded successfully.');
        this.loadStats();
        this.loadAllFees();
      }
    });
  }

  // ── Navigate to student payment history ───────────────────────────────────
  viewStudentHistory(studentId: string): void {
    this.router.navigate(['/admin/fees/student', studentId]);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  statusClass(s: string): string { return this.feeSvc.statusClass(s); }
  statusLabel(s: string): string { return this.feeSvc.statusLabel(s); }
  fmt(n: number):         string { return this.feeSvc.formatCurrency(n); }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  trackByBillId(_: number, b: Bill):       string { return b.billId; }
  trackByStudId(_: number, d: StudentDues): string { return d.student._id; }
  trackByFeeId (_: number, f: any):        string { return f.feeId || f.id; }
}
