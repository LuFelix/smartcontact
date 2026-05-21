import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';

// Importe seu modelo de User e AuthService
import { User } from '../../../shared/models/users.models'; 
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatCardModule
  ],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent {
  public authService = inject(AuthService);

  // --- Inputs (Recebe dados do Pai) ---
  @Input() dataSource = new MatTableDataSource<User>([]);
  @Input() isLoading = false;
  @Input() displayedColumns: string[] = ['name', 'email', 'actions'];

  // --- Outputs (Envia ações para o Pai) ---
  @Output() viewDetails = new EventEmitter<number>(); // Envia o ID
  @Output() deleteUser = new EventEmitter<User>();
}