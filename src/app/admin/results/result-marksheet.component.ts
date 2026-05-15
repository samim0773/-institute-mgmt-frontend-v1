import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';

import { ResultService, MarksheetPayload } from './result.service';
import { NotificationService }             from '../../core/services/notification.service';

@Component({
  selector:    'app-result-marksheet',
  templateUrl: './result-marksheet.component.html',
  styleUrls:   ['./result-marksheet.component.scss'],
})
export class ResultMarksheetComponent implements OnInit, OnDestroy {

  marksheet: MarksheetPayload | null = null;
  loading    = true;
  studentId  = '';
  examId     = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route:     ActivatedRoute,
    private router:    Router,
    private resultSvc: ResultService,
    private notify:    NotificationService,
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(p => {
      this.studentId = p['studentId'];
      this.examId    = p['examId'];
      this.loadMarksheet();
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadMarksheet(): void {
    this.loading = true;
    this.resultSvc.getMarksheet(this.studentId, this.examId)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next:  res => this.marksheet = res.data!,
        error: ()  => {
          this.notify.error('Marksheet not found. Results may not have been published yet.');
          this.router.navigate(['/admin/results']);
        },
      });
  }

  // ── Print ──────────────────────────────────────────────────────────────────
  print(): void { window.print(); }

  // ── Navigation ────────────────────────────────────────────────────────────
  goBack(): void { this.router.navigate(['/admin/results']); }

  // ── Formatting helpers for template ───────────────────────────────────────
  formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  formatDob(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  gradeClass(g: string): string { return this.resultSvc.gradeClass(g); }

  // Overall result colour — used for the large pass/fail stamp
  get resultClass(): string {
    if (!this.marksheet) return '';
    return this.marksheet.isPassed ? 'stamp-pass' : 'stamp-fail';
  }

  get resultText(): string {
    if (!this.marksheet) return '';
    return this.marksheet.isPassed ? 'PASS' : 'FAIL';
  }

  // Percentage colour
  pctClass(pct: number): string {
    if (pct >= 75) return 'pct-high';
    if (pct >= 50) return 'pct-mid';
    return 'pct-low';
  }
}
