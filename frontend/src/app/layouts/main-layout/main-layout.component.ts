import { Component, inject, OnInit, ViewChild, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { HeaderComponent } from '../header/header.component';
import { SideNavComponent } from '../side-nav/side-nav.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map, filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MatListModule,
    HeaderComponent,
    SideNavComponent,
    BottomNavComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  private breakpointObserver = inject(BreakpointObserver);
  private router = inject(Router);

  isMobile = signal(false);
  isSidenavOpen = true;

  ngOnInit() {
    this.breakpointObserver.observe('(max-width: 959.98px)')
      .pipe(map(result => result.matches))
      .subscribe(mobile => {
        this.isMobile.set(mobile);
        if (mobile) this.isSidenavOpen = false;
      });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isMobile() && this.sidenav) {
        this.sidenav.close();
      }
    });
  }

  toggleSidenav() {
    this.isSidenavOpen = !this.isSidenavOpen;
  }
}
