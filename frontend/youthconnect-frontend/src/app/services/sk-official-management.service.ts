import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RoleSummary {
  roleId: number;
  roleName: string;
}

export interface SkOfficialAccount {
  adminId: number;
  firstName: string;
  lastName: string;
  suffix?: string | null;
  email: string;
  active?: boolean;
  isActive?: boolean;
  createdAt: string;
  role?: RoleSummary | null;
}

export interface CreateSkOfficialPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: number;
  active: boolean;
}

export interface UpdateSkOfficialPayload {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  roleId: number;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SkOfficialManagementService {
  constructor(private http: HttpClient) {}

  getSkOfficials(): Observable<SkOfficialAccount[]> {
    return this.http.get<SkOfficialAccount[]>('/api/administrator/sk-officials');
  }

  getSkOfficialById(adminId: number): Observable<SkOfficialAccount> {
    return this.http.get<SkOfficialAccount>(`/api/administrator/sk-officials/${adminId}`);
  }

  createSkOfficial(payload: CreateSkOfficialPayload): Observable<SkOfficialAccount> {
    return this.http.post<SkOfficialAccount>('/api/administrator/sk-officials', payload);
  }

  updateSkOfficial(adminId: number, payload: UpdateSkOfficialPayload): Observable<SkOfficialAccount> {
    return this.http.put<SkOfficialAccount>(`/api/administrator/sk-officials/${adminId}`, payload);
  }

  deleteSkOfficial(adminId: number): Observable<{ message: string } | string> {
    return this.http.delete<{ message: string } | string>(`/api/administrator/sk-officials/${adminId}`);
  }

  deactivateSkOfficial(adminId: number): Observable<SkOfficialAccount> {
    return this.http.put<SkOfficialAccount>(`/api/administrator/sk-officials/${adminId}/deactivate`, {});
  }

  activateSkOfficial(adminId: number): Observable<SkOfficialAccount> {
    return this.http.put<SkOfficialAccount>(`/api/administrator/sk-officials/${adminId}/activate`, {});
  }
}
