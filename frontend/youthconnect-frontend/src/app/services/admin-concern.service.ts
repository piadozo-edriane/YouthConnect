import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

export interface Concern {
  concernId: number;
  youthId: number;
  youthFirstName?: string;
  youthLastName?: string;
  typeOfConcern: 'PROJECT_CONCERN' | 'COMMUNITY_CONCERN' | 'SYSTEM_CONCERN';
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt?: string;
}

export interface ConcernUpdate {
  updateId: number;
  concernId: number;
  updatedByAdminId?: number;
  youthId?: number;
  updateText: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  senderType?: 'SK_OFFICIAL' | 'YOUTH' | 'SYSTEM';
  senderName?: string;
}

export interface AdminConcernUpdateRequest {
  adminId: number;
  updateText: string;
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
}

@Injectable({
  providedIn: 'root'
})
export class AdminConcernService {
  private apiUrl = `${environment.apiUrl}/api/admin/concerns`;

  constructor(private http: HttpClient) {}

  getAllConcerns(): Observable<Concern[]> {
    return this.http.get<Concern[]>(this.apiUrl);
  }

  updateConcernStatus(concernId: number, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${concernId}/status?status=${status}`, {});
  }

  addConcernUpdate(concernId: number, request: AdminConcernUpdateRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/${concernId}/updates`, request, { responseType: 'text' });
  }

  getConcernUpdates(concernId: number): Observable<ConcernUpdate[]> {
    return this.http.get<ConcernUpdate[]>(`${this.apiUrl}/${concernId}/updates`);
  }

  deleteConcern(concernId: number): Observable<string> {
    return this.http.delete(`${this.apiUrl}/${concernId}`, { responseType: 'text' });
  }
}
