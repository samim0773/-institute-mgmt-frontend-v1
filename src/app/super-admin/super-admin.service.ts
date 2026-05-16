import { Injectable }             from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable }             from 'rxjs';
import { environment }            from '../../environments/environment';
import { Institute, ApiResponse } from '../core/models';

export interface InstituteWithStats extends Institute {
  plan:      string;
  updatedAt: string;
  stats: {
    totalUsers:     number;
    totalStudents:  number;
    activeStudents: number;
    totalAdmins:    number;
    totalTeachers:  number;
    fees: {
      pending: { count: number; total: number };
      partial: { count: number; total: number };
      paid:    { count: number; total: number };
    };
  };
}

export interface InstituteUser {
  _id:         string;
  name:        string;
  email:       string;
  role:        'admin' | 'teacher';
  subject:     string | null;
  isActive:    boolean;
  lastLoginAt: string | null;
}

export interface InstituteDetail extends Institute {
  plan:      string;
  updatedAt: string;
  users:     InstituteUser[];
  stats: {
    totalStudents:  number;
    activeStudents: number;
  };
}

export interface PlatformStats {
  totalInstitutes:    number;
  activeInstitutes:   number;
  inactiveInstitutes: number;
  totalStudents:      number;
  totalUsers:         number;
  byPlan: { _id: string; count: number }[];
}

export interface CreateInstitutePayload {
  instituteName:  string;
  instituteCode:  string;
  address:        string;
  contactEmail:   string;
  contactPhone?:  string;
  website?:       string;
  plan?:          string;
  planExpiresAt?: string;
  adminName:      string;
  adminEmail:     string;
  adminPassword:  string;
}

export const PLANS = [
  { value: 'trial',    label: 'Trial',    color: '#f57c00' },
  { value: 'basic',    label: 'Basic',    color: '#1565c0' },
  { value: 'standard', label: 'Standard', color: '#2e7d32' },
];

@Injectable({ providedIn: 'root' })
export class SuperAdminService {

  private readonly base = `${environment.apiUrl}/super`;

  constructor(private http: HttpClient) {}

  // ── Stats ─────────────────────────────────────────────────────────────────

  getPlatformStats(): Observable<ApiResponse<PlatformStats>> {
    return this.http.get<ApiResponse<PlatformStats>>(`${this.base}/stats`);
  }

  // ── Institutes ────────────────────────────────────────────────────────────

  getInstitutes(q: {
    isActive?: boolean;
    plan?:     string;
    search?:   string;
  } = {}): Observable<ApiResponse<InstituteWithStats[]>> {
    let p = new HttpParams();
    if (q.isActive !== undefined) p = p.set('isActive', String(q.isActive));
    if (q.plan)   p = p.set('plan',   q.plan);
    if (q.search) p = p.set('search', q.search);
    return this.http.get<ApiResponse<InstituteWithStats[]>>(`${this.base}/institutes`, { params: p });
  }

  getInstitute(id: string): Observable<ApiResponse<InstituteDetail>> {
    return this.http.get<ApiResponse<InstituteDetail>>(`${this.base}/institutes/${id}`);
  }

  createInstitute(payload: CreateInstitutePayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/institutes`, payload);
  }

  updateInstitute(id: string, payload: Partial<CreateInstitutePayload>): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.base}/institutes/${id}`, payload);
  }

  toggleStatus(id: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.base}/institutes/${id}/toggle`, {});
  }

  updatePlan(id: string, plan: string, planExpiresAt?: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.base}/institutes/${id}/plan`, { plan, planExpiresAt });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  planLabel(plan: string): string {
    return PLANS.find(p => p.value === plan)?.label ?? plan;
  }

  planColor(plan: string): string {
    return PLANS.find(p => p.value === plan)?.color ?? '#616161';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
