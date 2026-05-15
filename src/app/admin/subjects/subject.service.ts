import { Injectable }             from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable }             from 'rxjs';
import { environment }            from '../../../environments/environment';

export interface SubjectTeacher {
  _id:     string;
  name:    string;
  email:   string;
  subject: string;
}

export interface SubjectClassSection {
  _id:          string;
  className:    string;
  section:      string;
  academicYear: string;
  roomNumber?:  string;
}

export interface SubjectAssignment {
  _id:            string;
  classSectionId: SubjectClassSection;
  className:      string;
  section:        string;
  academicYear:   string;
  subjectName:    string;
  teacherId:      SubjectTeacher | null;
  isActive:       boolean;
  createdAt?:     string;
}

export interface CreateSubjectPayload {
  classSectionId: string;
  subjectName:    string;
  teacherId?:     string | null;
}

export interface UpdateSubjectPayload {
  teacherId?: string | null;
  isActive?:  boolean;
}

@Injectable({ providedIn: 'root' })
export class SubjectService {

  private readonly base = `${environment.apiUrl}/class-subjects`;

  constructor(private http: HttpClient) {}

  getSubjects(params: {
    classSectionId?: string;
    className?:      string;
    section?:        string;
    academicYear?:   string;
    teacherId?:      string;
    isActive?:       boolean;
  } = {}): Observable<any> {
    let p = new HttpParams();
    if (params.classSectionId) p = p.set('classSectionId', params.classSectionId);
    if (params.className)      p = p.set('className',      params.className);
    if (params.section)        p = p.set('section',        params.section);
    if (params.academicYear)   p = p.set('academicYear',   params.academicYear);
    if (params.teacherId)      p = p.set('teacherId',      params.teacherId);
    if (params.isActive === false) p = p.set('isActive',   'false');
    return this.http.get<any>(this.base, { params: p });
  }

  getSubjectsByClass(classSectionId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/by-class/${classSectionId}`);
  }

  getSubject(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  createSubject(payload: CreateSubjectPayload): Observable<any> {
    return this.http.post<any>(this.base, payload);
  }

  updateSubject(id: string, payload: UpdateSubjectPayload): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}`, payload);
  }

  deleteSubject(id: string): Observable<any> {
    return this.http.delete<any>(`${this.base}/${id}`);
  }
}
