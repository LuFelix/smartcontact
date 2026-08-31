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
  bySource: DashboardBreakdownItem[];
  byCity: DashboardBreakdownItem[];
  byRegion: DashboardBreakdownItem[];
  byCountry: DashboardBreakdownItem[];
}

export interface RecentRead {
  accessedAt: string;
  source: string;
  tag: {
    name: string | null;
    uuid: string | null;
  };
}

export interface TeamRankingItem {
  name: string;
  reads: number;
  leads: number;
  total: number;
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

  readonly #recentReads = signal<RecentRead[]>([]);
  readonly recentReads = this.#recentReads.asReadonly();

  readonly #teamRanking = signal<TeamRankingItem[]>([]);
  readonly teamRanking = this.#teamRanking.asReadonly();

  loadTeamRanking(): void {
    const headers: Record<string, string> = {};
    const tenantId = this.authService.activeTenantId();
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }

    this.http.get<TeamRankingItem[]>(`${this.API_URL}/team-ranking`, { headers }).subscribe({
      next: (ranking) => {
        this.#teamRanking.set(ranking);
      },
      error: (err) => {
        console.error('Erro ao carregar ranking da equipe:', err);
        this.#teamRanking.set([]);
      },
    });
  }

  loadRecentReads(): void {
    const headers: Record<string, string> = {};
    const tenantId = this.authService.activeTenantId();
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }

    this.http.get<RecentRead[]>(`${this.API_URL}/recent-reads`, { headers }).subscribe({
      next: (reads) => {
        this.#recentReads.set(reads);
      },
      error: (err) => {
        console.error('Erro ao carregar leituras recentes:', err);
        this.#recentReads.set([]);
      },
    });
  }

  loadSummary(period: number = 7): void {
    this.#state.update(s => ({ ...s, isLoading: true, error: null }));

    const headers: Record<string, string> = {};
    const tenantId = this.authService.activeTenantId();
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }

    this.http.get<DashboardSummary>(`${this.API_URL}/summary?period=${period}`, { headers }).subscribe({
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
