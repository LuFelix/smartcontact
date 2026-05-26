import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TagService } from '../../../../core/services/tag.service';
import { Tag, FullUserResponse } from '../../../shared/models/users.models';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-resource-delegation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatListModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './resource-delegation-dialog.html',
  styleUrl: './resource-delegation-dialog.scss'
})
export class ResourceDelegationDialogComponent implements OnInit {
  private tagService = inject(TagService);
  private dialogRef = inject(MatDialogRef<ResourceDelegationDialogComponent>);
  private snackBar = inject(MatSnackBar);
  public data = inject<{ member: FullUserResponse }>(MAT_DIALOG_DATA);

  tags: Tag[] = [];
  isLoading = true;
  selectedTagIds: Set<string> = new Set();
  isSaving = false;

  ngOnInit(): void {
    this.loadTags();
  }

  loadTags(): void {
    this.isLoading = true;
    this.tagService.findAll()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res) => {
            this.tags = res;
            // Identifica quais tags o usuário já tem acesso (TODO: backend deve prover essa lista na entidade)
        },
        error: () => this.snackBar.open('Erro ao carregar tags.', 'Fechar')
      });
  }

  toggleTag(tagId: string): void {
      if (this.selectedTagIds.has(tagId)) {
          this.selectedTagIds.delete(tagId);
      } else {
          this.selectedTagIds.add(tagId);
      }
  }

  save(): void {
      this.isSaving = true;
      const promises = Array.from(this.selectedTagIds).map(tagId => 
          this.tagService.grantAccess(tagId, this.data.member.id).toPromise()
      );

      Promise.all(promises)
          .then(() => {
              this.snackBar.open('Acessos delegados com sucesso!', 'OK', { duration: 3000 });
              this.dialogRef.close(true);
          })
          .catch(err => {
              console.error(err);
              this.snackBar.open('Erro ao delegar acessos.', 'Fechar');
          })
          .finally(() => this.isSaving = false);
  }
}
