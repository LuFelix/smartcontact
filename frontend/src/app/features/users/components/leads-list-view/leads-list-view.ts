import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Lead } from '../../../shared/models/users.models';

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

  displayedColumns = ['leadName', 'leadEmail', 'leadPhone', 'leadNote', 'accessedAt', 'actions'];
}
