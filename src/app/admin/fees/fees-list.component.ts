import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl }                  from '@angular/forms';
import { Router }                       from '@angular/router';
import { MatDialog }                    from '@angular/material/dialog';
import { Subject, combineLatest }       from 'rxjs';
import {
  takeUntil, finalize, startWith, switchMap, debounceTime, distinctUntilChanged,
} from 'rxjs/operators';

import { FeeService, FeeWithVirtuals, StudentDues } from './fee.service';
import { StudentService }                            from '../students/student.service';
import { NotificationService }                       from '../../core/services/notification.service';
import { RecordPaymentDialogComponent }              from './record-payment.component';

type ViewMode = 'all' | 'dues';

@Component({
  selector:    'app-fees-list',
  templateUrl: './fees-list.component.html',
  styleUrls:   ['./fees-list.component.scss'],
})
export class FeesListComponent implements OnInit, OnDestroy {

  // ── View toggle: all fees OR dues-by-class ─────────────────────────────────
  viewMode: ViewMode = 'dues';

  // ── All-fees view ──────────────────────────────────────────────────────────
  fees:         FeeWithVirtuals[] = [];
  totalFees     = 0;
  page          = 1;
  pageSize      = 20;
  statusFilter  = new FormControl('');
  loadingFees   = false;

  // ── Dues-by-class view ─────────────────────────────────────────────────────
  duesData:      StudentDues[] = [];
  grandTotalDue  = 0;
  loadingDues    = false;
  classFilter    = new FormControl('');
  sectionFilter  = new FormControl('');
  classNames:    string[] = [];
  sections:      string[] = [];

  // ── Summary stats ──────────────────────────────────────────────────────────
  totalBilled    = 0;
  totalCollected = 0;
  totalPending   = 0;
  overdueCount   = 0;
  loadingStats   = true;

  // ── Status filter options ──────────────────────────────────────────────────
  readonly STATUS_OPTS = [
    { value: '',        label: 'All Statuses' },
    { value: 'pending', label: 'Pending'      },
    { value: 'partial', label: 'Partial'      },
    { value: 'paid',    label: 'Paid'         },
    { value: 'waived',  label: 'Waived'       },
  ];

  // Table columns for "all fees" view
  displayedColumns = ['student', 'feeType', 'amount', 'amountPaid', 'amountDue', 'dueDate', 'status', 'actions'];

  private destroy$ = new Subject<void>();

  constructor(
    private feeSvc:     FeeService,
    private studentSvc: StudentService,
    private notify:     NotificationService,
    private router:     Router,
    private dialog:     MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadClassNames();
    this.watchSectionReset();
    this.watchDuesFilters();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Dashboard stat cards ───────────────────────────────────────────────────
  private loadStats(): void {
    this.loadingStats = true;
    this.feeSvc.getFeeSummary()
      .pipe(finalize(() => this.loadingStats = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          if (res.data) {
            this.totalBilled    = res.data.totalBilled;
            this.totalCollected = res.data.totalCollected;
            this.totalPending   = res.data.totalPending;
            this.overdueCount   = res.data.overdueCount;
          }
        },
      });
  }

  // ── Dropdown data ──────────────────────────────────────────────────────────
  private loadClassNames(): void {
    this.studentSvc.getClassNames()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => { this.classNames = res.data || []; });

    this.studentSvc.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  private watchSectionReset(): void {
    this.classFilter.valueChanges
      .pipe(takeUntil(this.destroy$))
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
          this.duesData     = res.data || [];
          this.grandTotalDue = this.duesData.reduce((t, d) => t + d.balance, 0);
        },
      });
  }

  // ── All-fees view ──────────────────────────────────────────────────────────
  loadAllFees(): void {
    this.loadingFees = true;
    this.feeSvc.getAllFees({
      status:  this.statusFilter.value || undefined,
      page:    this.page,
      limit:   this.pageSize,
    }).pipe(finalize(() => this.loadingFees = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.fees      = res.data || [];
          this.totalFees = res.count ?? 0;
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

  // ── Open record-payment dialog ─────────────────────────────────────────────
  openPaymentDialog(feeId: string, feeType: string, amountDue: number): void {
    const ref = this.dialog.open(RecordPaymentDialogComponent, {
      width:        '440px',
      disableClose: true,
      data:         { feeId, feeType, amountDue },
    });

    ref.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(success => {
        if (success) {
          this.notify.success('Payment recorded successfully.');
          this.loadStats();
          if (this.viewMode === 'dues') {
            this.loadDues();
          } else {
            this.loadAllFees();
          }
        }
      });
  }

  // ── Navigate to student payment history ───────────────────────────────────
  viewStudentHistory(studentId: string): void {
    this.router.navigate(['/admin/fees/student', studentId]);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  statusClass(s: string): string  { return this.feeSvc.statusClass(s); }
  statusLabel(s: string): string  { return this.feeSvc.statusLabel(s); }
  fmt(n: number):         string  { return this.feeSvc.formatCurrency(n); }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  studentName(fee: FeeWithVirtuals): string {
    const s = fee.studentId as any;
    return s?.name ?? '—';
  }
  studentClass(fee: FeeWithVirtuals): string {
    const s = fee.studentId as any;
    return s ? `${s.class}-${s.section}` : '—';
  }

  trackById(_: number, item: any): string { return item._id || item.feeId; }
}
