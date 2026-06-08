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
  template: `
    <div class="manager-container">
      <app-page-header title="Gestão de Recursos do Workspace">
        <div header-actions>
          <button mat-stroked-button (click)="layoutService.toggleLayout()" class="toggle-btn">
            <mat-icon>{{ layoutService.layout() === 'moderno' ? 'view_list' : 'grid_view' }}</mat-icon>
            {{ layoutService.layout() === 'moderno' ? 'Ver em Lista' : 'Ver em Cards' }}
          </button>
          
          <button *ngIf="isAdmin" mat-flat-button color="primary" (click)="openTagDialog()">
            <mat-icon>add</mat-icon> Cadastrar Nova Tag
          </button>
        </div>
      </app-page-header>

      <div class="content-container">
        <div class="filters">
          <app-search-bar 
            placeholder="Buscar por UID ou Nome..." 
            (search)="searchTerm = $event">
          </app-search-bar>
        </div>

        @if (!isLoading && filteredTags.length === 0) {
          <app-empty-state
            [icon]="searchTerm ? 'search_off' : 'inventory_2'"
            [title]="searchTerm ? 'Nenhuma tag encontrada' : 'Estoque vazio'"
            [message]="searchTerm ? 'Tente ajustar sua busca.' : 'Nenhuma tag cadastrada neste Workspace.'">
          </app-empty-state>
        } @else {
          @if (layoutService.layout() === 'moderno') {
            <app-tag-card-list
              [tags]="filteredTags"
              [isLoading]="isLoading"
              [isAdmin]="isAdmin"
              (editTag)="openTagDialog($event)"
              (deleteTag)="deleteTag($event)">
            </app-tag-card-list>
          } @else {
            <app-tag-list-view
              [tags]="filteredTags"
              [isLoading]="isLoading"
              [isAdmin]="isAdmin"
              (editTag)="openTagDialog($event)"
              (deleteTag)="deleteTag($event)">
            </app-tag-list-view>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .manager-container { padding: 24px; }
    .content-container { margin-top: 24px; display: flex; flex-direction: column; gap: 24px; }
    .toggle-btn { margin-right: 12px; }
    .filters { display: flex; align-items: center; justify-content: flex-start; }
  `]
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
      width: tag ? '800px' : '500px',
      data: { tag }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (tag) {
          this.updateTag(tag.id, result);
        } else {
          this.createTag(result);
        }
      }
    });
  }

  createTag(data: Partial<Tag>): void {
    this.tagService.create(data).subscribe({
      next: () => {
        this.snackBar.open('Tag cadastrada com sucesso!', 'OK', { duration: 3000 });
        this.loadTags();
      },
      error: (err) => {
        console.error(err);
        const msg = err.error?.message || 'Erro ao cadastrar tag.';
        this.snackBar.open(msg, 'Fechar');
      }
    });
  }

  updateTag(id: string, data: Partial<Tag>): void {
    this.tagService.update(id, data).subscribe({
      next: () => {
        this.snackBar.open('Tag atualizada com sucesso!', 'OK', { duration: 3000 });
        this.loadTags();
      },
      error: (err) => {
        console.error(err);
        const msg = err.error?.message || 'Erro ao atualizar tag.';
        this.snackBar.open(msg, 'Fechar');
      }
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
