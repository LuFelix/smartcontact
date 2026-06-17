import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  @Input() icon: string = 'search_off';
  @Input() title: string = 'Nenhum resultado encontrado';
  @Input() message: string = 'Tente ajustar sua busca ou filtros.';
  @Input() actionLabel: string = '';
  @Input() actionIcon: string = 'add';
  
  @Output() action = new EventEmitter<void>();

  onActionClick() {
    this.action.emit();
  }
}
