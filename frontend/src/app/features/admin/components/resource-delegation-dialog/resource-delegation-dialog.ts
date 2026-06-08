import { Component, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { TagService } from '../../../../core/services/tag.service';
import { UserService } from '../../../../core/services/user.service';
import { Tag, FullUserResponse, TechnologyType } from '../../../shared/models/users.models';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, forkJoin } from 'rxjs';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-resource-delegation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './resource-delegation-dialog.html',
  styleUrl: './resource-delegation-dialog.scss'
})
export class ResourceDelegationDialogComponent implements OnInit {
  private tagService = inject(TagService);
  private userService = inject(UserService);
  private dialogRef = inject(MatDialogRef<ResourceDelegationDialogComponent>);
  private snackBar = inject(MatSnackBar);
  public data = inject<{ member: FullUserResponse }>(MAT_DIALOG_DATA);

  @ViewChild('qrcodeCanvas') qrcodeCanvas!: ElementRef<HTMLCanvasElement>;

  tags: Tag[] = [];
  isLoading = true;
  selectedTagIds: Set<string> = new Set();
  isSaving = false;
  
  focusedTag: Tag | null = null;
  focusedTagUrl: string | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    
    forkJoin({
      allTags: this.tagService.findAll(),
      userTags: this.userService.getUserTags(this.data.member.id)
    })
    .pipe(finalize(() => this.isLoading = false))
    .subscribe({
      next: (result) => {
        this.tags = result.allTags;
        this.selectedTagIds = new Set(result.userTags);
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Erro ao carregar permissões.', 'Fechar');
        this.dialogRef.close();
      }
    });
  }

  toggleTag(tagId: string): void {
      if (this.selectedTagIds.has(tagId)) {
          this.selectedTagIds.delete(tagId);
      } else {
          this.selectedTagIds.add(tagId);
      }
  }

  previewTag(tag: Tag): void {
    if (this.focusedTag?.id === tag.id) {
        this.focusedTag = null;
        this.focusedTagUrl = null;
        return;
    }

    this.focusedTag = tag;
    
    // Resolve URL exactly like TagDialogComponent
    if ((tag.technologyType === TechnologyType.LINK || tag.technologyType === TechnologyType.TRILHA) && tag.value) {
      this.focusedTagUrl = tag.value.startsWith('http') ? tag.value : 'https://' + tag.value;
    } else {
      this.focusedTagUrl = window.location.origin + '/t/' + tag.uuid;
    }

    setTimeout(() => {
        if (this.qrcodeCanvas && this.focusedTagUrl) {
            QRCode.toCanvas(this.qrcodeCanvas.nativeElement, this.focusedTagUrl, {
                width: 200,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            }, (error: Error | null | undefined) => {
                if (error) console.error(error);
            });
        }
    });
  }

  save(): void {
      this.isSaving = true;
      const finalTagIds = Array.from(this.selectedTagIds);
      
      this.userService.updateUserTags(this.data.member.id, finalTagIds)
          .pipe(finalize(() => this.isSaving = false))
          .subscribe({
              next: () => {
                  this.snackBar.open('Acessos delegados com sucesso!', 'OK', { duration: 3000 });
                  this.dialogRef.close(true);
              },
              error: (err) => {
                  console.error(err);
                  this.snackBar.open('Erro ao salvar permissões.', 'Fechar');
              }
          });
  }

  getIcon(tech: string): string {
    const icons: any = {
      'NFC_HF': 'nfc',
      'RFID_UHF': 'settings_input_antenna',
      'QR_CODE': 'qr_code',
      'LINK': 'link',
      'TRILHA': 'auto_stories'
    };
    return icons[tech] || 'tag';
  }

  getTechLabel(tech: string): string {
    const labels: any = {
      'NFC_HF': 'Tag NFC',
      'RFID_UHF': 'RFID UHF',
      'QR_CODE': 'QR Code',
      'LINK': 'Link',
      'TRILHA': 'Trilha'
    };
    return labels[tech] || tech;
  }
}
