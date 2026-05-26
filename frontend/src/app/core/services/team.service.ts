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

export interface InvitationResponse {
  id: string;
  token: string;
  tenantId: string;
  roleId: string;
  expiresAt: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/team`;
  private readonly INV_URL = `${environment.apiUrl}/invitations`;

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

  /**
   * Gera um novo convite de grupo.
   */
  createInvitation(roleId: string): Observable<InvitationResponse> {
    return this.http.post<InvitationResponse>(`${this.API_URL}/invitations`, { roleId });
  }

  /**
   * Resolve um convite pelo token.
   */
  resolveInvitation(token: string): Observable<InvitationResponse> {
    return this.http.get<InvitationResponse>(`${this.INV_URL}/resolve/${token}`);
  }

  /**
   * Aceita um convite de grupo.
   */
  acceptInvitation(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.INV_URL}/accept/${token}`, {});
  }
}
