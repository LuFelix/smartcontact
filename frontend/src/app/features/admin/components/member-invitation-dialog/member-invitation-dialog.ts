import { Component, inject, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { RolesService } from '../../services/roles.service';
import { TeamService } from '../../../../core/services/team.service';
import { Role } from '../../../shared/models/role.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-member-invitation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTabsModule,
    MatIconModule
  ],
  templateUrl: './member-invitation-dialog.html',
  styleUrl: './member-invitation-dialog.scss'
})
export class MemberInvitationDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private rolesService = inject(RolesService);
  private teamService = inject(TeamService);
  private dialogRef = inject(MatDialogRef<MemberInvitationDialogComponent>);
  private snackBar = inject(MatSnackBar);

  @ViewChild('qrcodeCanvas') qrcodeCanvas!: ElementRef<HTMLCanvasElement>;

  invitationForm: FormGroup;
  qrForm: FormGroup;
  roles: Role[] = [];
  isLoadingRoles = true;
  isSubmitting = false;
  invitationToken: string | null = null;
  invitationLink: string | null = null;

  constructor() {
    this.invitationForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      roleId: ['', Validators.required]
    });

    this.qrForm = this.fb.group({
      roleId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.rolesService.findAll()
      .pipe(finalize(() => this.isLoadingRoles = false))
      .subscribe({
        next: (res) => this.roles = res.data,
        error: () => this.snackBar.open('Erro ao carregar funções.', 'Fechar')
      });
  }

  submit(): void {
    if (this.invitationForm.invalid) return;

    this.isSubmitting = true;
    this.teamService.addMember(this.invitationForm.value)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: () => {
          this.snackBar.open('Membro convidado com sucesso!', 'Sucesso', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error(err);
          const msg = err.error?.message || 'Falha ao convidar membro.';
          this.snackBar.open(msg, 'Fechar', { duration: 5000 });
        }
      });
  }

  generateQR(): void {
    if (this.qrForm.invalid) return;

    this.isSubmitting = true;
    this.teamService.createInvitation(this.qrForm.value.roleId)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: (res) => {
          this.invitationToken = res.token;
          const baseUrl = window.location.origin;
          this.invitationLink = `${baseUrl}/join/${res.token}`;
          
          setTimeout(() => {
            if (this.qrcodeCanvas) {
              QRCode.toCanvas(this.qrcodeCanvas.nativeElement, this.invitationLink, {
                width: 250,
                margin: 2
              }, (error) => {
                if (error) console.error(error);
              });
            }
          });
        },
        error: (err) => {
          const msg = err.error?.message || 'Falha ao gerar convite.';
          this.snackBar.open(msg, 'Fechar', { duration: 5000 });
        }
      });
  }

  copyLink(): void {
    if (!this.invitationLink) return;
    navigator.clipboard.writeText(this.invitationLink).then(() => {
      this.snackBar.open('Link copiado!', 'OK', { duration: 2000 });
    });
  }
}
