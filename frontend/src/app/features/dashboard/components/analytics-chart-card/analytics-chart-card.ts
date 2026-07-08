import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-analytics-chart-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    NgApexchartsModule,
  ],
  templateUrl: './analytics-chart-card.html',
  styleUrl: './analytics-chart-card.scss',
})
export class AnalyticsChartCardComponent {
  @Input({ required: true }) title!: string;
  @Input() isLoading: boolean = false;
  @Input() error: string | null = null;
  @Input() chartOptions: any = null;
}
