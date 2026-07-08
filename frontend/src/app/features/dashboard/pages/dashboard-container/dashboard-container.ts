import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';
import { InteractionListComponent } from '../../components/interaction-list/interaction-list';
import { AnalyticsChartCardComponent } from '../../components/analytics-chart-card/analytics-chart-card';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-dashboard-container',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatIconModule,
    MatButtonToggleModule,
    MatCardModule,
    KpiCardComponent,
    InteractionListComponent,
    AnalyticsChartCardComponent,
    EmptyStateComponent,
  ],
  templateUrl: './dashboard-container.html',
  styleUrl: './dashboard-container.scss',
})
export class DashboardContainerComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);

  readonly state = this.dashboardService.state;
  readonly summary = computed(() => this.state().summary);
  readonly isLoading = computed(() => this.state().isLoading);
  readonly error = computed(() => this.state().error);
  readonly recentReads = this.dashboardService.recentReads;
  readonly teamRanking = this.dashboardService.teamRanking;
  readonly activePeriod = signal<number>(7);

  readonly isAdmin = computed(() => {
    const role = this.authService.userRole();
    return role?.toLowerCase() === 'administrador';
  });

  constructor() {
    toObservable(this.authService.activeTenantId).subscribe(() => {
      this.loadDashboardData();
    });
  }

  loadDashboardData(): void {
    const period = this.activePeriod();
    this.dashboardService.loadSummary(period);
    this.dashboardService.loadRecentReads();
    if (this.isAdmin()) {
      this.dashboardService.loadTeamRanking();
    }
  }

  setPeriod(days: number): void {
    this.activePeriod.set(days);
    this.dashboardService.loadSummary(days);
  }

  readonly teamRankingChartOptions = computed(() => {
    const data = this.teamRanking();
    if (!data || data.length === 0) return null;

    const names = data.map(item => item.name);
    const reads = data.map(item => item.reads);
    const leads = data.map(item => item.leads);

    return {
      series: [
        {
          name: 'Leituras',
          data: reads
        },
        {
          name: 'Leads',
          data: leads
        }
      ],
      chart: {
        type: 'bar',
        height: 350,
        stacked: true,
        toolbar: {
          show: false
        },
        background: 'transparent'
      },
      colors: ['var(--mat-sys-primary, #2196F3)', 'var(--mat-sys-tertiary, #9C27B0)'],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4
        }
      },
      xaxis: {
        categories: names,
        labels: {
          style: {
            colors: 'var(--mat-sys-on-surface-variant)'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: 'var(--mat-sys-on-surface-variant)'
          }
        }
      },
      grid: {
        borderColor: 'var(--mat-sys-outline-variant, #E0E0E0)'
      },
      dataLabels: {
        enabled: false
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        labels: {
          colors: 'var(--mat-sys-on-surface)'
        }
      },
      tooltip: {
        theme: 'dark'
      }
    };
  });

  readonly byDevicePreview = computed(() => {
    const s = this.summary();
    return s?.byDevice ?? [];
  });

  readonly byBrowserPreview = computed(() => {
    const s = this.summary();
    return s?.byBrowser ?? [];
  });

  readonly bySourcePreview = computed(() => {
    const s = this.summary();
    const api = s?.bySource ?? [];
    const known = new Map(api.map(i => [i.name.toLowerCase(), i]));
    const defaults = ['nfc', 'qr', 'rfid', 'link', 'desconhecido'];
    return defaults.map(name => ({
      name,
      count: known.get(name)?.count ?? 0,
    }));
  });

  sourceIcon(name: string): string {
    const map: Record<string, string> = {
      nfc: 'near_me',
      qr: 'qr_code_scanner',
      rfid: 'radio_button_checked',
      link: 'link',
      desconhecido: 'help_outline',
    };
    return map[name.toLowerCase()] || 'help_outline';
  }

  readonly evolutionChartOptions = computed(() => {
    const s = this.summary();
    if (!s || !s.trend || s.trend.length === 0) return null;

    const dates = s.trend.map(t => {
      const dateParts = t.date.split('-');
      if (dateParts.length === 3) {
        return `${dateParts[2]}/${dateParts[1]}`;
      }
      return t.date;
    });
    const reads = s.trend.map(t => t.reads);
    const leads = s.trend.map(t => t.leads);

    return {
      series: [
        {
          name: 'Leituras',
          data: reads
        },
        {
          name: 'Leads',
          data: leads
        }
      ],
      chart: {
        type: 'bar',
        height: 350,
        stacked: true,
        toolbar: {
          show: false
        },
        background: 'transparent'
      },
      colors: ['var(--mat-sys-primary, #2196F3)', 'var(--mat-sys-tertiary, #9C27B0)'],
      plotOptions: {
        bar: {
          horizontal: false,
          borderRadius: 4
        }
      },
      xaxis: {
        categories: dates,
        labels: {
          style: {
            colors: 'var(--mat-sys-on-surface-variant)'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: 'var(--mat-sys-on-surface-variant)'
          }
        }
      },
      grid: {
        borderColor: 'var(--mat-sys-outline-variant, #E0E0E0)'
      },
      dataLabels: {
        enabled: false
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        labels: {
          colors: 'var(--mat-sys-on-surface)'
        }
      },
      tooltip: {
        theme: 'dark'
      }
    };
  });

  readonly originsChartOptions = computed(() => {
    const s = this.summary();
    if (!s) return null;

    const sourceData = this.bySourcePreview();
    const labels = sourceData.map(item => this.capitalize(item.name));
    const counts = sourceData.map(item => item.count);

    if (counts.every(c => c === 0)) return null;

    return {
      series: counts,
      chart: {
        type: 'donut',
        height: 300,
        background: 'transparent'
      },
      labels: labels,
      colors: [
        'var(--mat-sys-primary, #2196F3)',
        'var(--mat-sys-secondary, #4CAF50)',
        'var(--mat-sys-tertiary, #FF9800)',
        'var(--mat-sys-error, #F44336)',
        'var(--mat-sys-outline, #9E9E9E)'
      ],
      legend: {
        position: 'bottom',
        labels: {
          colors: 'var(--mat-sys-on-surface)'
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return val.toFixed(0) + "%";
        }
      },
      tooltip: {
        theme: 'dark'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                color: 'var(--mat-sys-on-surface)',
                formatter: function (w: any) {
                  return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                }
              }
            }
          }
        }
      }
    };
  });

  private capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  ngOnInit(): void {}
}
