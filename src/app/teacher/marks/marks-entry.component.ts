import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject }                from 'rxjs';
import { takeUntil, finalize, switchMap } from 'rxjs/operators';

import { HttpClient, HttpParams }  from '@angular/common/http';
import { environment }             from '../../../environments/environment';
import { AuthService }             from '../../core/services/auth.service';
import { NotificationService }     from '../../core/services/notification.service';
import { StudentService }          from '../../admin/students/student.service';
import { ExamService }             from '../../admin/exams/exam.service';
import { Exam, Student, ApiResponse } from '../../core/models';

interface MarksEntry {
  studentId:  string;
  name:       string;
  rollNo:     string;
  section:    string;
  marks:      number | null;
  isAbsent:   boolean;
  remarks:    string;
  saved:      boolean;   // true after successful upsert
  saving:     boolean;   // per-row saving spinner
  error:      string;
}

@Component({
  selector:    'app-marks-entry',
  templateUrl: './marks-entry.component.html',
  styleUrls:   ['./marks-entry.component.scss'],
})
export class MarksEntryComponent implements OnInit, OnDestroy {

  // ── Context ────────────────────────────────────────────────────────────────
  subjectName = '';      // from JWT — teacher can only enter for this subject
  classNames: string[]  = [];
  sections:   string[]  = [];
  exams:      Exam[]    = [];

  // ── Selections ─────────────────────────────────────────────────────────────
  selectedClass   = '';
  selectedSection = '';
  selectedExam: Exam | null = null;

