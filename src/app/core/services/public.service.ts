import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicRegisterPayload {
  instituteName:   string;
  instituteCode:   string;
  address:         string;
  contactEmail:    string;
  contactPhone?:   string;
  website?:        string;
  adminName:       string;
  adminEmail:      string;
  adminPassword:   string;
}

export interface PublicRegisterResponse {
  success:     boolean;
  message:     string;
  data: {
    institute: {
      _id:           string;
      name:          string;
      code:          string;
      plan:          string;
      planExpiresAt: string;
      contactEmail:  string;
      createdAt:     string;
    };
    admin: {
      _id:   string;
      name:  string;
      email: string;
      role:  string;
    };
    trialEndsAt: string;
    trialDays:   number;
  };
}

@Injectable({ providedIn: 'root' })
export class PublicService {

  constructor(private http: HttpClient) {}

  registerInstitute(payload: PublicRegisterPayload): Observable<PublicRegisterResponse> {
    return this.http.post<PublicRegisterResponse>(
      `${environment.apiUrl}/public/register`,
      payload,
    );
  }
}
