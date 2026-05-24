import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Role, CreateRoleDTO, UpdateRoleDTO, RolesApiResponse } from '../../shared/models/role.model';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/roles`;

  findAll(page: number = 1, limit: number = 10): Observable<RolesApiResponse> {
    return this.http.get<RolesApiResponse>(`${this.API_URL}?page=${page}&limit=${limit}`);
  }

  findOne(id: string): Observable<Role> {
    return this.http.get<Role>(`${this.API_URL}/${id}`);
  }

  create(role: CreateRoleDTO): Observable<Role> {
    // No backend o endpoint de criação está em /roles/create baseado no RolesController
    return this.http.post<Role>(`${this.API_URL}/create`, role);
  }

  update(id: string, role: UpdateRoleDTO): Observable<Role> {
    return this.http.put<Role>(`${this.API_URL}/${id}`, role);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
