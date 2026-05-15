import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormControl }                              from '@angular/forms';
import { Router }                                  from '@angular/router';
import { MatTableDataSource }                      from '@angular/material/table';
import { MatSort }                                 from '@angular/material/sort';
import { MatPaginator }                            from '@angular/material/paginator';
import { Subject }                                 from 'rxjs';
import { takeUntil, finalize }                     from 'rxjs/operators';

import { ResultService, ResultSummary }  from './result.service';
import { ExamService }                   from '../exams/exam.service';
import { StudentService }                from '../students/student.service';
import { NotificationService }           from '../../core/services/notification.service';
import { Exam }                          from '../../core/models';

@Component({
  selector:    'app-result-list',
  templateUrl: './result-list.component.html',
  styleUrls:   ['./result-list.component.scss'],
})
export class ResultListComponent implements OnInit, OnDestroy {

  @ViewChild(MatSort)      sort!:      MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Dropdowns
  exams:      Exam[]   = [];
  classNames: string[] = [];

  // Filters
  examCtrl  = new FormControl('');
  classCtrl = new FormControl('');

  // Table
  dataSource = new MatTableDataSource<ResultSummary>([]);
  displayedColumns = ['rank','rollNo','name','subjects','total','percentage','grade','status','actions'];

  // State
  loading       = false;
  computing     = false;
  publishing    = false;
  selectedExam: Exam | null = null;
  computeSummary: any       = null;

  // Stats strip
  passCount    = 0;
  failCount    = 0;
  avgPercent   = 0;
  topPercent   = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private resultSvc: ResultService,
    private examSvc:   ExamService,
    private studentSvc:StudentService,
    private notify:    NotificationService,
    private router:    Router,
  ) {}

  ngOnInit(): void {
    this.loadDropdowns();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadDropdowns(): void {
    this.studentSvc.getClassNames()
      .pipe(takeUntil(this.destroy$))
      .subscribe(r => this.classNames = r.data || []);

    this.examSvc.getExams({ status: 'completed,results_published' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(r => this.exams = r.data || []);
  }

  onExamChange(): void {
    const id = this.examCtrl.value;
    this.selectedExam  = this.exams.find(e => e._id === id) ?? null;
    this.computeSummary = null;
    this.dataSource.data = [];
    if (id) this.loadResults(id);
  }

  private loadResults(examId: string): void {
    this.loading = true;
    this.resultSvc.getResultsByExam(examId)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: res => {
          let data = res.data || [];
          const cls = this.classCtrl.value;
          if (cls) data = data.filter(r => r.studentId.class === cls);

          this.dataSource.data  = data;
          this.dataSource.sort  = this.sort;
          this.dataSource.paginator = this.paginator;

          this.passCount  = data.filter(r => r.isPassed).length;
          this.failCount  = data.filter(r => !r.isPassed).length;
          this.avgPercent = data.length
            ? +(data.reduce((s, r) => s + r.percentage, 0) / data.length).toFixed(1) : 0;
          this.topPercent = data.length ? Math.max(...data.map(r => r.percentage)) : 0;
        },
        error: () => this.notify.warn('No results found. Compute first.'),
      });
  }

  computeResults(): void {
    const id = this.examCtrl.value;
    if (!id) return;
    if (!confirm('Compute results now? Existing results will be re-calculated.')) return;

    this.computing = true;
    this.resultSvc.computeResults(id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.computing = false))
      .subscribe({
        next: res => {
          this.computeSummary = res.data;
          this.notify.success(`Results computed: ${res.data?.passCount} passed, ${res.data?.failCount} failed.`);
          this.loadResults(id);
        },
      });
  }

  publishResults(): void {
    const id = this.examCtrl.value;
    if (!id) return;
    if (!confirm('Publish results? Teachers will be able to see them.')) return;

    this.publishing = true;
    this.resultSvc.publishResults(id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.publishing = false))
      .subscribe({
        next: res => {
          this.notify.success(`${res.data?.publishedCount} results published.`);
          this.loadResults(id);
        },
      });
  }

  unpublishResults(): void {
    const id = this.examCtrl.value;
    if (!id) return;
    if (!confirm('Unpublish results? This will hide them from teachers.')) return;
    this.resultSvc.unpublishResults(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.notify.info('Results unpublished.'); this.loadResults(id); },
      });
  }

  viewMarksheet(result: ResultSummary): void {
    this.router.navigate([
      '/admin/results',
      result.studentId._id,
      this.examCtrl.value,
    ]);
  }

  get isPublished():  boolean { return !!this.dataSource.data[0]?.isPublished; }
  get hasResults():   boolean { return this.dataSource.data.length > 0; }
  get hasExamSelected(): boolean { return !!this.examCtrl.value; }

  gradeClass(g: string):  string  { return this.resultSvc.gradeClass(g); }
  fmtPct(n: number):      string  { return this.resultSvc.formatPercent(n); }
  trackById(_: number, r: ResultSummary): string { return r._id; }
}
