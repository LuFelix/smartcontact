// Caminho: src/app/features/users/services/user.service.ts

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  UserApiResponse,
  User,
  FullUserResponse
} from '../../shared/models/users.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = environment.apiUrl;
  private readonly ITEM_PATH = `${this.API_URL}/users`; 
  
  private http = inject(HttpClient);
  
  findById(userId: string): Observable<FullUserResponse> {
    return this.http.get<FullUserResponse>(`${this.ITEM_PATH}/${userId}`);
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.ITEM_PATH}/${id}`);
  }

  exportUsers(filters: { name?: string, email?: string, cpf?: string }): Observable<Blob> {
    let params = new HttpParams();
    if (filters.name) params = params.set('name', filters.name);
    if (filters.email) params = params.set('email', filters.email);
    if (filters.cpf) params = params.set('cpf', filters.cpf);

    return this.http.get(`${this.ITEM_PATH}/exportXlsx`, {
      params,
      responseType: 'blob'
    });
  }

  updateUser(id: string, payload: any): Observable<User> {
    return this.http.patch<User>(`${this.ITEM_PATH}/${id}`, payload);
  }

  createUser(payload: any): Observable<User> {
    return this.http.post<User>(this.ITEM_PATH, payload);
  }

  findAllUsers(filters: any): Observable<UserApiResponse> {
    let params = new HttpParams()
        .set('page', filters.page?.toString() || '1')
        .set('limit', filters.limit?.toString() || '10');

    if (filters.name) params = params.set('name', filters.name);
    if (filters.email) params = params.set('email', filters.email);
    if (filters.cpf) params = params.set('cpf', filters.cpf);

    return this.http.get<UserApiResponse>(this.ITEM_PATH, { params });
  }

  updateUserRole(userId: string, roleName: string): Observable<User> {
    return this.http.patch<User>(`${this.ITEM_PATH}/${userId}/role`, { roleName });
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.ITEM_PATH}/${id}`);
  }
}
