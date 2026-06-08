import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FullUserResponse, RedirectMode, Tag } from '../../features/shared/models/users.models';

export interface TagResolutionResponse {
  id: string;
  redirectMode: RedirectMode;
  customUrl?: string;
  user: FullUserResponse;
  tech_type: 'qr' | 'nfc';
}

@Injectable({
  providedIn: 'root'
})
export class TagService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/tags`;

  resolveTag(uuid: string, source?: string): Observable<TagResolutionResponse> {
    const url = source ? `${this.API_URL}/resolve/${uuid}?source=${source}` : `${this.API_URL}/resolve/${uuid}`;
    return this.http.get<TagResolutionResponse>(url);
  }

  /**
   * Lista as tags acessíveis para o usuário (Admin vê todas, Tutor vê as delegadas).
   */
  findAll(): Observable<Tag[]> {
      return this.http.get<Tag[]>(this.API_URL);
  }

  /**
   * Lista os recursos do Workspace delegados ao usuário logado.
   */
  getMyDelegated(): Observable<Tag[]> {
      return this.http.get<Tag[]>(`${this.API_URL}/my-delegated`);
  }

  /**
   * Cadastra uma nova tag no estoque.
   */
  create(tagData: Partial<Tag>): Observable<Tag> {
      return this.http.post<Tag>(this.API_URL, tagData);
  }

  /**
   * Atualiza as configurações de uma tag.
   */
  update(tagId: string, tagData: Partial<Tag>): Observable<Tag> {
      return this.http.patch<Tag>(`${this.API_URL}/${tagId}`, tagData);
  }

  /**
   * Remove uma tag do estoque.
   */
  delete(tagId: string): Observable<void> {
      return this.http.delete<void>(`${this.API_URL}/${tagId}`);
  }

  /**
   * Delega acesso a uma tag específica para outro usuário.
   */
  grantAccess(tagId: string, userId: string): Observable<any> {
      return this.http.post(`${this.API_URL}/${tagId}/grant/${userId}`, {});
  }

  /**
   * Revoga acesso a uma tag específica de outro usuário.
   */
  revokeAccess(tagId: string, userId: string): Observable<any> {
      return this.http.delete(`${this.API_URL}/${tagId}/revoke/${userId}`);
  }
}
