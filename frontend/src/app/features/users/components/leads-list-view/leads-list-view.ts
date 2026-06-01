import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Lead } from '../../../shared/models/users.models';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-leads-list-view',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './leads-list-view.html',
  styleUrl: './leads-list-view.scss'
})
export class LeadsListViewComponent {
  @Input() leads: Lead[] = [];
  @Input() isLoading = false;
  @Input() isSavingToGoogle = false;
  @Output() saveToGoogle = new EventEmitter<Lead>();

  public authService = inject(AuthService);

  get displayedColumns(): string[] {
      const columns = ['leadName', 'leadEmail', 'leadPhone', 'origin', 'leadNote', 'accessedAt', 'actions'];
      // Apenas Admins vêem quem capturou o lead
      if (this.authService.hasRole('administrador')) {
          columns.splice(columns.indexOf('origin') + 1, 0, 'capturedBy');
      }
      return columns;
  }

  getInitial(name?: string): string {
    return name ? name.trim().charAt(0).toUpperCase() : '?';
  }

  getAvatarColor(name?: string): string {
    if (!name) return '#757575';
    const colors = [
      '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
      '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
      '#8BC34A', '#CDDC39', '#FFC107', '#FF9800', '#FF5722'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }
}
