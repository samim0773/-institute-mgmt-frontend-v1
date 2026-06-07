import { Injectable }  from '@angular/core';
import { HttpClient }  from '@angular/common/http';
import { Observable }  from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, StudentProfile, Result, Notice, FeeBill, AdmitCard, PaymentOrder } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class StudentPortalService {

  private readonly base = `${environment.apiUrl}/student`;

  constructor(private http: HttpClient) {}

  getMyProfile(): Observable<ApiResponse<StudentProfile>> {
    return this.http.get<ApiResponse<StudentProfile>>(`${this.base}/me`);
  }

  getMyResults(): Observable<ApiResponse<Result[]>> {
    return this.http.get<ApiResponse<Result[]>>(`${this.base}/results`);
  }

  getMyNotices(): Observable<ApiResponse<Notice[]>> {
    return this.http.get<ApiResponse<Notice[]>>(`${this.base}/notices`);
  }

  getMyFees(): Observable<ApiResponse<FeeBill[]>> {
    return this.http.get<ApiResponse<FeeBill[]>>(`${this.base}/fees`);
  }

  getMyAdmitCards(): Observable<ApiResponse<AdmitCard[]>> {
    return this.http.get<ApiResponse<AdmitCard[]>>(`${this.base}/admit-cards`);
  }

  createPaymentOrder(billId: string): Observable<ApiResponse<PaymentOrder>> {
    return this.http.post<ApiResponse<PaymentOrder>>(
      `${environment.apiUrl}/payment/create-order`, { billId }
    );
  }

  verifyPayment(payload: {
    razorpay_order_id:   string;
    razorpay_payment_id: string;
    razorpay_signature:  string;
    billId:              string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${environment.apiUrl}/payment/verify`, payload
    );
  }
}
