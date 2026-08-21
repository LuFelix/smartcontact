import { TestBed } from '@angular/core/testing';
import { DashboardService, TeamRankingItem, RecentRead, DashboardSummary } from './dashboard.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from '../../../core/services/auth.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;
  let mockAuthService: any;

  beforeEach(() => {
    mockAuthService = {
      activeTenantId: vi.fn().mockReturnValue('tenant-123'),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ]
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadTeamRanking', () => {
    it('should load team ranking and update signals state on success', () => {
      const mockRanking: TeamRankingItem[] = [
        { name: 'John Doe', reads: 10, leads: 2, total: 12 },
      ];

      service.loadTeamRanking();

      const req = httpMock.expectOne('http://localhost:3000/api/analytics/team-ranking');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('x-tenant-id')).toBe('tenant-123');
      req.flush(mockRanking);

      expect(service.teamRanking()).toEqual(mockRanking);
    });

    it('should set team ranking to empty array on load error', () => {
      service.loadTeamRanking();

      const req = httpMock.expectOne('http://localhost:3000/api/analytics/team-ranking');
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(service.teamRanking()).toEqual([]);
    });
  });

  describe('loadRecentReads', () => {
    it('should load recent reads and update signals state on success', () => {
      const mockReads: RecentRead[] = [
        { accessedAt: '2026-08-21T12:00:00Z', source: 'qr', tag: { name: 'Tag A', uuid: 'uuid-123' } },
      ];

      service.loadRecentReads();

      const req = httpMock.expectOne('http://localhost:3000/api/analytics/recent-reads');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('x-tenant-id')).toBe('tenant-123');
      req.flush(mockReads);

      expect(service.recentReads()).toEqual(mockReads);
    });

    it('should set recent reads to empty array on load error', () => {
      service.loadRecentReads();

      const req = httpMock.expectOne('http://localhost:3000/api/analytics/recent-reads');
      req.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(service.recentReads()).toEqual([]);
    });
  });

  describe('loadSummary', () => {
    it('should load dashboard summary and update signals state on success', () => {
      const mockSummary: DashboardSummary = {
        totalReads: 50,
        totalLeads: 10,
        readsToday: 5,
        readsThisWeek: 20,
        leadsThisWeek: 4,
        trend: [],
        byDevice: [],
        byBrowser: [],
        bySource: [],
      };

      service.loadSummary(7);

      expect(service.state().isLoading).toBe(true);

      const req = httpMock.expectOne('http://localhost:3000/api/analytics/summary?period=7');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('x-tenant-id')).toBe('tenant-123');
      req.flush(mockSummary);

      expect(service.state().summary).toEqual(mockSummary);
      expect(service.state().isLoading).toBe(false);
      expect(service.state().error).toBeNull();
    });

    it('should set error message on load error', () => {
      service.loadSummary(7);

      const req = httpMock.expectOne('http://localhost:3000/api/analytics/summary?period=7');
      req.flush({ message: 'Failed to load summary' }, { status: 400, statusText: 'Bad Request' });

      expect(service.state().summary).toBeNull();
      expect(service.state().isLoading).toBe(false);
      expect(service.state().error).toBe('Failed to load summary');
    });
  });
});