  // ── State ──────────────────────────────────────────────────────────────────
  entries:     MarksEntry[] = [];
  loadingExams     = false;
  loadingStudents  = false;
  savingAll        = false;
  savedCount       = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private auth:       AuthService,
    private http:       HttpClient,
    private studentSvc: StudentService,
    private examSvc:    ExamService,
    private notify:     NotificationService,
  ) {}

  ngOnInit(): void {
    this.subjectName = this.auth.currentUser?.subject || '';
    if (!this.subjectName) {
      this.notify.error('No subject assigned to your account. Contact admin.');
      return;
    }
    this.loadClassNames();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Step 1: load class names ───────────────────────────────────────────────
  private loadClassNames(): void {
    this.studentSvc.getClassNames()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.classNames = res.data || [];
      });
    this.studentSvc.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  // ── Step 2: class changed → update sections ────────────────────────────────
  onClassChange(cls: string): void {
    this.selectedClass   = cls;
    this.selectedSection = '';
    this.selectedExam    = null;
    this.entries         = [];
    this.sections = cls ? this.studentSvc.getSectionsForClass(cls) : [];
  }

  // ── Step 3: section changed → load exams ──────────────────────────────────
  onSectionChange(section: string): void {
    this.selectedSection = section;
    this.selectedExam    = null;
    this.entries         = [];
    if (!this.selectedClass || !section) return;
    this.loadExams();
  }

  private loadExams(): void {
    this.loadingExams = true;
    this.examSvc.getExams({
      class:   this.selectedClass,
      section: this.selectedSection,
      status:  'upcoming,ongoing,completed',
    }).pipe(
      finalize(() => this.loadingExams = false),
      takeUntil(this.destroy$),
    ).subscribe({
      next: res => {
        // Only show exams that contain this teacher's subject
        this.exams = (res.data || []).filter(e =>
          e.subjects?.some(s =>
            s.name.toLowerCase() === this.subjectName.toLowerCase()
          )
        );
        if (this.exams.length === 0) {
          this.notify.warn(
            `No exams found for ${this.subjectName} in ` +
            `Class ${this.selectedClass}-${this.selectedSection}.`
          );
        }
      },
    });
  }

  // ── Step 4: exam selected → load students ─────────────────────────────────
  onExamChange(exam: Exam): void {
    this.selectedExam = exam;
    this.entries      = [];
    this.loadRoster();
  }

  private loadRoster(): void {
    if (!this.selectedExam) return;
    this.loadingStudents = true;

    this.studentSvc.getStudents({
      class:   this.selectedClass,
      section: this.selectedSection,
      isActive: true,
      limit:   200,
    }).pipe(
      finalize(() => this.loadingStudents = false),
      takeUntil(this.destroy$),
    ).subscribe({
      next: res => {
        const students = res.data || [];

        // Pre-populate entries from existing marks (if any)
        this.loadExistingMarks(students);
      },
    });
  }

  private loadExistingMarks(students: Student[]): void {
    if (!this.selectedExam) return;

    // GET /api/marks/:examId/:class?section=...
    const params = new HttpParams().set('section', this.selectedSection);
    this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/marks/${this.selectedExam._id}/${this.selectedClass}`,
      { params },
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          const roster = res.data || [];

          // Build entries array — one row per student
          this.entries = students.map(s => {
            // Find existing mark for this student's subject
            const existingRow = roster.find(
              (r: any) => r.student?.id === s._id
            );
            const existingMark = existingRow?.marks?.[this.subjectName];

            return {
              studentId: s._id,
              name:      s.name,
              rollNo:    s.rollNo,
              section:   s.section,
              marks:     existingMark?.marksObtained ?? null,
              isAbsent:  existingMark?.isAbsent      ?? false,
              remarks:   existingMark?.remarks        ?? '',
              saved:     !!existingMark,
              saving:    false,
              error:     '',
            } as MarksEntry;
          });
        },
        error: () => {
          // No marks yet — build blank roster
          this.entries = students.map(s => ({
            studentId: s._id,
            name:      s.name,
            rollNo:    s.rollNo,
            section:   s.section,
            marks:     null,
            isAbsent:  false,
            remarks:   '',
            saved:     false,
            saving:    false,
            error:     '',
          }));
        },
      });
  }

  // ── Absent toggle ──────────────────────────────────────────────────────────
  toggleAbsent(entry: MarksEntry): void {
    entry.isAbsent = !entry.isAbsent;
    if (entry.isAbsent) entry.marks = null;
    entry.saved = false;
    entry.error = '';
  }

  // ── Save single row ────────────────────────────────────────────────────────
  saveRow(entry: MarksEntry): void {
    if (!this.selectedExam) return;

    const maxMarks = this.selectedExam.subjects.find(
      s => s.name.toLowerCase() === this.subjectName.toLowerCase()
    )?.maxMarks ?? 100;

    if (!entry.isAbsent) {
      if (entry.marks === null || entry.marks === undefined) {
        entry.error = 'Enter marks or mark as absent';
        return;
      }
      if (entry.marks < 0 || entry.marks > maxMarks) {
        entry.error = `Marks must be 0–${maxMarks}`;
        return;
      }
    }

    entry.saving = true;
    entry.error  = '';

    const payload = {
      examId:        this.selectedExam._id,
      studentId:     entry.studentId,
      subjectName:   this.subjectName,
      marksObtained: entry.isAbsent ? 0 : Number(entry.marks),
      isAbsent:      entry.isAbsent,
      remarks:       entry.remarks || undefined,
    };

    this.http.post<ApiResponse<any>>(
      `${environment.apiUrl}/marks`, payload,
    ).pipe(
      finalize(() => entry.saving = false),
      takeUntil(this.destroy$),
    ).subscribe({
      next: () => {
        entry.saved = true;
        this.savedCount = this.entries.filter(e => e.saved).length;
      },
      error: err => {
        entry.error = err.error?.message || 'Failed to save';
      },
    });
  }

  // ── Save all rows ──────────────────────────────────────────────────────────
  saveAll(): void {
    if (!this.selectedExam) return;

    const maxMarks = this.selectedExam.subjects.find(
      s => s.name.toLowerCase() === this.subjectName.toLowerCase()
    )?.maxMarks ?? 100;

    const entries = this.entries.map(e => ({
      studentId:     e.studentId,
      marksObtained: e.isAbsent ? 0 : (e.marks ?? 0),
      isAbsent:      e.isAbsent,
      remarks:       e.remarks || undefined,
    }));

    this.savingAll = true;
    this.http.post<ApiResponse<any>>(
      `${environment.apiUrl}/marks/bulk`,
      { examId: this.selectedExam._id, subjectName: this.subjectName, entries },
    ).pipe(
      finalize(() => this.savingAll = false),
      takeUntil(this.destroy$),
    ).subscribe({
      next: res => {
        const d = res.data;
        this.notify.success(`Saved: ${d?.saved ?? 0} marks. ${d?.errors?.length ? d.errors.length + ' errors.' : ''}`);
        this.entries.forEach(e => e.saved = !e.error);
        this.savedCount = this.entries.filter(e => e.saved).length;
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  get maxMarks(): number {
    if (!this.selectedExam) return 100;
    return this.selectedExam.subjects.find(
      s => s.name.toLowerCase() === this.subjectName.toLowerCase()
    )?.maxMarks ?? 100;
  }

  get completionPct(): number {
    if (!this.entries.length) return 0;
    return Math.round((this.entries.filter(e => e.saved).length / this.entries.length) * 100);
  }

  get allSaved(): boolean {
    return this.entries.length > 0 && this.entries.every(e => e.saved);
  }

  trackByStudentId(_: number, e: MarksEntry): string { return e.studentId; }
}
