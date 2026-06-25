import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

export interface DashboardTrendItem {
  date: string;
  reads: number;
  leads: number;
}

export interface DashboardBreakdownItem {
  name: string;
  count: number;
}

export interface DashboardSummary {
  totalReads: number;
  totalLeads: number;
  readsToday: number;
  readsThisWeek: number;
  leadsThisWeek: number;
  trend: DashboardTrendItem[];
  byDevice: DashboardBreakdownItem[];
  byBrowser: DashboardBreakdownItem[];
}

export interface DashboardState {
  summary: DashboardSummary | null;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly API_URL = `${environment.apiUrl}/analytics`;

  readonly #state: WritableSignal<DashboardState> = signal<DashboardState>({
    summary: null,
    isLoading: false,
    error: null,
  });

  readonly state = this.#state.asReadonly();

  loadSummary(): void {
    this.#state.update(s => ({ ...s, isLoading: true, error: null }));

    const headers: Record<string, string> = {};
    const tenantId = this.authService.activeTenantId();
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }

    this.http.get<DashboardSummary>(`${this.API_URL}/summary`, { headers }).subscribe({
      next: (summary) => {
        this.#state.set({ summary, isLoading: false, error: null });
      },
      error: (err) => {
        this.#state.set({
          summary: null,
          isLoading: false,
          error: err?.error?.message || 'Erro ao carregar dashboard',
        });
      },
    });
  }
}
