import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FullUserResponse, RedirectMode } from '../shared/models/users.models';

export interface TagResolutionResponse {
  redirectMode: RedirectMode;
  customUrl?: string;
  user: FullUserResponse;
}

@Injectable({
  providedIn: 'root'
})
export class TagService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  resolveTag(uuid: string): Observable<TagResolutionResponse> {
    return this.http.get<TagResolutionResponse>(`${this.API_URL}/tags/resolve/${uuid}`);
  }
}
