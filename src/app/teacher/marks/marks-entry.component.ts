import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject }                from 'rxjs';
import { takeUntil, finalize }   from 'rxjs/operators';

import { HttpClient, HttpParams }  from '@angular/common/http';
import { environment }             from '../../../environments/environment';
import { AuthService }             from '../../core/services/auth.service';
import { NotificationService }     from '../../core/services/notification.service';
import { StudentService }          from '../../admin/students/student.service';
import { ExamService }             from '../../admin/exams/exam.service';
import { Exam, Student, ApiResponse, SubjectAssignmentEntry } from '../../core/models';

interface MarksEntry {
  studentId:  string;
  name:       string;
  rollNo:     string;
  section:    string;
  marks:      number | null;
  isAbsent:   boolean;
  remarks:    string;
  saved:      boolean;
  saving:     boolean;
  error:      string;
}

@Component({
  selector:    'app-marks-entry',
  templateUrl: './marks-entry.component.html',
  styleUrls:   ['./marks-entry.component.scss'],
})
export class MarksEntryComponent implements OnInit, OnDestroy {

  // ── Subject assignments from ClassSubjectTeacher (authoritative) ───────────
  subjectAssignments: SubjectAssignmentEntry[] = [];

  // ── Available subjects for the selected exam ───────────────────────────────
  availableSubjects: string[] = [];

  // The subject currently being entered
  selectedSubjectName = '';

  // ── Dropdowns ──────────────────────────────────────────────────────────────
  classNames: string[] = [];
  sections:   string[] = [];
  exams:      Exam[]   = [];

  // ── Selections ─────────────────────────────────────────────────────────────
  selectedClass   = '';
  selectedSection = '';
  selectedExam: Exam | null = null;

