import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'darkMode';
  private isDarkMode = signal<boolean>(false);

  // Observable style signal for components
  darkMode = this.isDarkMode.asReadonly();

  constructor() {
    this.initializeTheme();
  }

  toggleTheme(): void {
    this.setTheme(!this.isDarkMode());
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    
    if (savedTheme !== null) {
      this.setTheme(savedTheme === 'true');
    } else {
      // Default to system preference if no saved preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark);
    }
  }

  private setTheme(isDark: boolean): void {
    this.isDarkMode.set(isDark);
    localStorage.setItem(this.THEME_KEY, String(isDark));
    
    if (isDark) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }
}
