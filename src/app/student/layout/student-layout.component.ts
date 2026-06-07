import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { MatSidenav }            from '@angular/material/sidenav';
import { BreakpointObserver }    from '@angular/cdk/layout';
import { Subject }               from 'rxjs';
import { takeUntil, filter }     from 'rxjs/operators';
import { AuthService }           from '../../core/services/auth.service';

@Component({
  selector:    'app-student-layout',
  templateUrl: './student-layout.component.html',
  styleUrls:   ['./student-layout.component.scss'],
})
export class StudentLayoutComponent implements OnInit, OnDestroy {

  @ViewChild('sidenav') sidenav!: MatSidenav;

  navItems = [
    { label: 'Dashboard',   icon: 'dashboard',      route: '/student/dashboard', exact: true },
    { label: 'My Results',  icon: 'grade',           route: '/student/results' },
    { label: 'Notices',     icon: 'notifications',   route: '/student/notices' },
    { label: 'My Fees',     icon: 'payments',        route: '/student/fees' },
    { label: 'Admit Cards', icon: 'credit_card',     route: '/student/admit-cards' },
  ];

  isMobile      = false;
  sidenavMode:   'side' | 'over' = 'side';
  sidenavOpened = true;

  userName      = '';
  userInitial   = '';
  instituteName = '';

  private destroy$ = new Subject<void>();

  constructor(
    private router:             Router,
    private authService:        AuthService,
    private breakpointObserver: BreakpointObserver,
    private cdRef:              ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user       = this.authService.currentUser;
    this.userName    = user?.name || 'Student';
    this.userInitial = (user?.name?.[0] || 'S').toUpperCase();

    this.authService.getMyInstituteInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe(info => { this.instituteName = info?.name || ''; });

    this.breakpointObserver
      .observe(['(max-width: 768px)'])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isMobile      = result.matches;
        this.sidenavMode   = result.matches ? 'over' : 'side';
        this.sidenavOpened = !result.matches;
        this.cdRef.detectChanges();
      });

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isMobile && this.sidenav?.opened) this.sidenav.close();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidenav(): void { this.sidenav?.toggle(); }
  closeOnMobile():  void { if (this.isMobile) this.sidenav?.close(); }
  logout():         void { this.authService.logout(); }

  isActive(route: string, exact = false): boolean {
    return exact ? this.router.url === route : this.router.url.startsWith(route);
  }

  getPageTitle(): string {
    const last  = this.router.url.split('/').filter(Boolean).pop() || 'dashboard';
    const titles: Record<string, string> = {
      dashboard:    'Dashboard',
      results:      'My Results',
      notices:      'Notices',
      fees:         'My Fees',
      'admit-cards':'Admit Cards',
    };
    return titles[last] || 'Student Portal';
  }
}
