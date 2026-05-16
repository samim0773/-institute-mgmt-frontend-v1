import { Injectable }           from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable }            from 'rxjs';
import { environment }           from '../../../environments/environment';
import { Exam, AdmitCard, ApiResponse } from '../../core/models';

export interface ExamQuery {
  class?:        string;
  section?:      string;
  status?:       string;
  academicYear?: string;
}

export interface AdmitCardGenerateSummary {
  total:   number;
  created: number;
  skipped: number;
  errors:  { studentId: string; reason: string }[];
}

export interface AdmitCardEntry {
  id:         string;
  rollNo:     string;
  center:     string;
  seatNo:     string | null;
  issuedDate: string;
  isActive:   boolean;
  studentId: {
    _id:     string;
    name:    string;
    rollNo:  string;
    class:   string;
    section: string;
    photo?:  string;
  };
}

export interface AdmitCardListApiResponse {
  success: boolean;
  count?:  number;
  exam?:   { id: string; name: string; class: string; section: string };
  data:    AdmitCardEntry[];
}

// The flat print payload built by the backend controller
export interface AdmitCardPrintPayload {
  admitCardId: string;
  rollNo:      string;
  seatNo?:     string;
  center:      string;
  issuedDate:  string;
  signatureUrl?: string;
  institute: {
    name:    string;
    code:    string;
    address: string;
    phone?:  string;
    logoUrl?: string;
  };
  student: {
    id:           string;
    name:         string;
    classRollNo:  string;
    class:        string;
    section:      string;
    dob?:         string;
    photo?:       string;
    guardianName: string;
  };
  exam: {
    id:           string;
    name:         string;
    class:        string;
    section:      string;
    startDate:    string;
    endDate:      string;
    instructions?: string;
  };
  schedule: {
    subject:      string;
    examDate?:    string;
    examTime?:    string;
    maxMarks:     number;
    passingMarks: number;
  }[];
}

@Injectable({ providedIn: 'root' })
export class ExamService {

  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ══ EXAMS ═══════════════════════════════════════════════════════════════

  getExams(query: ExamQuery = {}): Observable<ApiResponse<Exam[]>> {
    let params = new HttpParams();
    if (query.class)        params = params.set('class',        query.class);
    if (query.section)      params = params.set('section',      query.section);
    if (query.status)       params = params.set('status',       query.status);
    if (query.academicYear) params = params.set('academicYear', query.academicYear);
    return this.http.get<ApiResponse<Exam[]>>(`${this.base}/exams`, { params });
  }

  getExam(id: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/exams/${id}`);
  }

  createExam(data: Partial<Exam> & Record<string, any>): Observable<ApiResponse<Exam>> {
    return this.http.post<ApiResponse<Exam>>(`${this.base}/exams`, data);
  }

  updateExam(id: string, data: Partial<Exam> & Record<string, any>): Observable<ApiResponse<Exam>> {
    return this.http.put<ApiResponse<Exam>>(`${this.base}/exams/${id}`, data);
  }

  publishExam(id: string): Observable<ApiResponse<Exam>> {
    return this.http.post<ApiResponse<Exam>>(`${this.base}/exams/${id}/publish`, {});
  }

  // ══ ADMIT CARDS ══════════════════════════════════════════════════════════

  generateAdmitCards(
    examId: string,
    center?: string,
  ): Observable<ApiResponse<AdmitCardGenerateSummary>> {
    return this.http.post<ApiResponse<AdmitCardGenerateSummary>>(
      `${this.base}/exams/${examId}/generate-admit-cards`,
      center ? { center } : {},
    );
  }

  getAdmitCardsByExam(examId: string): Observable<AdmitCardListApiResponse> {
    return this.http.get<AdmitCardListApiResponse>(
      `${this.base}/exams/admit-cards/exam/${examId}`,
    );
  }

  getAdmitCardForPrint(
    studentId: string,
    examId:    string,
  ): Observable<ApiResponse<AdmitCardPrintPayload>> {
    return this.http.get<ApiResponse<AdmitCardPrintPayload>>(
      `${this.base}/exams/admit-cards/${studentId}/${examId}`,
    );
  }

  revokeAdmitCard(
    id:     string,
    reason: string,
  ): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.base}/exams/admit-cards/${id}/revoke`,
      { reason },
    );
  }

  // ══ HELPERS ══════════════════════════════════════════════════════════════

  statusColor(status: string): string {
    const map: Record<string, string> = {
      draft:              'status-draft',
      upcoming:           'status-upcoming',
      ongoing:            'status-ongoing',
      completed:          'status-completed',
      results_published:  'status-published',
    };
    return map[status] ?? 'status-draft';
  }

  formatDateRange(start: string, end: string): string {
    const s = new Date(start).toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
    const e = new Date(end).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    return `${s} – ${e}`;
  }
}
