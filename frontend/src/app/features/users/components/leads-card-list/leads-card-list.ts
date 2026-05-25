import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Lead } from '../../../shared/models/users.models';

@Component({
  selector: 'app-leads-card-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './leads-card-list.html',
  styleUrl: './leads-card-list.scss'
})
export class LeadsCardListComponent {
  @Input() leads: Lead[] = [];
  @Input() isLoading = false;
  @Input() isSavingToGoogle = false;
  @Output() saveToGoogle = new EventEmitter<Lead>();
}
