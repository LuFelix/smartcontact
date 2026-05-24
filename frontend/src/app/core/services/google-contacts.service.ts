import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SyncResponse {
  imported: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleContactsService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/integrations/google-contacts`;

  syncContacts(accessToken: string): Observable<SyncResponse> {
    return this.http.post<SyncResponse>(`${this.API_URL}/sync`, { accessToken });
  }
}
