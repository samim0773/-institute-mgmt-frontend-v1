import { Injectable }                 from '@angular/core';
import { HttpClient, HttpParams }     from '@angular/common/http';
import { Observable }                 from 'rxjs';
import { environment }                from '../../../environments/environment';
import { ApiResponse }                from '../../core/models';

// ─── Bill-level types (new API) ───────────────────────────────────────────────

/** Individual fee type entry inside a bill */
export interface BillFeeItem {
  id:            string;
  feeType:       string;
  amount:        number;
  status:        string;
  amountPaid:    number;
  amountDue:     number;
  waivedAmount?: number;
  lateFine?:     number;
  payments?:     any[];
}

/** A bill — groups all fee types generated together for one student */
export interface Bill {
  billId:          string;
  institute?:      { name: string; code?: string; address?: string; phone?: string; logoUrl?: string };
  student:         { _id: string; name: string; rollNo: string; class: string; section: string; admissionNo?: string };
  academicYear?:   string;
  dueDate:         string;
  notes?:          string;
  lateFinePerDay?: number;
  feeBreakdown:    BillFeeItem[];
  totalAmount:     number;
  totalPaid:       number;
  totalDue:        number;
  totalLateFine?:  number;
  overallStatus:   string;
  isOverdue:       boolean;
  createdAt?:      string;
}

// ─── Dues-by-class types ──────────────────────────────────────────────────────

export interface DueFeeItem {
  feeId:      string;
  feeType:    string;
  amount:     number;
  amountPaid?: number;
  amountDue:  number;
  lateFine?:  number;
  dueDate:    string;
  status:     string;
  isOverdue:  boolean;
}

export interface StudentDues {
  student:    { _id: string; name: string; rollNo: string; class: string; section: string };
  fees:       DueFeeItem[];
  totalDue:   number;
  totalPaid:  number;
  balance:    number;
  lateFine:   number;
  hasOverdue: boolean;
}

// ─── Class bills (bulk print) ─────────────────────────────────────────────────

export interface ClassBillsResponse {
  success:   boolean;
  class:     string;
  section:   string;
  count:     number;
  institute: { name: string; code?: string; address?: string; phone?: string; logoUrl?: string } | null;
  data:      Bill[];
}

// ─── Dashboard summary ────────────────────────────────────────────────────────

export type SummaryPeriod = 'this-month' | 'month' | 'this-year' | 'prev-year' | 'all';

export interface FeeSummary {
  totalBilled:    number;
  totalCollected: number;
  totalPending:   number;
  overdueCount:   number;
  billCount:      number;
}

// ─── Student fee history ──────────────────────────────────────────────────────

export interface StudentFeeHistory {
  success:  boolean;
  student:  { _id: string; name: string; rollNo: string; class: string; section: string };
  summary: {
    totalBills:    number;
    totalAmount:   number;
    totalPaid:     number;
    totalBalance:  number;
    totalLateFine: number;
    overdueCount:  number;
  };
  data: Bill[];
}

// ─── Generate fee payload / response ─────────────────────────────────────────

export interface FeeItem {
  feeType: string;
  amount:  number;
}

export interface GenerateFeePayload {
  feeItems?:       FeeItem[];
  feeType?:        string;
  amount?:         number;
  dueDate:         string;
  studentId?:      string;
  class?:          string;
  section?:        string;
  academicYear?:   string;
  lateFinePerDay?: number;
  notes?:          string;
}

export interface FeeBreakdownItem {
  id:      string;
  feeType: string;
  amount:  number;
}

export interface GenerateFeeResponse {
  // single student mode
  billId?:          string;
  student?:         { id: string; name: string; rollNo: string };
  feeBreakdown?:    FeeBreakdownItem[];
  totalAmount?:     number;
  skipped?:         string[];
  // bulk mode
  studentCount?:    number;
  feeTypes?:        number;
  totalPerStudent?: number;
  created?:         number;
  bills?:           { billId: string; studentName: string; rollNo: string }[];
  errors?:          any[];
  count?:           number;
}

