import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FullUserResponse } from '../../../shared/models/users.models';

@Component({
  selector: 'app-members-card-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './members-card-list.html',
  styleUrl: './members-card-list.scss'
})
export class MembersCardListComponent {
  @Input() members: FullUserResponse[] = [];
  @Input() isLoading = false;
  @Output() delegateResources = new EventEmitter<FullUserResponse>();
  @Output() removeMember = new EventEmitter<FullUserResponse>();

  getAvatar(member: FullUserResponse): string {
      const url = member.profile?.profilePictureUrl;
      if (!url) return 'assets/profile-photo-stock.png';
      return url.startsWith('http') ? url : `http://localhost:3000/${url}`;
  }
}