  // ── State ──────────────────────────────────────────────────────────────────
  entries:        MarksEntry[] = [];
  loadingExams    = false;
  loadingStudents = false;
  savingAll       = false;
  savedCount      = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private auth:       AuthService,
    private http:       HttpClient,
    private studentSvc: StudentService,
    private examSvc:    ExamService,
    private notify:     NotificationService,
  ) {}

  ngOnInit(): void {
    // Always fetch fresh assignments — login token doesn't carry subjectAssignments
    this.auth.refreshMe()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.subjectAssignments = res.data?.subjectAssignments || [];
          if (this.subjectAssignments.length === 0) {
            this.notify.warn('No subjects are assigned to your account. Contact admin.');
          }
          this.buildClassNames();
          this.studentSvc.getClasses().pipe(takeUntil(this.destroy$)).subscribe();
        },
        error: () => {
          // Fall back to cached user data
          this.subjectAssignments = this.auth.currentUser?.subjectAssignments || [];
          this.buildClassNames();
          this.studentSvc.getClasses().pipe(takeUntil(this.destroy$)).subscribe();
        },
      });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private buildClassNames(): void {
    this.classNames = [...new Set(this.subjectAssignments.map(a => a.className))].sort();
  }

  // ── Step 2: class changed → update sections from assignments ──────────────
  onClassChange(cls: string): void {
    this.selectedClass        = cls;
    this.selectedSection      = '';
    this.selectedExam         = null;
    this.availableSubjects    = [];
    this.selectedSubjectName  = '';
    this.entries              = [];
    this.sections = cls
      ? [...new Set(this.subjectAssignments.filter(a => a.className === cls).map(a => a.section))].sort()
      : [];
  }

  // ── Step 3: section changed → load exams ──────────────────────────────────
  onSectionChange(section: string): void {
    this.selectedSection      = section;
    this.selectedExam         = null;
    this.availableSubjects    = [];
    this.selectedSubjectName  = '';
    this.entries              = [];
    if (!this.selectedClass || !section) return;
    this.loadExams();
  }

  private loadExams(): void {
    this.loadingExams = true;
    this.examSvc.getExams({
      class:   this.selectedClass,
      section: this.selectedSection,
      status:  'completed',
    }).pipe(
      finalize(() => this.loadingExams = false),
      takeUntil(this.destroy$),
    ).subscribe({
      next: res => {
        // Subjects this teacher is assigned to in the selected class+section
        const assignedSubjects = this.subjectAssignments
          .filter(a => a.className === this.selectedClass && a.section === this.selectedSection)
          .map(a => a.subjectName.toLowerCase());

        // Show only exams that contain at least one of the teacher's assigned subjects
        this.exams = (res.data || []).filter(e =>
          e.subjects?.some(s => assignedSubjects.includes(s.name.toLowerCase()))
        );

        if (this.exams.length === 0) {
          this.notify.warn(
            `No completed exams found for your subjects in ` +
            `Class ${this.selectedClass}-${this.selectedSection}.`
          );
        }
      },
    });
  }

  // ── Step 4: exam selected → compute available subjects ────────────────────
  onExamChange(exam: Exam): void {
    this.selectedExam        = exam;
    this.selectedSubjectName = '';
    this.entries             = [];

    if (!exam) { this.availableSubjects = []; return; }

    const assignedSubjects = this.subjectAssignments
      .filter(a => a.className === this.selectedClass && a.section === this.selectedSection)
      .map(a => a.subjectName.toLowerCase());

    this.availableSubjects = exam.subjects
      .filter(s => assignedSubjects.includes(s.name.toLowerCase()))
      .map(s => s.name);

    if (this.availableSubjects.length === 0) {
      this.notify.error('No assigned subjects found for you in this exam.');
      return;
    }

    // Auto-select if only one subject available
    if (this.availableSubjects.length === 1) {
      this.onSubjectChange(this.availableSubjects[0]);
    }
  }

  // ── Step 5: subject selected → load roster ─────────────────────────────────
  onSubjectChange(subjectName: string): void {
    this.selectedSubjectName = subjectName;
    this.entries             = [];
    if (!subjectName || !this.selectedExam) return;
    this.loadRoster();
  }

  private loadRoster(): void {
    if (!this.selectedExam) return;
    this.loadingStudents = true;

    this.studentSvc.getStudents({
      class:    this.selectedClass,
      section:  this.selectedSection,
      isActive: true,
      limit:    200,
    }).pipe(
      finalize(() => this.loadingStudents = false),
      takeUntil(this.destroy$),
    ).subscribe({
      next: res => this.loadExistingMarks(res.data || []),
    });
  }

  private loadExistingMarks(students: Student[]): void {
    if (!this.selectedExam) return;

    const params = new HttpParams().set('section', this.selectedSection);
    this.http.get<ApiResponse<any>>(
      `${environment.apiUrl}/marks/${this.selectedExam._id}/${this.selectedClass}`,
      { params },
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          const roster = res.data || [];
          this.entries = students.map(s => {
            const existingRow  = roster.find((r: any) => r.student?.id === s._id);
            const existingMark = existingRow?.marks?.[this.selectedSubjectName];
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
    if (!this.selectedExam || !this.selectedSubjectName) return;

    if (!entry.isAbsent) {
      if (entry.marks === null || entry.marks === undefined) {
        entry.error = 'Enter marks or mark as absent';
        return;
      }
      if (entry.marks < 0 || entry.marks > this.maxMarks) {
        entry.error = `Marks must be 0–${this.maxMarks}`;
        return;
      }
    }

    entry.saving = true;
    entry.error  = '';

    this.http.post<ApiResponse<any>>(
      `${environment.apiUrl}/marks`,
      {
        examId:        this.selectedExam._id,
        studentId:     entry.studentId,
        subjectName:   this.selectedSubjectName,
        marksObtained: entry.isAbsent ? 0 : Number(entry.marks),
        isAbsent:      entry.isAbsent,
        remarks:       entry.remarks || undefined,
      },
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
    if (!this.selectedExam || !this.selectedSubjectName) return;

    const entries = this.entries.map(e => ({
      studentId:     e.studentId,
      marksObtained: e.isAbsent ? 0 : (e.marks ?? 0),
      isAbsent:      e.isAbsent,
      remarks:       e.remarks || undefined,
    }));

    this.savingAll = true;
    this.http.post<ApiResponse<any>>(
      `${environment.apiUrl}/marks/bulk`,
      { examId: this.selectedExam._id, subjectName: this.selectedSubjectName, entries },
    ).pipe(
      finalize(() => this.savingAll = false),
      takeUntil(this.destroy$),
    ).subscribe({
      next: res => {
        const d = res.data;
        this.notify.success(`Saved: ${d?.saved ?? 0} marks.${d?.errors?.length ? ` ${d.errors.length} errors.` : ''}`);
        this.entries.forEach(e => { if (!e.error) e.saved = true; });
        this.savedCount = this.entries.filter(e => e.saved).length;
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  get maxMarks(): number {
    if (!this.selectedExam || !this.selectedSubjectName) return 100;
    return this.selectedExam.subjects.find(
      s => s.name.toLowerCase() === this.selectedSubjectName.toLowerCase()
    )?.maxMarks ?? 100;
  }

  get completionPct(): number {
    if (!this.entries.length) return 0;
    return Math.round((this.entries.filter(e => e.saved).length / this.entries.length) * 100);
  }

  get allSaved(): boolean {
    return this.entries.length > 0 && this.entries.every(e => e.saved);
  }

  get needsSubjectSelection(): boolean {
    return !!this.selectedExam && this.availableSubjects.length > 1 && !this.selectedSubjectName;
  }

  trackByStudentId(_: number, e: MarksEntry): string { return e.studentId; }
}
