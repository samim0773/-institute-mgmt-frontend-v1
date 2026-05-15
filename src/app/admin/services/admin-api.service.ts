import { Injectable }                  from '@angular/core';
import { HttpClient, HttpParams }       from '@angular/common/http';
import { Observable }                   from 'rxjs';
import { environment }                  from '../../../environments/environment';
import { ApiResponse }                  from '../../core/models';

/**
 * AdminApiService
 *
 * Central HTTP service for every admin-facing API call.
 * Feature components inject this — never HttpClient directly.
 * Keeps all URL strings in one place so a backend change touches one file.
 */
@Injectable({ providedIn: 'root' })
export class AdminApiService {

  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Dashboard ─────────────────────────────────────────────────────────────

  getStudentStats(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/students/stats`);
  }

  getFeeSummary(academicYear?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (academicYear) params = params.set('academicYear', academicYear);
    return this.http.get<ApiResponse<any>>(`${this.base}/fees/summary`, { params });
  }

  getExams(p: Record<string, string> = {}): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    Object.entries(p).forEach(([k, v]) => { params = params.set(k, v); });
    return this.http.get<ApiResponse<any[]>>(`${this.base}/exams`, { params });
  }

  getNoticeStats(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/notices/stats`);
  }

  // ── Students ──────────────────────────────────────────────────────────────

  getStudents(p: Record<string, string> = {}): Observable<any> {
    let params = new HttpParams();
    Object.entries(p).forEach(([k, v]) => { params = params.set(k, v); });
    return this.http.get<any>(`${this.base}/students`, { params });
  }

  getStudent(id: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/students/${id}`);
  }

  createStudent(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/students`, data);
  }

  updateStudent(id: string, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.base}/students/${id}`, data);
  }

  deleteStudent(id: string, reason?: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/students/${id}`,
      { body: { reason } });
  }

  // ── Classes ───────────────────────────────────────────────────────────────

  getClasses(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.base}/classes`);
  }

  getClassNames(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.base}/classes/names`);
  }

  createClass(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/classes`, data);
  }

  updateClass(id: string, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.base}/classes/${id}`, data);
  }

  // ── Exams ─────────────────────────────────────────────────────────────────

  getExam(id: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/exams/${id}`);
  }

  createExam(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/exams`, data);
  }

  updateExam(id: string, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.base}/exams/${id}`, data);
  }

  publishExam(id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/exams/${id}/publish`, {});
  }

  generateAdmitCards(examId: string, center?: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.base}/exams/${examId}/generate-admit-cards`, { center });
  }

  getAdmitCardForPrint(studentId: string, examId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.base}/exams/admit-cards/${studentId}/${examId}`);
  }

  getAdmitCardsByExam(examId: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.base}/exams/admit-cards/exam/${examId}`);
  }

  // ── Marks & Results ───────────────────────────────────────────────────────

  getMarksByExamAndClass(examId: string, cls: string, section?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (section) params = params.set('section', section);
    return this.http.get<ApiResponse<any>>(
      `${this.base}/marks/${examId}/${cls}`, { params });
  }

  getMarksProgress(examId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/marks/progress/${examId}`);
  }

  computeResults(examId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.base}/results/compute/${examId}`, {});
  }

  publishResults(examId: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.base}/results/publish/${examId}`, {});
  }

  getResultForPrint(studentId: string, examId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.base}/results/${studentId}/${examId}`);
  }

  getResultsByExam(examId: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.base}/results/exam/${examId}`);
  }

  // ── Fees ──────────────────────────────────────────────────────────────────

  generateFee(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/fees/generate`, data);
  }

  recordPayment(feeId: string, data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.base}/fees/${feeId}/pay`, data);
  }

  getStudentFees(studentId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.base}/fees/student/${studentId}`);
  }

  getDuesByClass(cls: string, section: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.base}/fees/dues/${cls}?section=${section}`);
  }

  waiveFee(feeId: string, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.base}/fees/${feeId}/waive`, data);
  }

  // ── Notices ───────────────────────────────────────────────────────────────

  getNotices(p: Record<string, string> = {}): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    Object.entries(p).forEach(([k, v]) => { params = params.set(k, v); });
    return this.http.get<ApiResponse<any[]>>(`${this.base}/notices`, { params });
  }

  getNoticeBoard(targetClass?: string): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (targetClass) params = params.set('targetClass', targetClass);
    return this.http.get<ApiResponse<any[]>>(
      `${this.base}/notices/board`, { params });
  }

  createNotice(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/notices`, data);
  }

  updateNotice(id: string, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.base}/notices/${id}`, data);
  }

  publishNotice(id: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.base}/notices/${id}/publish`, {});
  }

  unpublishNotice(id: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.base}/notices/${id}/unpublish`, {});
  }

  deleteNotice(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/notices/${id}`);
  }

  // ── Teachers ──────────────────────────────────────────────────────────────

  getTeachers(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.base}/auth/teachers`);
  }

  addTeacher(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/auth/add-teacher`, data);
  }

  updateTeacher(id: string, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.base}/auth/teacher/${id}`, data);
  }
}
