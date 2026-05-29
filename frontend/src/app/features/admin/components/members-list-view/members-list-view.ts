import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FullUserResponse } from '../../../shared/models/users.models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-members-list-view',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './members-list-view.html',
  styleUrl: './members-list-view.scss'
})
export class MembersListViewComponent {
  @Input() members: FullUserResponse[] = [];
  @Input() isLoading = false;
  @Output() delegateResources = new EventEmitter<FullUserResponse>();
  @Output() removeMember = new EventEmitter<FullUserResponse>();

  displayedColumns = ['avatar', 'name', 'email', 'role', 'status', 'actions'];

  getAvatar(member: FullUserResponse): string {
      const url = member.profile?.profilePictureUrl || member.profilePictureUrl;
      if (url) {
        if (url.startsWith('http')) return url;
        const baseUrl = environment.apiUrl.replace('/api', '');
        return `${baseUrl}/${url}`;
      }
      return 'assets/profile-photo-stock.png';
  }
}
