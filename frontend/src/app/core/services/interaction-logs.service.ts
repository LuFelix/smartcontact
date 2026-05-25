import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Lead } from '../../features/shared/models/users.models';

@Injectable({
  providedIn: 'root'
})
export class InteractionLogsService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/interaction-logs`;

  listMyLeads(): Observable<Lead[]> {
    return this.http.get<Lead[]>(`${this.API_URL}/leads`);
  }

  captureLead(tagId: string, leadData: { name: string, email: string, phone?: string }): Observable<any> {
    return this.http.post(`${this.API_URL}/capture-lead/${tagId}`, { ...leadData, tagId });
  }
}
