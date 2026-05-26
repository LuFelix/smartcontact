import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FullUserResponse } from '../../features/shared/models/users.models';

export interface CreateMemberData {
  name: string;
  email: string;
  password?: string;
  roleId: string;
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/team`;

  /**
   * Convida um novo membro para a equipe.
   */
  addMember(data: CreateMemberData): Observable<FullUserResponse> {
    return this.http.post<FullUserResponse>(`${this.API_URL}/members`, data);
  }

  /**
   * Lista todos os membros do workspace do usuário logado.
   */
  listMembers(): Observable<{ data: FullUserResponse[], total: number }> {
    return this.http.get<{ data: FullUserResponse[], total: number }>(`${this.API_URL}/members`);
  }
}
