import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, RouterLink } from '@angular/router';
import { TagService, TagResolutionResponse } from '../../../../core/services/tag.service';
import { InteractionLogsService } from '../../../../core/services/interaction-logs.service';
import { finalize } from 'rxjs';
import { RedirectMode } from '../../../shared/models/users.models';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatListModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    NgxMaskDirective
  ],
  templateUrl: './public-profile.component.html',
  styleUrls: ['./public-profile.component.scss']
})
export class PublicProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private tagService = inject(TagService);
  private logsService = inject(InteractionLogsService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  
  tagData: TagResolutionResponse | null = null;
  isLoading = true;
  error: string | null = null;

  showLeadForm = false;
  isSubmittingLead = false;
  leadForm!: FormGroup;

  constructor() {
    this.leadForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.email]],
      phone: [''],
      note: ['', [Validators.maxLength(50)]]
    });
  }

  ngOnInit(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const source = this.route.snapshot.queryParamMap.get('source');
    
    if (uuid) {
      this.loadTag(uuid, source || undefined);
    } else {
      this.error = 'Código de tag inválido.';
      this.isLoading = false;
    }
  }

  loadTag(uuid: string, source?: string): void {
    this.isLoading = true;
    this.tagService.resolveTag(uuid, source)
      .subscribe({
        next: (data) => {
          // LÓGICA REFINADA:
          // Só redirecionamos se houver um 'source' (veio de NFC ou QR).
          // Se o usuário acessou o link direto (/t/username) sem source, 
          // ele deve SEMPRE ver o Perfil Inteligente.
          if (source && data.redirectMode !== RedirectMode.PROFILE) {
            const success = this.handleRedirection(data);
            if (success) return; // Navegador vai sair da página
            
            // Se falhou o redirect, fallback para o perfil
            this.snackBar.open('Redirecionamento não configurado. Mostrando perfil.', 'OK', { duration: 3000 });
          }
          
          this.tagData = data;
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.error = 'Tag não encontrada ou desativada.';
          console.error(err);
        }
      });
  }

  handleRedirection(data: TagResolutionResponse): boolean {
    if (data.redirectMode === RedirectMode.CUSTOM_URL && data.customUrl) {
      const targetUrl = data.customUrl.startsWith('http') ? data.customUrl : `https://${data.customUrl}`;
      window.location.href = targetUrl;
      return true;
    } else if (data.redirectMode === RedirectMode.WHATSAPP) {
      // Lógica de prioridade de telefones:
      // 1. WhatsApp e Principal (isWhatsapp && isMain)
      // 2. Qualquer WhatsApp (isWhatsapp)
      // 3. Qualquer Principal (isMain)
      // 4. Primeiro da lista
      const phones = data.user.phones || [];
      const mainPhone = phones.find((p: any) => p.isWhatsapp && p.isMain) ||
                        phones.find((p: any) => p.isWhatsapp) ||
                        phones.find((p: any) => p.isMain) ||
                        phones[0];

      if (mainPhone && mainPhone.number) {
        let cleanNumber = mainPhone.number.replace(/\D/g, '');
        
        // Se for um número brasileiro (DDD + número) com 10 ou 11 dígitos, injeta o DDI 55 caso não comece com 55
        if ((cleanNumber.length === 10 || cleanNumber.length === 11) && !cleanNumber.startsWith('55')) {
          cleanNumber = '55' + cleanNumber;
        }
        
        window.location.href = `https://wa.me/${cleanNumber}`;
        return true;
      }
    }
    return false;
  }

  get profileImage(): string | null {
    const url = (this.tagData?.user.profile?.profilePictureUrl && this.tagData.user.profile.profilePictureUrl.length > 5) ? this.tagData.user.profile.profilePictureUrl :
                (this.tagData?.user.profilePictureUrl && this.tagData.user.profilePictureUrl.length > 5) ? this.tagData.user.profilePictureUrl : null;
    
    if (url) {
        return url.startsWith('http') ? url : `http://localhost:3000/${url}`;
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

  openLink(url: string): void {
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(targetUrl, '_blank');
  }

  saveVCard(): void {
    if (!this.tagData || !this.tagData.user) return;
    
    const user = this.tagData.user;
    const vcardLines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${user.name}`,
      `N:${user.name};;;;`,
      `EMAIL;TYPE=INTERNET:${user.email}`,
    ];

    if (user.phones && user.phones.length > 0) {
      user.phones.forEach((p: any) => {
        // Formata o número (remove caracteres não numéricos exceto +)
        const cleanPhone = p.number.replace(/[^\d+]/g, '');
        const type = p.isWhatsapp ? 'CELL' : 'WORK';
        vcardLines.push(`TEL;TYPE=${type}:${cleanPhone}`);
      });
    }

    if (user.profile?.jobTitle) {
      vcardLines.push(`TITLE:${user.profile.jobTitle}`);
    }

    if (user.profile?.company) {
      vcardLines.push(`ORG:${user.profile.company}`);
    }

    if (user.links && user.links.length > 0) {
      user.links.forEach((l: any) => {
        vcardLines.push(`URL:${l.url}`);
      });
    }

    if (user.addresses && user.addresses.length > 0) {
      user.addresses.forEach((a: any) => {
        const type = a.isMain ? 'HOME' : 'WORK';
        const address = [
            '', // PO Box
            a.complement || '',
            a.street + (a.number ? ', ' + a.number : ''),
            a.city || '',
            a.state || '',
            a.zipCode || '',
            'Brasil'
        ].join(';');
        vcardLines.push(`ADR;TYPE=${type}:${address}`);
      });
    }

    vcardLines.push('END:VCARD');

    const vcardString = vcardLines.join('\r\n');
    const blob = new Blob([vcardString], { type: 'text/vcard;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${user.name.replace(/\s+/g, '_').toLowerCase()}.vcf`;
    link.click();
    
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  }

  toggleLeadForm(): void {
    this.showLeadForm = !this.showLeadForm;
  }

  submitLead(): void {
    if (this.leadForm.invalid) return;

    this.isSubmittingLead = true;
    const tagId = this.tagData?.id;
    
    if (!tagId) return;

    this.logsService.captureLead(tagId, this.leadForm.value)
      .pipe(finalize(() => this.isSubmittingLead = false))
      .subscribe({
        next: () => {
          this.snackBar.open('Seus dados foram enviados! Em breve entraremos em contato.', 'OK', { duration: 5000 });
          this.leadForm.reset();
          this.showLeadForm = false;
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Erro ao enviar dados. Tente novamente mais tarde.', 'Fechar');
        }
      });
  }
}
