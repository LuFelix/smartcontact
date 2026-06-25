import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { TagService } from '../../../../core/services/tag.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LayoutService } from '../../../../core/services/layout.service';
import { Tag } from '../../../shared/models/users.models';
import { finalize } from 'rxjs';

// Dumb Components
import { TagListViewComponent } from '../../components/tag-list-view/tag-list-view.component';
import { TagCardListComponent } from '../../components/tag-card-list/tag-card-list.component';

// Shared UI Components
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

// Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Dialog
import { TagDialogComponent } from '../../components/tag-dialog/tag-dialog.component';
import { NfcWriterDialogComponent, NfcWriterDialogData } from '../../../shared/components/nfc-writer-dialog/nfc-writer-dialog';

@Component({
  selector: 'app-tag-manager',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    TagListViewComponent,
    TagCardListComponent,
    PageHeaderComponent,
    SearchBarComponent,
    EmptyStateComponent
  ],
  templateUrl: './tag-manager.component.html',
  styleUrl: './tag-manager.component.scss'
})
export class TagManagerComponent implements OnInit {
  private tagService = inject(TagService);
  private authService = inject(AuthService);
  public layoutService = inject(LayoutService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  tags: Tag[] = [];
  isLoading = true;
  searchTerm = '';

  get isAdmin(): boolean {
    return this.authService.hasRole('administrador');
  }

  constructor() {
    toObservable(this.authService.activeTenantId).subscribe(() => {
      this.loadTags();
    });
  }

  ngOnInit(): void {}

  get filteredTags(): Tag[] {
    if (!this.searchTerm) return this.tags;
    const term = this.searchTerm.toLowerCase();
    return this.tags.filter(t => 
      t.uid?.toLowerCase().includes(term) || 
      t.name?.toLowerCase().includes(term)
    );
  }

  loadTags(): void {
    this.isLoading = true;
    this.tagService.findAll()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (data) => this.tags = data,
        error: (err) => {
          console.error(err);
          this.snackBar.open('Erro ao carregar estoque de tags.', 'Fechar');
        }
      });
  }

  openTagDialog(tag?: Tag): void {
    const dialogRef = this.dialog.open(TagDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'large-abac-modal',
      autoFocus: false,
      data: { tag }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.loadTags();
    });
  }

  openNfcWriter(tag: Tag): void {
    const nfcUrl = `${window.location.origin}/t/${tag.uuid}?source=nfc`;
    this.dialog.open(NfcWriterDialogComponent, {
      data: { nfcUrl } as NfcWriterDialogData,
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
    });
  }

  deleteTag(tag: Tag): void {
    if (confirm(`Tem certeza que deseja remover a tag "${tag.name}" do estoque?`)) {
      this.tagService.delete(tag.id).subscribe({
        next: () => {
          this.snackBar.open('Tag removida com sucesso.', 'OK', { duration: 3000 });
          this.loadTags();
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Erro ao remover tag.', 'Fechar');
        }
      });
    }
  }
}
