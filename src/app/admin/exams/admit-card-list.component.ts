import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router }   from '@angular/router';
import { Subject, forkJoin, of }    from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';

import {
  ExamService,
  AdmitCardEntry,
  AdmitCardPrintPayload,
} from './exam.service';
import { ApiResponse }         from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector:    'app-admit-card-list',
  templateUrl: './admit-card-list.component.html',
  styleUrls:   ['./admit-card-list.component.scss'],
})
export class AdmitCardListComponent implements OnInit, OnDestroy {

  examId   = '';
  examInfo: { id: string; name: string; class: string; section: string } | null = null;
  cards:   AdmitCardEntry[] = [];

  loading      = true;
  generating   = false;
  bulkPrinting = false;
  revokingId   = '';

  selected = new Set<string>(); // set of card `id` values

  // Filled just before window.print(), cleared right after
  bulkPrintCards: AdmitCardPrintPayload[] = [];

  readonly displayedColumns = ['select', 'student', 'rollNo', 'center', 'issued', 'status', 'actions'];

  private destroy$ = new Subject<void>();

  constructor(
    private route:   ActivatedRoute,
    private router:  Router,
    private examSvc: ExamService,
    private notify:  NotificationService,
    private cdr:     ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(p => {
      this.examId = p['examId'];
      this.loadCards();
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ─── Data ──────────────────────────────────────────────────────────────────
  private loadCards(): void {
    this.loading = true;
    this.selected.clear();
    this.examSvc.getAdmitCardsByExam(this.examId)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: res => {
          this.cards = res.data || [];
          if (res.exam) this.examInfo = res.exam;
        },
        error: () => this.notify.error('Failed to load admit cards.'),
      });
  }

  generateCards(): void {
    this.generating = true;
    this.examSvc.generateAdmitCards(this.examId)
      .pipe(takeUntil(this.destroy$), finalize(() => this.generating = false))
      .subscribe({
        next: res => {
          const d = res.data!;
          this.notify.success(`${d.created} card(s) generated, ${d.skipped} already existed.`);
          this.loadCards();
        },
      });
  }

  // ─── Row selection ─────────────────────────────────────────────────────────
  get activeCards(): AdmitCardEntry[] { return this.cards.filter(c => c.isActive); }

  isAllSelected(): boolean {
    return this.activeCards.length > 0 && this.activeCards.every(c => this.selected.has(c.id));
  }

  isIndeterminate(): boolean {
    const n = this.activeCards.filter(c => this.selected.has(c.id)).length;
    return n > 0 && n < this.activeCards.length;
  }

  toggleAll(): void {
    if (this.isAllSelected()) this.selected.clear();
    else this.activeCards.forEach(c => this.selected.add(c.id));
  }

  toggleOne(card: AdmitCardEntry): void {
    if (this.selected.has(card.id)) this.selected.delete(card.id);
    else this.selected.add(card.id);
  }

  get selectedCount(): number { return this.selected.size; }

  // ─── Print ─────────────────────────────────────────────────────────────────

  // Single card: navigate to the dedicated view so admin can preview first
  printSingle(card: AdmitCardEntry): void {
    this.router.navigate(['/admin/exams', this.examId, 'admit-cards', card.studentId._id]);
  }

  printAll(): void {
    this.doBulkPrint(this.activeCards);
  }

  printSelected(): void {
    const sel = this.activeCards.filter(c => this.selected.has(c.id));
    if (!sel.length) { this.notify.warn('Select at least one student first.'); return; }
    this.doBulkPrint(sel);
  }

  private doBulkPrint(entries: AdmitCardEntry[]): void {
    if (!entries.length) return;
    this.bulkPrinting = true;

    const calls = entries.map(e =>
      this.examSvc.getAdmitCardForPrint(e.studentId._id, this.examId).pipe(
        catchError(() => of(null)),
      ),
    );

    forkJoin(calls)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results: Array<ApiResponse<AdmitCardPrintPayload> | null>) => {
          this.bulkPrintCards = results
            .filter((r): r is ApiResponse<AdmitCardPrintPayload> => r != null && r.data != null)
            .map(r => r.data!);

          this.cdr.detectChanges(); // ensure Angular renders the bulk print area

          setTimeout(() => {
            window.print();
            // Clear the print area after the dialog appears
            setTimeout(() => {
              this.bulkPrintCards = [];
              this.bulkPrinting   = false;
              this.cdr.detectChanges();
            }, 1500);
          }, 350); // small delay so images have time to load
        },
        error: () => {
          this.notify.error('Failed to load admit card data for printing.');
          this.bulkPrinting = false;
        },
      });
  }

  // ─── Revoke ────────────────────────────────────────────────────────────────
  revokeCard(card: AdmitCardEntry): void {
    const reason = prompt(`Reason for revoking ${card.studentId.name}'s admit card:`);
    if (!reason?.trim()) return;
    this.revokingId = card.id;
    this.examSvc.revokeAdmitCard(card.id, reason.trim())
      .pipe(takeUntil(this.destroy$), finalize(() => this.revokingId = ''))
      .subscribe({
        next: () => {
          this.notify.success(`Admit card revoked for ${card.studentId.name}.`);
          this.loadCards();
        },
      });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  goBack(): void { this.router.navigate(['/admin/exams']); }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
