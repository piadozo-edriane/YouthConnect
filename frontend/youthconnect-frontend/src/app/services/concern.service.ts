import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

export interface ConcernRequest {
    youthId: number;
    typeOfConcern: 'PROJECT_CONCERN' | 'COMMUNITY_CONCERN' | 'SYSTEM_CONCERN';
    title: string;
    description: string;
}

export interface ConcernUpdateRequest {
    typeOfConcern: 'PROJECT_CONCERN' | 'COMMUNITY_CONCERN' | 'SYSTEM_CONCERN';
    title: string;
    description: string;
}

export interface YouthConcernReplyRequest {
    youthId: number;
    updateText: string;
}

export interface ConcernResponse {
    concernId: number;
    youthId: number;
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

@Injectable({
    providedIn: 'root'
})
export class ConcernService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/concerns`;
    private adminConcernsUrl = `${environment.apiUrl}/api/admin/concerns`;

    submitConcern(request: ConcernRequest): Observable<ConcernResponse> {
        return this.http.post<ConcernResponse>(this.apiUrl, request);
    }

    getOwnConcerns(youthId: number): Observable<ConcernResponse[]> {
        return this.http.get<ConcernResponse[]>(`${this.apiUrl}/youth/${youthId}`);
    }

    getConcernById(concernId: number): Observable<ConcernResponse> {
        return this.http.get<ConcernResponse>(`${this.apiUrl}/${concernId}`);
    }

    editConcern(concernId: number, request: ConcernUpdateRequest): Observable<ConcernResponse> {
        return this.http.put<ConcernResponse>(`${this.apiUrl}/${concernId}`, request);
    }

    deleteConcern(concernId: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${concernId}`, { responseType: 'text' });
    }

    cancelConcern(concernId: number): Observable<any> {
        return this.http.patch(`${this.apiUrl}/${concernId}/cancel`, {}, { responseType: 'text' });
    }

    getAllConcernsForSkOfficial(): Observable<ConcernResponse[]> {
        return this.http.get<ConcernResponse[]>(this.adminConcernsUrl);
    }

    getConcernUpdates(concernId: number): Observable<ConcernUpdate[]> {
        return this.http.get<ConcernUpdate[]>(`${this.apiUrl}/${concernId}/updates`);
    }

    addYouthReply(concernId: number, request: YouthConcernReplyRequest): Observable<ConcernUpdate> {
        return this.http.post<ConcernUpdate>(`${this.apiUrl}/${concernId}/updates/youth`, request);
    }
}
