import { Injectable }              from '@angular/core';
import { HttpClient, HttpParams }  from '@angular/common/http';
import { Observable }              from 'rxjs';
import { environment }             from '../../../environments/environment';
import { ApiResponse }             from '../../core/models';

// ─── Interfaces ────────────────────────────────────────────────────────────────
export interface ResultSubject {
  subjectName:   string;
  marksObtained: number;
  maxMarks:      number;
  passingMarks:  number;
  isAbsent:      boolean;
  isPassed:      boolean;
  grade:         string;
  gradePoint:    number;
}

export interface ResultSummary {
  _id:          string;
  studentId:    { _id: string; name: string; rollNo: string; class: string; section: string; };
  totalMarks:   number;
  maxTotalMarks:number;
  percentage:   number;
  grade:        string;
  gradeRemarks: string;
  rank:         number;
  isPassed:     boolean;
  isPublished:  boolean;
  failedSubjects: string[];
}

// Full marksheet payload from GET /api/results/:studentId/:examId
export interface MarksheetPayload {
  resultId:    string;
  isPublished: boolean;
  publishedAt: string;
  computedAt:  string;
  institute: {
    name:    string;
    code:    string;
    address: string;
    phone?:  string;
    logoUrl?: string;
  };
  exam: {
    id:           string;
    name:         string;
    class:        string;
    section:      string;
    academicYear: string;
    startDate:    string;
    endDate:      string;
  };
  student: {
    id:           string;
    name:         string;
    rollNo:       string;
    admissionNo?: string;
    class:        string;
    section:      string;
    dob?:         string;
    photo?:       string;
    guardianName: string;
  };
  subjects:       ResultSubject[];
  totalMarks:     number;
  maxTotalMarks:  number;
  percentage:     number;
  grade:          string;
  gradePoint:     number;
  gradeRemarks:   string;
  rank:           number;
  isPassed:       boolean;
  failedSubjects: string[];
}

export interface ComputeResultResponse {
  examId:              string;
  examName:            string;
  totalComputed:       number;
  totalStudents:       number;
  passCount:           number;
  failCount:           number;
  passPercentage:      number;
  averagePercentage:   number;
  studentsWithNoMarks: number;
  isPublished:         boolean;
}

@Injectable({ providedIn: 'root' })
export class ResultService {

  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Compute ──────────────────────────────────────────────────────────────
  computeResults(examId: string): Observable<ApiResponse<ComputeResultResponse>> {
    return this.http.post<ApiResponse<ComputeResultResponse>>(
      `${this.base}/results/compute/${examId}`, {}
    );
  }

  // ── Publish / unpublish ───────────────────────────────────────────────────
  publishResults(examId: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.base}/results/publish/${examId}`, {}
    );
  }

  unpublishResults(examId: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.base}/results/unpublish/${examId}`, {}
    );
  }

  // ── Exam result sheet ─────────────────────────────────────────────────────
  getResultsByExam(examId: string): Observable<ApiResponse<ResultSummary[]>> {
    return this.http.get<ApiResponse<ResultSummary[]>>(
      `${this.base}/results/exam/${examId}`
    );
  }

  // ── Single marksheet ──────────────────────────────────────────────────────
  getMarksheet(
    studentId: string,
    examId:    string,
  ): Observable<ApiResponse<MarksheetPayload>> {
    return this.http.get<ApiResponse<MarksheetPayload>>(
      `${this.base}/results/${studentId}/${examId}`
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  gradeClass(grade: string): string {
    const map: Record<string, string> = {
      A1: 'grade-a1', A2: 'grade-a2',
      B1: 'grade-b1', B2: 'grade-b2',
      C1: 'grade-c1', C2: 'grade-c2',
      D:  'grade-d',  E:  'grade-e',
    };
    return map[grade] ?? 'grade-default';
  }

  formatPercent(n: number): string {
    return n != null ? n.toFixed(1) + '%' : '—';
  }
}
