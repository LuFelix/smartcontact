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
      email: ['', [Validators.required, Validators.email]],
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
          if (data.redirectMode === RedirectMode.PROFILE) {
            this.tagData = data;
            this.isLoading = false;
          } else {
            // Tenta redirecionar. Se falhar (ex: link vazio), cai no fallback do perfil
            const success = this.handleRedirection(data);
            if (!success) {
                this.tagData = data;
                this.isLoading = false;
                this.snackBar.open('Redirecionamento não configurado corretamente. Mostrando perfil.', 'OK', { duration: 3000 });
            }
          }
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
      const mainPhone = data.user.phones?.find((p: any) => p.isWhatsapp) || data.user.phones?.[0];
      if (mainPhone && mainPhone.number) {
        const cleanNumber = mainPhone.number.replace(/\D/g, '');
        window.location.href = `https://wa.me/${cleanNumber}`;
        return true;
      }
    }
    return false;
  }

  get profileImage(): string {
    const url = this.tagData?.user.profile?.profilePictureUrl;
    if (!url) return 'assets/profile-photo-stock.png';
    
    // Se for uma URL completa (Google, etc.), retorna direto. Senão, anexa o servidor local.
    return url.startsWith('http') ? url : `http://localhost:3000/${url}`;
  }

  openLink(url: string): void {
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(targetUrl, '_blank');
  }

  saveVCard(): void {
      alert('Funcionalidade de Salvar Contato (VCard) em desenvolvimento.');
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
