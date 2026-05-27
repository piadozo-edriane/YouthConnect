import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { CivilStatus, Gender, Suffix } from '../models/enums';

export type UserApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface YouthUserAccount {
  userId: number;
  youthId: number;
  roleId: number;
  email: string;
  isActive: boolean;
  status: UserApprovalStatus;
  createdAt: string;
}

export interface YouthProfileAccount {
  youthId: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: Suffix | null;
  gender: Gender;
  birthday: string;
  contactNumber: string;
  completeAddress: string;
  civilStatus: CivilStatus;
  age?: number;
  createdAt: string;
  updatedAt?: string;
  youthClassification?: {
    youthClassification?: string;
    educationBackground?: string;
    workStatus?: string;
    skVoter?: boolean;
    nationalVoter?: boolean;
    pastVoter?: boolean;
    numAttended?: number;
    nonAttendedReason?: string;
  };
}

export interface YouthMemberListItem {
  userId: number;
  roleId?: number;
  youthId: number;
  firstName: string;
  lastName: string;
  email: string;
  gender: Gender;
  birthday: string;
  contactNumber: string;
  civilStatus: CivilStatus;
  isActive: boolean;
  status: UserApprovalStatus;
  createdAt: string;
  middleName?: string | null;
  suffix?: Suffix | null;
  completeAddress?: string;
  youthClassification?: {
    youthClassification?: string;
    educationBackground?: string;
    workStatus?: string;
    skVoter?: boolean;
    nationalVoter?: boolean;
    pastVoter?: boolean;
    numAttended?: number;
    nonAttendedReason?: string;
  };
}

export interface UpdateYouthUserPayload {
  email: string;
  roleId: number;
  active: boolean;
  status: UserApprovalStatus;
}

export interface UpdateYouthProfilePayload {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: Suffix | null;
  gender: Gender;
  birthday: string;
  contactNumber: string;
  completeAddress: string;
  civilStatus: CivilStatus;
  youthClassification?: {
    youthClassification?: string;
    educationBackground?: string;
    workStatus?: string;
    skVoter?: boolean;
    nationalVoter?: boolean;
    pastVoter?: boolean;
    numAttended?: number;
    nonAttendedReason?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class YouthMemberManagementService {
  constructor(private http: HttpClient) { }

  getUsers(): Observable<YouthUserAccount[]> {
    return this.http.get<YouthUserAccount[]>('/api/administrator/users');
  }

  getYouthProfiles(): Observable<YouthProfileAccount[]> {
    return this.http.get<YouthProfileAccount[]>('/api/administrator/youth-profiles');
  }

  getYouthProfileById(youthId: number): Observable<YouthProfileAccount> {
    return this.http.get<YouthProfileAccount>(`/api/youth/profile/${youthId}`);
  }

  updateUser(userId: number, payload: UpdateYouthUserPayload): Observable<YouthUserAccount> {
    return this.http.put<YouthUserAccount>(`/api/administrator/users/${userId}`, {
      email: payload.email,
      roleId: payload.roleId,
      active: payload.active,
      status: payload.status
    });
  }

  approveUser(userId: number, adminId?: number): Observable<YouthUserAccount> {
    const body = adminId ? { adminId } : {};
    return this.http.post<YouthUserAccount>(`/api/admin/users/${userId}/approve`, body);
  }

  deactivateUser(userId: number): Observable<YouthUserAccount> {
    return this.http.put<YouthUserAccount>(`/api/administrator/users/${userId}/deactivate`, {});
  }

  reactivateUser(userId: number): Observable<YouthUserAccount> {
    return this.http.put<YouthUserAccount>(`/api/administrator/users/${userId}/reactivate`, {});
  }

  rejectUser(userId: number, reason: string): Observable<YouthUserAccount> {
    return this.http.post<YouthUserAccount>(`/api/admin/users/${userId}/reject`, { reason });
  }

  deleteUser(userId: number): Observable<{ message: string } | string> {
    return this.http.delete<{ message: string } | string>(`/api/administrator/users/${userId}`);
  }

  updateYouthProfile(youthId: number, payload: UpdateYouthProfilePayload): Observable<YouthProfileAccount> {
    return this.http.put<YouthProfileAccount>(`/api/administrator/youth-profiles/${youthId}`, payload);
  }

  deactivateYouthProfile(youthId: number): Observable<YouthUserAccount> {
    return this.http.put<YouthUserAccount>(`/api/administrator/youth-profiles/${youthId}/deactivate`, {});
  }

  deleteYouthProfile(youthId: number): Observable<{ message: string } | string> {
    return this.http.delete<{ message: string } | string>(`/api/administrator/youth-profiles/${youthId}`);
  }
}
