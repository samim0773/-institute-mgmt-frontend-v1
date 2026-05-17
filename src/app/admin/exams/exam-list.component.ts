import { Component, OnInit, OnDestroy }  from '@angular/core';
import { FormControl }                   from '@angular/forms';
import { Router }                        from '@angular/router';
import { Subject }                       from 'rxjs';
import { takeUntil, finalize, startWith, switchMap } from 'rxjs/operators';

import { ExamService }         from './exam.service';
import { StudentService }      from '../students/student.service';
import { NotificationService } from '../../core/services/notification.service';
import { Exam }                from '../../core/models';

@Component({
  selector:    'app-exam-list',
  templateUrl: './exam-list.component.html',
  styleUrls:   ['./exam-list.component.scss'],
})
export class ExamListComponent implements OnInit, OnDestroy {

  exams:      Exam[]   = [];
  loading              = true;
  generatingId         = '';   // exam ID currently generating admit cards

  // Filters
  classFilterCtrl  = new FormControl('');
  statusFilterCtrl = new FormControl('');
  classNames: string[] = [];

  readonly STATUS_OPTIONS = [
    { value: '',                  label: 'All Statuses' },
    { value: 'draft',             label: 'Draft' },
    { value: 'upcoming',          label: 'Upcoming' },
    { value: 'ongoing',           label: 'Ongoing' },
    { value: 'completed',         label: 'Completed' },
    { value: 'results_published', label: 'Results Published' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private examSvc:    ExamService,
    private studentSvc: StudentService,
    private notify:     NotificationService,
    private router:     Router,
  ) {}

  ngOnInit(): void {
    this.loadClassNames();
    this.watchFilters();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadClassNames(): void {
    this.studentSvc.getClassNames()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => this.classNames = res.data || []);
  }

  private watchFilters(): void {
    this.classFilterCtrl.valueChanges.pipe(
      startWith(''),
      takeUntil(this.destroy$),
      switchMap(() => {
        this.loading = true;
        return this.examSvc.getExams({
          class:  this.classFilterCtrl.value || undefined,
          status: this.statusFilterCtrl.value || undefined,
        }).pipe(finalize(() => this.loading = false));
      }),
    ).subscribe({ next: res => this.exams = res.data || [] });

    this.statusFilterCtrl.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.classFilterCtrl.updateValueAndValidity({ emitEvent: true }));
  }

  loadExams(): void {
    this.loading = true;
    this.examSvc.getExams({
      class:  this.classFilterCtrl.value || undefined,
      status: this.statusFilterCtrl.value || undefined,
    }).pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({ next: res => this.exams = res.data || [] });
  }

  addExam():        void { this.router.navigate(['/admin/exams/new']); }
  editExam(id: string):  void { this.router.navigate(['/admin/exams', id, 'edit']); }
  viewAdmitCards(id: string): void { this.router.navigate(['/admin/exams', id, 'admit-cards']); }

  publishExam(exam: Exam): void {
    if (!confirm(`Publish "${exam.name}"? Teachers will be able to see it.`)) return;
    this.examSvc.publishExam(exam._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify.success(`"${exam.name}" published.`);
          this.loadExams();
        },
      });
  }

  generateAdmitCards(exam: Exam): void {
    if (!confirm(`Generate admit cards for all students in Class ${exam.class}-${exam.section}?`)) return;
    this.generatingId = exam._id;
    this.examSvc.generateAdmitCards(exam._id)
      .pipe(finalize(() => this.generatingId = ''), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          const d = res.data!;
          this.notify.success(
            `Admit cards: ${d.created} generated, ${d.skipped} already existed.`
          );
          this.loadExams();
        },
      });
  }

  examStatus(exam: Exam): string { return this.examSvc.computeStatus(exam); }
  statusColor(s: string): string { return this.examSvc.statusColor(s); }

  formatRange(start: string, end: string): string {
    return this.examSvc.formatDateRange(start, end);
  }

  get hasFilter(): boolean {
    return !!(this.classFilterCtrl.value || this.statusFilterCtrl.value);
  }

  clearFilters(): void {
    this.classFilterCtrl.setValue('');
    this.statusFilterCtrl.setValue('');
  }

  trackById(_: number, e: Exam): string { return e._id; }
}
