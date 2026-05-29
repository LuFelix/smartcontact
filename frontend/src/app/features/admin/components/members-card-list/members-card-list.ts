import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FullUserResponse } from '../../../shared/models/users.models';
import { environment } from '../../../../environments/environment';

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
      const url = member.profile?.profilePictureUrl || member.profilePictureUrl || (member as any).picture;
      if (url) {
        if (url.startsWith('http')) return url;
        const baseUrl = environment.apiUrl.replace('/api', '');
        return `${baseUrl}/${url}`;
      }
      return 'assets/profile-photo-stock.png';
  }
}