// ─── Record payment ───────────────────────────────────────────────────────────

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

  // ══ FEE GENERATION ════════════════════════════════════════════════════════

  generateFee(payload: GenerateFeePayload): Observable<ApiResponse<GenerateFeeResponse>> {
    return this.http.post<ApiResponse<GenerateFeeResponse>>(`${this.base}/generate`, payload);
  }

  // ══ PAYMENTS ══════════════════════════════════════════════════════════════

  recordPayment(feeId: string, payload: RecordPaymentPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/${feeId}/pay`, payload);
  }

  recordBillPayment(billId: string, payload: RecordPaymentPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/bill/${billId}/pay`, payload);
  }

  deletePayment(feeId: string, paymentId: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/${feeId}/payment/${paymentId}`);
  }

  // ══ WAIVERS ═══════════════════════════════════════════════════════════════

  waiveFee(feeId: string, waivedAmount: number, waivedReason?: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.base}/${feeId}/waive`, { waivedAmount, waivedReason });
  }

  // ══ QUERIES ═══════════════════════════════════════════════════════════════

  /** Paginated list of all bills for the institute */
  getAllFees(params: {
    status?:       string;
    feeType?:      string;
    academicYear?: string;
    page?:         number;
    limit?:        number;
  } = {}): Observable<{ success: boolean; count: number; total: number; page: number; totalPages: number; data: Bill[] }> {
    let p = new HttpParams();
    if (params.status)       p = p.set('status',       params.status);
    if (params.feeType)      p = p.set('feeType',      params.feeType);
    if (params.academicYear) p = p.set('academicYear', params.academicYear);
    p = p.set('page',  String(params.page  ?? 1));
    p = p.set('limit', String(params.limit ?? 20));
    return this.http.get<any>(this.base, { params: p });
  }

  /** Full bill history for one student */
  getStudentFees(studentId: string, status?: string, academicYear?: string): Observable<StudentFeeHistory> {
    let p = new HttpParams();
    if (status)       p = p.set('status',       status);
    if (academicYear) p = p.set('academicYear', academicYear);
    return this.http.get<StudentFeeHistory>(`${this.base}/student/${studentId}`, { params: p });
  }

  /** Get complete bill detail — includes payments[] per fee item */
  getBill(billId: string): Observable<ApiResponse<Bill>> {
    return this.http.get<ApiResponse<Bill>>(`${this.base}/bill/${billId}`);
  }

  /** Pending/partial dues grouped by student for a class */
  getDuesByClass(
    className: string,
    section:   string,
  ): Observable<{ success: boolean; class: string; studentCount: number; grandTotalDue: number; data: StudentDues[] }> {
    return this.http.get<any>(
      `${this.base}/dues/${className}`,
      { params: new HttpParams().set('section', section) },
    );
  }

  /** All bills for a class-section — for bulk fee slip printing */
  getClassBills(
    className: string,
    section:   string,
    params?:   { academicYear?: string; status?: string },
  ): Observable<ClassBillsResponse> {
    let p = new HttpParams().set('section', section);
    if (params?.academicYear) p = p.set('academicYear', params.academicYear);
    if (params?.status)       p = p.set('status',       params.status);
    return this.http.get<ClassBillsResponse>(`${this.base}/class/${className}/bills`, { params: p });
  }

  /** Dashboard summary stats */
  getFeeSummary(opts?: {
    period?: SummaryPeriod;
    month?:  number;
    year?:   number;
  }): Observable<ApiResponse<FeeSummary>> {
    let p = new HttpParams();
    if (opts?.period) p = p.set('period', opts.period);
    if (opts?.month)  p = p.set('month',  String(opts.month));
    if (opts?.year)   p = p.set('year',   String(opts.year));
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
