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

  getAvatar(member: FullUserResponse): string | null {
      const url = member.profile?.profilePictureUrl || member.profilePictureUrl || (member as any).picture;
      if (url) {
        if (url.startsWith('http')) return url;
        const baseUrl = environment.apiUrl.replace('/api', '');
        return `${baseUrl}/${url}`;
      }
      return null;
  }

  getInitial(name: string): string {
    return name ? name.trim().charAt(0).toUpperCase() : '?';
  }

  getAvatarColor(name: string): string {
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

  handleImageError(event: any): void {
      event.target.classList.add('img-hidden');
  }
}
