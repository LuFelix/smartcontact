import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardContainerComponent } from './dashboard-container';
import { Component, Input, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardService, DashboardState, DashboardSummary, TeamRankingItem, RecentRead } from '../../services/dashboard.service';
import { AuthService } from '../../../../core/services/auth.service';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';
import { InteractionListComponent } from '../../components/interaction-list/interaction-list';
import { AnalyticsChartCardComponent } from '../../components/analytics-chart-card/analytics-chart-card';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-kpi-card',
  template: '',
  standalone: true
})
class MockKpiCardComponent {
  @Input() title!: string;
  @Input() value!: string | number;
  @Input() icon!: string;
  @Input() trend!: number;
  @Input() isLoading = false;
}

@Component({
  selector: 'app-interaction-list',
  template: '',
  standalone: true
})
class MockInteractionListComponent {
  @Input() items!: any[];
  @Input() isLoading = false;
}

@Component({
  selector: 'app-analytics-chart-card',
  template: '',
  standalone: true
})
class MockAnalyticsChartCardComponent {
  @Input() title!: string;
  @Input() chartOptions!: any;
  @Input() error!: string | null;
  @Input() isLoading = false;
}

@Component({
  selector: 'app-empty-state',
  template: '',
  standalone: true
})
class MockEmptyStateComponent {
  @Input() title!: string;
  @Input() description!: string;
  @Input() icon!: string;
}

describe('DashboardContainerComponent', () => {
  let component: DashboardContainerComponent;
  let fixture: ComponentFixture<DashboardContainerComponent>;
  let mockDashboardService: any;
  let mockAuthService: any;

  const mockSummary: DashboardSummary = {
    totalReads: 100,
    totalLeads: 25,
    readsToday: 10,
    readsThisWeek: 45,
    leadsThisWeek: 8,
    trend: [
      { date: '2026-08-21', reads: 10, leads: 2 }
    ],
    byDevice: [
      { name: 'Mobile', count: 80 },
      { name: 'Desktop', count: 20 }
    ],
    byBrowser: [
      { name: 'Chrome', count: 70 },
      { name: 'Safari', count: 30 }
    ],
    bySource: [
      { name: 'nfc', count: 60 },
      { name: 'qr', count: 40 }
    ]
  };

  const mockState: DashboardState = {
    summary: mockSummary,
    isLoading: false,
    error: null
  };

  const mockRanking: TeamRankingItem[] = [
    { name: 'John Doe', reads: 50, leads: 10, total: 60 }
  ];

  const mockReads: RecentRead[] = [
    { accessedAt: '2026-08-21T12:00:00Z', source: 'nfc', tag: { name: 'Card A', uuid: 'uuid-1' } }
  ];

  beforeEach(async () => {
    mockDashboardService = {
      state: signal<DashboardState>(mockState),
      recentReads: signal<RecentRead[]>(mockReads),
      teamRanking: signal<TeamRankingItem[]>(mockRanking),
      loadSummary: vi.fn(),
      loadRecentReads: vi.fn(),
      loadTeamRanking: vi.fn()
    };

    mockAuthService = {
      userRole: signal<string>('administrador'),
      activeTenantId: signal<string>('tenant-1')
    };

    await TestBed.configureTestingModule({
      imports: [
        DashboardContainerComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    })
    .overrideComponent(DashboardContainerComponent, {
      remove: {
        imports: [
          KpiCardComponent,
          InteractionListComponent,
          AnalyticsChartCardComponent,
          EmptyStateComponent
        ]
      },
      add: {
        imports: [
          MockKpiCardComponent,
          MockInteractionListComponent,
          MockAnalyticsChartCardComponent,
          MockEmptyStateComponent
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('data loading and tenant reactivity', () => {
    it('should load dashboard data on active tenant change', () => {
      // O construtor assina o activeTenantId e carrega dados
      expect(mockDashboardService.loadSummary).toHaveBeenCalled();
      expect(mockDashboardService.loadRecentReads).toHaveBeenCalled();
      expect(mockDashboardService.loadTeamRanking).toHaveBeenCalled();
    });

    it('should not load team ranking if user is not admin', () => {
      mockAuthService.userRole.set('membro');
      mockDashboardService.loadTeamRanking.mockClear();

      component.loadDashboardData();

      expect(mockDashboardService.loadTeamRanking).not.toHaveBeenCalled();
    });
  });

  describe('period settings', () => {
    it('should update active period and reload summary', () => {
      component.setPeriod(30);

      expect(component.activePeriod()).toBe(30);
      expect(mockDashboardService.loadSummary).toHaveBeenCalledWith(30);
    });
  });

  describe('computed properties & charts options', () => {
    it('should compute teamRankingChartOptions correctly', () => {
      const options = component.teamRankingChartOptions();
      expect(options).toBeDefined();
      expect(options?.series[0].data).toEqual([50]);
      expect(options?.series[1].data).toEqual([10]);
      expect(options?.xaxis.categories).toEqual(['John Doe']);
    });

    it('should return null for teamRankingChartOptions if empty ranking', () => {
      mockDashboardService.teamRanking.set([]);
      expect(component.teamRankingChartOptions()).toBeNull();
    });

    it('should compute evolutionChartOptions correctly', () => {
      const options = component.evolutionChartOptions();
      expect(options).toBeDefined();
      expect(options?.series[0].data).toEqual([10]);
      expect(options?.series[1].data).toEqual([2]);
    });

    it('should compute bySourcePreview correctly with default items', () => {
      const preview = component.bySourcePreview();
      expect(preview).toHaveLength(5);
      expect(preview[0]).toEqual({ name: 'nfc', count: 60 });
      expect(preview[1]).toEqual({ name: 'qr', count: 40 });
      expect(preview[2]).toEqual({ name: 'rfid', count: 0 });
    });

    it('should return correct sourceIcon', () => {
      expect(component.sourceIcon('nfc')).toBe('near_me');
      expect(component.sourceIcon('qr')).toBe('qr_code_scanner');
      expect(component.sourceIcon('other')).toBe('help_outline');
    });
  });
});
