import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { DashboardTrendItem } from '../../services/dashboard.service';

@Component({
  selector: 'app-interaction-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule],
  templateUrl: './interaction-list.html',
  styleUrl: './interaction-list.scss',
})
export class InteractionListComponent {
  @Input({ required: true }) items!: DashboardTrendItem[];

  displayedColumns: string[] = ['date', 'reads', 'leads'];

  get totalReads(): number {
    return this.items.reduce((sum, i) => sum + i.reads, 0);
  }

  get totalLeads(): number {
    return this.items.reduce((sum, i) => sum + i.leads, 0);
  }
}
