import { Component, HostListener, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-menu-nav',
  imports: [MatButtonModule, MatIconModule, MatSlideToggleModule, MatDividerModule, MatListModule],
  templateUrl: './menu-nav.html',
  styleUrl: './menu-nav.scss'
})
export class MenuNav {
  private themeService = inject(ThemeService);
  darkMode = this.themeService.darkMode;

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showButton = false;

  constructor() { }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (window.pageYOffset > 200) {
      this.showButton = true;
    } else {
      this.showButton = false;
    }
  }

  menuOpen = false;

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  toggleDarkMode() {
    this.themeService.toggleTheme();
  }
}
