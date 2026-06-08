import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/users`;

  /**
   * Obtém a lista de IDs de recursos (tags) delegados a um usuário no workspace atual.
   */
  getUserTags(userId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/${userId}/tags`);
  }

  /**
   * Atualiza as permissões de recursos de um usuário em lote (array de IDs).
   */
  updateUserTags(userId: string, tagIds: string[]): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/${userId}/tags`, tagIds);
  }
}
