import { Injectable }                 from '@angular/core';
import { HttpClient, HttpParams }     from '@angular/common/http';
import { Observable }                 from 'rxjs';
import { environment }                from '../../../environments/environment';

export interface ClassTeacher {
  _id:            string;
  name:           string;
  email:          string;
  subject:        string;
  assignedClasses?: string[];
}

export interface ClassRecord {
  _id:           string;
  id:            string;
  instituteId:   string;
  className:     string;
  section:       string;
  displayName:   string;
  classTeacherId: ClassTeacher | null;
  academicYear:  string;
  roomNumber:    string | null;
  isActive:      boolean;
  studentCount?: number;
  createdAt?:    string;
  updatedAt?:    string;
}

export interface CreateClassPayload {
  className:      string;
  section:        string;
  classTeacherId?: string | null;
  academicYear?:  string;
  roomNumber?:    string;
}

@Injectable({ providedIn: 'root' })
export class ClassService {

  private readonly base = `${environment.apiUrl}/classes`;

  constructor(private http: HttpClient) {}

  getClasses(params: { academicYear?: string; isActive?: boolean } = {}): Observable<any> {
    let p = new HttpParams();
    if (params.academicYear)    p = p.set('academicYear', params.academicYear);
    if (params.isActive === false) p = p.set('isActive', 'false');
    return this.http.get<any>(this.base, { params: p });
  }

  getClassNames(): Observable<{ success: boolean; data: string[] }> {
    return this.http.get<{ success: boolean; data: string[] }>(`${this.base}/names`);
  }

  getClass(id: string): Observable<{ success: boolean; data: ClassRecord }> {
    return this.http.get<{ success: boolean; data: ClassRecord }>(`${this.base}/${id}`);
  }

  createClass(payload: CreateClassPayload): Observable<any> {
    return this.http.post<any>(this.base, payload);
  }

  updateClass(id: string, payload: Partial<CreateClassPayload> & { isActive?: boolean }): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}`, payload);
  }

  deleteClass(id: string): Observable<any> {
    return this.http.delete<any>(`${this.base}/${id}`);
  }
}
