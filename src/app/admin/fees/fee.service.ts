import { Injectable }                 from '@angular/core';
import { HttpClient, HttpParams }     from '@angular/common/http';
import { Observable }                 from 'rxjs';
import { environment }                from '../../../environments/environment';
import { Fee, ApiResponse }           from '../../core/models';

// ─── Extended types beyond core models ────────────────────────────────────────

/** Fee as returned by the API — includes computed virtuals */
export interface FeeWithVirtuals extends Fee {
  amountPaid:   number;
  amountDue:    number;
  lateFine:     number;
  isOverdue:    boolean;
  waivedAmount?: number;
  waivedReason?: string;
  lateFinePerDay?: number;
  academicYear?: string;
  notes?: string;
  studentId: any;   // populated Student or string
}

/** Per-student grouping returned by GET /fees/dues/:class */
export interface StudentDues {
  student:    { _id: string; name: string; rollNo: string; class: string; section: string };
  fees:       DueFeeItem[];
  totalDue:   number;
  totalPaid:  number;
  balance:    number;
  lateFine:   number;
  hasOverdue: boolean;
}

export interface DueFeeItem {
  feeId:      string;
  feeType:    string;
  amount:     number;
  amountPaid: number;
  amountDue:  number;
  lateFine:   number;
  dueDate:    string;
  status:     string;
  isOverdue:  boolean;
}

/** Dashboard summary */
export interface FeeSummary {
  totalBilled:    number;
  totalCollected: number;
  totalPending:   number;
  overdueCount:   number;
  byStatus:       { _id: string; count: number; totalAmount: number }[];
}

/** Student payment history response */
export interface StudentFeeHistory {
  student: any;
  summary: {
    totalRecords:  number;
    totalDue:      number;
    totalPaid:     number;
    totalBalance:  number;
    totalLateFine: number;
    overdueCount:  number;
  };
  data: FeeWithVirtuals[];
}

/** Generate fee request payload */
export interface GenerateFeePayload {
  feeType:        string;
  amount:         number;
  dueDate:        string;
  studentId?:     string;          // single mode
  class?:         string;          // bulk mode
  section?:       string;          // bulk mode
  academicYear?:  string;
  lateFinePerDay?: number;
  notes?:         string;
  waivedAmount?:  number;
  waivedReason?:  string;
}

/** Record payment request payload */
export interface RecordPaymentPayload {
  amount:       number;
  mode:         string;
  date?:        string;
  referenceNo?: string;
  note?:        string;
}

export const PAYMENT_MODES = [
  { value: 'cash',          label: 'Cash' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'upi',           label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'dd',            label: 'Demand Draft' },
  { value: 'other',         label: 'Other' },
];

@Injectable({ providedIn: 'root' })
export class FeeService {

  private readonly base = `${environment.apiUrl}/fees`;

  constructor(private http: HttpClient) {}

  // ══ FEE GENERATION ═══════════════════════════════════════════════════════

  /** Create fee(s) — single student or bulk class */
  generateFee(payload: GenerateFeePayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/generate`, payload);
  }

  // ══ PAYMENTS ══════════════════════════════════════════════════════════════

  /** Append a payment entry to a fee record */
  recordPayment(
    feeId:   string,
    payload: RecordPaymentPayload,
  ): Observable<ApiResponse<FeeWithVirtuals>> {
    return this.http.post<ApiResponse<FeeWithVirtuals>>(
      `${this.base}/${feeId}/pay`, payload,
    );
  }

  /** Remove a payment entry (e.g. bounced cheque) */
  deletePayment(feeId: string, paymentId: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.base}/${feeId}/payment/${paymentId}`,
    );
  }

  // ══ WAIVERS ═══════════════════════════════════════════════════════════════

  waiveFee(
    feeId:        string,
    waivedAmount: number,
    waivedReason?: string,
  ): Observable<ApiResponse<FeeWithVirtuals>> {
    return this.http.put<ApiResponse<FeeWithVirtuals>>(
      `${this.base}/${feeId}/waive`,
      { waivedAmount, waivedReason },
    );
  }

  // ══ QUERIES ═══════════════════════════════════════════════════════════════

  /** Paginated list of all fees for the institute */
  getAllFees(params: {
    status?:       string;
    feeType?:      string;
    academicYear?: string;
    page?:         number;
    limit?:        number;
  } = {}): Observable<ApiResponse<FeeWithVirtuals[]>> {
    let p = new HttpParams();
    if (params.status)       p = p.set('status',       params.status);
    if (params.feeType)      p = p.set('feeType',      params.feeType);
    if (params.academicYear) p = p.set('academicYear', params.academicYear);
    p = p.set('page',  String(params.page  ?? 1));
    p = p.set('limit', String(params.limit ?? 20));
    return this.http.get<ApiResponse<FeeWithVirtuals[]>>(this.base, { params: p });
  }

  /** Full payment history for one student */
  getStudentFees(
    studentId:    string,
    status?:      string,
    academicYear?: string,
  ): Observable<StudentFeeHistory> {
    let p = new HttpParams();
    if (status)       p = p.set('status',       status);
    if (academicYear) p = p.set('academicYear', academicYear);
    return this.http.get<StudentFeeHistory>(
      `${this.base}/student/${studentId}`, { params: p },
    );
  }

  /** Pending/partial dues grouped by student for a class */
  getDuesByClass(
    className: string,
    section:   string,
  ): Observable<ApiResponse<StudentDues[]>> {
    return this.http.get<ApiResponse<StudentDues[]>>(
      `${this.base}/dues/${className}`,
      { params: new HttpParams().set('section', section) },
    );
  }

  /** Dashboard summary stats */
  getFeeSummary(academicYear?: string): Observable<ApiResponse<FeeSummary>> {
    const p = academicYear
      ? new HttpParams().set('academicYear', academicYear)
      : undefined;
    return this.http.get<ApiResponse<FeeSummary>>(`${this.base}/summary`, { params: p });
  }

  // ══ HELPERS ═══════════════════════════════════════════════════════════════

  statusLabel(status: string): string {
    return { pending: 'Pending', partial: 'Partial', paid: 'Paid', waived: 'Waived' }[status] ?? status;
  }

  statusClass(status: string): string {
    return { pending: 'badge-pending', partial: 'badge-partial', paid: 'badge-paid', waived: 'badge-waived' }[status] ?? '';
  }

  formatCurrency(amount: number): string {
    return '₹' + (amount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  modeLabel(mode: string): string {
    return PAYMENT_MODES.find(m => m.value === mode)?.label ?? mode;
  }
}
