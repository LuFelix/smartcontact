import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    KpiCardComponent,
    InteractionListComponent,
    EmptyStateComponent,
  ],
  templateUrl: './dashboard-container.html',
  styleUrl: './dashboard-container.scss',
})
export class DashboardContainerComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly state = this.dashboardService.state;
  readonly summary = computed(() => this.state().summary);
  readonly isLoading = computed(() => this.state().isLoading);
  readonly error = computed(() => this.state().error);

  readonly byDevicePreview = computed(() => {
    const s = this.summary();
    return s?.byDevice ?? [];
  });

  readonly byBrowserPreview = computed(() => {
    const s = this.summary();
    return s?.byBrowser ?? [];
  });

  ngOnInit(): void {
    this.dashboardService.loadSummary();
  }
}
