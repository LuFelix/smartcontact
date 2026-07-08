import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card';
import { InteractionListComponent } from '../../components/interaction-list/interaction-list';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-dashboard-container',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatIconModule,
    KpiCardComponent,
    InteractionListComponent,
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

  constructor() {
    toObservable(this.authService.activeTenantId).subscribe(() => {
      this.dashboardService.loadSummary();
      this.dashboardService.loadRecentReads();
    });
  }

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

  ngOnInit(): void {}
}
