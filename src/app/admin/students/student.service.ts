import { Injectable }                  from '@angular/core';
import { HttpClient, HttpParams }       from '@angular/common/http';
import { Observable, BehaviorSubject }  from 'rxjs';
import { tap }                          from 'rxjs/operators';
import { environment }                  from '../../../environments/environment';
import { Student, ApiResponse }         from '../../core/models';

export interface StudentCredential {
  studentName?:    string;
  username:        string;
  defaultPassword?: string;
  alreadyExists?:  boolean;
}

// ─── Query params interface ────────────────────────────────────────────────────
export interface StudentQuery {
  class?:        string;
  section?:      string;
  isActive?:     boolean;
  search?:       string;
  academicYear?: string;
  page?:         number;
  limit?:        number;
  sort?:         string;
}

// ─── Paginated response ────────────────────────────────────────────────────────
export interface StudentListResponse {
  success:    boolean;
  count:      number;
  total:      number;
  page:       number;
  totalPages: number;
  data:       Student[];
}

// ─── Class name list response ──────────────────────────────────────────────────
export interface ClassSection {
  _id:          string;
  className:    string;
  section:      string;
  displayName?: string;
  studentCount?: number;
}

@Injectable({ providedIn: 'root' })
export class StudentService {

  private readonly base = `${environment.apiUrl}`;

  // ── Shared state: class names for dropdowns across pages ──────────────────
  // Cached so ClassSection API is called once per session, not per component.
  private classNamesSubject = new BehaviorSubject<string[]>([]);
  classNames$               = this.classNamesSubject.asObservable();

  private classListSubject  = new BehaviorSubject<ClassSection[]>([]);
  classList$                = this.classListSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ══ STUDENT CRUD ═════════════════════════════════════════════════════════

  /** List students with optional filters + pagination. */
  getStudents(query: StudentQuery = {}): Observable<StudentListResponse> {
    let params = new HttpParams();

    if (query.class)        params = params.set('class',        query.class);
    if (query.section)      params = params.set('section',      query.section);
    if (query.search)       params = params.set('search',       query.search);
    if (query.academicYear) params = params.set('academicYear', query.academicYear);
    if (query.sort)         params = params.set('sort',         query.sort);

    // Always send isActive; default true
    params = params.set('isActive', query.isActive !== false ? 'true' : 'false');
    params = params.set('page',     String(query.page  ?? 1));
    params = params.set('limit',    String(query.limit ?? 20));

    return this.http.get<StudentListResponse>(
      `${this.base}/students`, { params }
    );
  }

  /** Single student by ID. */
  getStudent(id: string): Observable<ApiResponse<Student>> {
    return this.http.get<ApiResponse<Student>>(`${this.base}/students/${id}`);
  }

  /** Create a new student. */
  createStudent(data: Partial<Student> & Record<string, any>): Observable<ApiResponse<Student>> {
    return this.http.post<ApiResponse<Student>>(`${this.base}/students`, data);
  }

  /** Partial update — only sends changed fields. */
  updateStudent(id: string, data: Partial<Student> & Record<string, any>): Observable<ApiResponse<Student>> {
    return this.http.put<ApiResponse<Student>>(`${this.base}/students/${id}`, data);
  }

  /** Soft-delete — sets isActive: false. */
  deleteStudent(id: string, reason?: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.base}/students/${id}`,
      { body: reason ? { reason } : undefined }
    );
  }

  /** Dashboard aggregate: count by class-section. */
  getStudentStats(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/students/stats`);
  }

  /** Bulk import up to 200 students. */
  bulkCreate(students: any[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.base}/students/bulk`, { students }
    );
  }

  // ══ CLASS / SECTION ═══════════════════════════════════════════════════════

  /** Get all class-section objects for the institute. Caches in classList$. */
  getClasses(): Observable<ApiResponse<ClassSection[]>> {
    return this.http.get<ApiResponse<ClassSection[]>>(`${this.base}/classes`).pipe(
      tap(res => {
        if (res.data) this.classListSubject.next(res.data);
      }),
    );
  }

  /**
   * Get distinct class names as a simple sorted string array.
   * Used to populate the class filter dropdown.
   * e.g. ["1", "2", "3", "10", "11", "12"]
   */
  getClassNames(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.base}/classes/names`).pipe(
      tap(res => {
        if (res.data) this.classNamesSubject.next(res.data);
      }),
    );
  }

  /**
   * Get sections for a given class.
   * Derived from the cached classList$ — no extra API call.
   */
  getSectionsForClass(className: string): string[] {
    return this.classListSubject.value
      .filter(c => c.className === className)
      .map(c => c.section)
      .sort();
  }

  // ══ STUDENT LOGIN CREDENTIALS ════════════════════════════════════════════

  /** Generate (or re-fetch) portal login credentials for a student. */
  generateCredentials(studentId: string): Observable<ApiResponse<StudentCredential>> {
    return this.http.post<ApiResponse<StudentCredential>>(
      `${this.base}/students/${studentId}/credentials`, {}
    );
  }

  // ══ EXPORT ════════════════════════════════════════════════════════════════

  /** Download students as Excel file blob. */
  exportStudents(): Observable<Blob> {
    return this.http.get(`${this.base}/export/students`, { responseType: 'blob' });
  }

  // ══ HELPERS ═══════════════════════════════════════════════════════════════

  /** Format a student's full address from the nested address object. */
  formatAddress(student: any): string {
    const a = student?.address;
    if (!a) return '—';
    return [a.street, a.city, a.state, a.pincode].filter(Boolean).join(', ');
  }

  /** Age from ISO dob string. */
  calculateAge(dob: string): number | null {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    let age     = today.getFullYear() - birth.getFullYear();
    const m     = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }
}
