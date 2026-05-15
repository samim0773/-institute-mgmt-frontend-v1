import {
  Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef,
} from '@angular/core';
import { Router, NavigationEnd }   from '@angular/router';
import { MatSidenav }              from '@angular/material/sidenav';
import { BreakpointObserver }      from '@angular/cdk/layout';
import { Subject }                 from 'rxjs';
import { takeUntil, filter }       from 'rxjs/operators';
import { AuthService }             from '../../core/services/auth.service';

export interface NavItem {
  label:    string;
  icon:     string;
  route:    string;
  exact?:   boolean;
  badge?:   number;          // e.g. pending fee count
  divider?: boolean;         // render a separator above this item
}

@Component({
  selector:    'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls:   ['./admin-layout.component.scss'],
})
export class AdminLayoutComponent implements OnInit, OnDestroy {

  @ViewChild('sidenav') sidenav!: MatSidenav;

  // ── Navigation items ──────────────────────────────────────────────────────
  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard',     route: '/admin/dashboard', exact: true },
    { label: 'Students',  icon: 'people',         route: '/admin/students' },
    { label: 'Classes',   icon: 'class',          route: '/admin/classes' },
    { label: 'Subjects',  icon: 'menu_book',      route: '/admin/subjects' },
    { label: 'Exams',     icon: 'assignment',     route: '/admin/exams' },
    { label: 'Results',   icon: 'grade',          route: '/admin/results' },
    { label: 'Fees',      icon: 'payments',       route: '/admin/fees',     divider: true },
    { label: 'Notices',   icon: 'notifications',  route: '/admin/notices' },
    { label: 'Teachers',  icon: 'person_pin',     route: '/admin/teachers', divider: true },
  ];

  // ── Responsive state ──────────────────────────────────────────────────────
  isMobile  = false;
  sidenavMode: 'side' | 'over' = 'side';
  sidenavOpened = true;

  // ── User info (for toolbar avatar) ───────────────────────────────────────
  userName  = '';
  userRole  = '';
  userInitial = '';

  private destroy$ = new Subject<void>();

  constructor(
    private router:            Router,
    private authService:       AuthService,
    private breakpointObserver: BreakpointObserver,
    private cdRef:             ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.watchBreakpoint();
    this.closeDrawerOnMobileNav();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── User info ─────────────────────────────────────────────────────────────
  private loadUserInfo(): void {
    const user = this.authService.currentUser;
    this.userName    = user?.name    || 'Admin';
    this.userRole    = this.formatRole(user?.role || 'admin');
    this.userInitial = (user?.name?.[0] || 'A').toUpperCase();
  }

  private formatRole(role: string): string {
    const map: Record<string, string> = {
      admin:       'Administrator',
      teacher:     'Teacher',
      super_admin: 'Super Admin',
    };
    return map[role] || role;
  }

  // ── Responsive breakpoint ─────────────────────────────────────────────────
  private watchBreakpoint(): void {
    this.breakpointObserver
      .observe(['(max-width: 768px)'])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isMobile     = result.matches;
        this.sidenavMode  = result.matches ? 'over'   : 'side';
        this.sidenavOpened= result.matches ? false    : true;
        this.cdRef.detectChanges();
      });
  }

  // ── Close drawer on mobile after navigation ───────────────────────────────
  private closeDrawerOnMobileNav(): void {
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        if (this.isMobile && this.sidenav?.opened) {
          this.sidenav.close();
        }
      });
  }

  // ── Public actions ────────────────────────────────────────────────────────
  toggleSidenav(): void {
    this.sidenav?.toggle();
  }

  logout(): void {
    this.authService.logout();
  }

  // ── Page title from active route ─────────────────────────────────────────
  getPageTitle(): string {
    const url   = this.router.url.split('?')[0];
    const parts = url.split('/').filter(Boolean);
    const last  = parts[parts.length - 1] || 'dashboard';
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      students:  'Students',
      classes:   'Classes',
      subjects:  'Subjects',
      exams:     'Exams',
      results:   'Results',
      fees:      'Fee Management',
      notices:   'Notices',
      teachers:  'Teachers',
    };
    return titles[last] || 'Admin Panel';
  }

  // ── Route active check ────────────────────────────────────────────────────
  isActive(route: string, exact = false): boolean {
    return exact
      ? this.router.url === route
      : this.router.url.startsWith(route);
  }
}
