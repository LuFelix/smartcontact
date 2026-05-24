import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Role } from '../../../shared/models/role.model';

@Component({
  selector: 'app-roles-list-view',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './roles-list-view.html',
  styleUrl: './roles-list-view.scss'
})
export class RolesListViewComponent {
  @Input() roles: Role[] = [];
  @Input() isLoading = false;
  @Output() editRole = new EventEmitter<Role>();
  @Output() deleteRole = new EventEmitter<Role>();

  displayedColumns: string[] = ['name', 'description', 'actions'];
}
