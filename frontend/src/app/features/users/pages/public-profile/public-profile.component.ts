import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TagService, TagResolutionResponse } from '../../../../core/services/tag.service';
import { finalize } from 'rxjs';
import { RedirectMode } from '../../../shared/models/users.models';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatListModule,
    MatTooltipModule
  ],
  templateUrl: './public-profile.component.html',
  styleUrls: ['./public-profile.component.scss']
})
export class PublicProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private tagService = inject(TagService);
  
  tagData: TagResolutionResponse | null = null;
  isLoading = true;
  error: string | null = null;

  ngOnInit(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.loadTag(uuid);
    } else {
      this.error = 'Código de tag inválido.';
      this.isLoading = false;
    }
  }

  loadTag(uuid: string): void {
    this.isLoading = true;
    this.tagService.resolveTag(uuid)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (data) => {
          this.tagData = data;
          this.handleRedirection(data);
        },
        error: (err) => {
          this.error = 'Tag não encontrada ou desativada.';
          console.error(err);
        }
      });
  }

  handleRedirection(data: TagResolutionResponse): void {
    if (data.redirectMode === RedirectMode.CUSTOM_URL && data.customUrl) {
      window.location.href = data.customUrl;
    } else if (data.redirectMode === RedirectMode.WHATSAPP) {
      const mainPhone = data.user.phones?.find((p: any) => p.isWhatsapp) || data.user.phones?.[0];
      if (mainPhone) {
        const cleanNumber = mainPhone.number.replace(/\D/g, '');
        window.location.href = `https://wa.me/${cleanNumber}`;
      }
    }
    // Se for PROFILE, permanece na página e renderiza o HTML
  }

  get profileImage(): string {
    if (this.tagData?.user.profilePictureUrl) {
        return `http://localhost:3000/${this.tagData.user.profilePictureUrl}`;
    }
    return 'assets/profile-photo-stock.png'; // Usando o que já existe no public do frontend
  }

  openLink(url: string): void {
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(targetUrl, '_blank');
  }

  saveVCard(): void {
      alert('Funcionalidade de Salvar Contato (VCard) em desenvolvimento.');
  }
}
