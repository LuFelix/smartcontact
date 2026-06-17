import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss']
})
export class SearchBarComponent implements OnInit {
  @Input() placeholder: string = 'Buscar...';
  @Input() initialValue: string = '';
  @Output() search = new EventEmitter<string>();

  searchTerm: string = '';

  ngOnInit() {
    this.searchTerm = this.initialValue;
  }

  onSearchChange() {
    this.search.emit(this.searchTerm);
  }

  clearSearch() {
    this.searchTerm = '';
    this.search.emit('');
  }
}
