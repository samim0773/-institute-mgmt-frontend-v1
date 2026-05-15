import { Component, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Router }            from '@angular/router';
import { AuthService }       from '../../core/services/auth.service';

@Component({
  selector:    'app-super-admin-layout',
  templateUrl: './super-admin-layout.component.html',
  styleUrls:   ['./super-admin-layout.component.scss'],
})
export class SuperAdminLayoutComponent implements OnInit {

  sidenavOpened = true;
  isMobile      = false;

  navItems = [
    { label: 'Dashboard',   icon: 'dashboard',    route: '/super-admin/dashboard',   exact: true  },
    { label: 'Institutes',  icon: 'business',     route: '/super-admin/institutes',  exact: false },
    { label: 'Add New',     icon: 'add_business', route: '/super-admin/institutes/new', exact: true },
  ];

  constructor(
    private breakpoint: BreakpointObserver,
    private auth:       AuthService,
    private router:     Router,
  ) {}

  ngOnInit(): void {
    this.breakpoint.observe([Breakpoints.Handset]).subscribe(r => {
      this.isMobile      = r.matches;
      this.sidenavOpened = !r.matches;
    });
  }

  get sidenavMode(): 'over' | 'side' { return this.isMobile ? 'over' : 'side'; }
  get userName():    string { return this.auth.currentUser?.name || 'Super Admin'; }
  get userInitial(): string { return this.userName.charAt(0).toUpperCase(); }

  isActive(route: string, exact = false): boolean {
    return exact
      ? this.router.url === route
      : this.router.url.startsWith(route);
  }

  toggleSidenav(): void { this.sidenavOpened = !this.sidenavOpened; }
  logout(): void { this.auth.logout(); }
}
