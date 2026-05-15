import { Component, OnInit, OnDestroy }  from '@angular/core';
import { ActivatedRoute, Router }        from '@angular/router';
import { Subject }                       from 'rxjs';
import { takeUntil, finalize }           from 'rxjs/operators';

import { ExamService, AdmitCardPrintPayload } from './exam.service';
import { NotificationService }               from '../../core/services/notification.service';

@Component({
  selector:    'app-admit-card',
  templateUrl: './admit-card.component.html',
  styleUrls:   ['./admit-card.component.scss'],
})
export class AdmitCardComponent implements OnInit, OnDestroy {

  admitCard:   AdmitCardPrintPayload | null = null;
  loading      = true;
  revoking     = false;

  studentId    = '';
  examId       = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route:   ActivatedRoute,
    private router:  Router,
    private examSvc: ExamService,
    private notify:  NotificationService,
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(p => {
      this.studentId = p['studentId'];
      this.examId    = p['examId'];
      this.load();
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private load(): void {
    this.loading = true;
    this.examSvc.getAdmitCardForPrint(this.studentId, this.examId)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: res => this.admitCard = res.data!,
        error: () => {
          this.notify.error('Admit card not found. It may not have been generated yet.');
          this.router.navigate(['/admin/exams']);
        },
      });
  }

  printAdmitCard(): void {
    window.print();
  }

  goBack(): void {
    this.router.navigate(['/admin/exams', this.examId, 'admit-cards']);
  }

  formatDate(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  formatDob(d: string | undefined): string {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
