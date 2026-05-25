import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Role } from '../../../shared/models/role.model';

@Component({
  selector: 'app-roles-card-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './roles-card-list.html',
  styleUrl: './roles-card-list.scss'
})
export class RolesCardListComponent {
  @Input() roles: Role[] = [];
  @Input() isLoading = false;
  @Output() editRole = new EventEmitter<Role>();
  @Output() deleteRole = new EventEmitter<Role>();
}
