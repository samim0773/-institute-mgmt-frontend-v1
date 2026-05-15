import { Injectable }             from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable }             from 'rxjs';
import { environment }            from '../../../environments/environment';
import { Notice, ApiResponse }    from '../../core/models';

export interface NoticeQuery {
  isPublished?: boolean;
  targetClass?: string;
  category?:   string;
  page?:       number;
  limit?:      number;
}

export interface NoticeCreatePayload {
  title:          string;
  content:        string;
  category?:      string;
  targetClass?:   string | null;
  isPublished?:   boolean;
  expiresAt?:     string | null;
  attachmentUrl?: string | null;
}

export const NOTICE_CATEGORIES = [
  { value: 'general', label: 'General',  icon: 'campaign'      },
  { value: 'exam',    label: 'Exam',     icon: 'assignment'     },
  { value: 'holiday', label: 'Holiday',  icon: 'beach_access'   },
  { value: 'fee',     label: 'Fee',      icon: 'receipt_long'   },
  { value: 'event',   label: 'Event',    icon: 'event'          },
  { value: 'urgent',  label: 'Urgent',   icon: 'priority_high'  },
];

export const CATEGORY_EMOJI: Record<string, string> = {
  general: '📢', exam: '📝', holiday: '🏖️',
  fee: '💰', event: '🎉', urgent: '🚨',
};

@Injectable({ providedIn: 'root' })
export class NoticeService {

  private readonly base = `${environment.apiUrl}/notices`;

  constructor(private http: HttpClient) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  getNotices(q: NoticeQuery = {}): Observable<ApiResponse<Notice[]>> {
    let p = new HttpParams();
    if (q.isPublished !== undefined) p = p.set('isPublished', String(q.isPublished));
    if (q.targetClass) p = p.set('targetClass', q.targetClass);
    if (q.category)    p = p.set('category',    q.category);
    p = p.set('page',  String(q.page  ?? 1));
    p = p.set('limit', String(q.limit ?? 20));
    return this.http.get<ApiResponse<Notice[]>>(this.base, { params: p });
  }

  getNotice(id: string): Observable<ApiResponse<Notice>> {
    return this.http.get<ApiResponse<Notice>>(`${this.base}/${id}`);
  }

  /** Published non-expired notices for notice board */
  getBoard(targetClass?: string): Observable<ApiResponse<Notice[]>> {
    let p = new HttpParams();
    if (targetClass) p = p.set('targetClass', targetClass);
    return this.http.get<ApiResponse<Notice[]>>(`${this.base}/board`, { params: p });
  }

  createNotice(payload: NoticeCreatePayload): Observable<ApiResponse<Notice>> {
    return this.http.post<ApiResponse<Notice>>(this.base, payload);
  }

  updateNotice(id: string, payload: Partial<NoticeCreatePayload>): Observable<ApiResponse<Notice>> {
    return this.http.put<ApiResponse<Notice>>(`${this.base}/${id}`, payload);
  }

  publishNotice(id: string): Observable<ApiResponse<Notice>> {
    return this.http.put<ApiResponse<Notice>>(`${this.base}/${id}/publish`, {});
  }

  unpublishNotice(id: string): Observable<ApiResponse<Notice>> {
    return this.http.put<ApiResponse<Notice>>(`${this.base}/${id}/unpublish`, {});
  }

  deleteNotice(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/${id}`);
  }

  getStats(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/stats`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  categoryEmoji(cat: string): string {
    return CATEGORY_EMOJI[cat] ?? '📢';
  }

  categoryLabel(cat: string): string {
    return NOTICE_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
  }

  categoryIcon(cat: string): string {
    return NOTICE_CATEGORIES.find(c => c.value === cat)?.icon ?? 'campaign';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
}
