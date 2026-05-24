import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Role, CreateRoleDTO, UpdateRoleDTO } from '../../shared/models/role.model';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/roles`;

  findAll(): Observable<Role[]> {
    return this.http.get<Role[]>(this.API_URL);
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
