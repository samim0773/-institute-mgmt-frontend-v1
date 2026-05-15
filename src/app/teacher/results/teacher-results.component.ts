import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router }                       from '@angular/router';
import { FormControl }                  from '@angular/forms';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';

import { ResultService }    from '../../admin/results/result.service';
import { ExamService }      from '../../admin/exams/exam.service';
import { StudentService }   from '../../admin/students/student.service';
import { AuthService }      from '../../core/services/auth.service';
import { Exam }             from '../../core/models';

@Component({
  selector:    'app-teacher-results',
  templateUrl: './teacher-results.component.html',
  styleUrls:   ['./teacher-results.component.scss'],
})
export class TeacherResultsComponent implements OnInit, OnDestroy {

  exams:           Exam[] = [];
  results:         any[]  = [];
  classNames:      string[] = [];

  selectedExamId   = '';
  selectedClass    = '';

  loadingExams     = true;
  loadingResults   = false;

  private destroy$ = new Subject<void>();

  constructor(
    private resultSvc:  ResultService,
    private examSvc:    ExamService,
    private studentSvc: StudentService,
    private auth:       AuthService,
    private router:     Router,
  ) {}

  ngOnInit(): void {
    this.loadClassNames();
    this.loadPublishedExams();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadClassNames(): void {
    this.studentSvc.getClassNames()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => { this.classNames = res.data || []; });
  }

  private loadPublishedExams(): void {
    this.examSvc.getExams({ status: 'results_published' })
      .pipe(finalize(() => this.loadingExams = false), takeUntil(this.destroy$))
      .subscribe({ next: res => this.exams = res.data || [] });
  }

  onExamChange(examId: string): void {
    this.selectedExamId = examId;
    this.results = [];
    if (examId) this.loadResults();
  }

  private loadResults(): void {
    if (!this.selectedExamId) return;
    this.loadingResults = true;
    this.resultSvc.getResultsByExam(this.selectedExamId)
      .pipe(finalize(() => this.loadingResults = false), takeUntil(this.destroy$))
      .subscribe({ next: res => this.results = res.data || [] });
  }

  printMarksheet(studentId: string): void {
    this.router.navigate(['/teacher/results', studentId, this.selectedExamId]);
  }

  trackById(_: number, r: any): string { return r._id; }
}
