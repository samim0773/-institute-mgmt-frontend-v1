import { Component, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Router }            from '@angular/router';
import { AuthService }       from '../../core/services/auth.service';

@Component({
  selector:    'app-teacher-layout',
  templateUrl: './teacher-layout.component.html',
  styleUrls:   ['./teacher-layout.component.scss'],
})
export class TeacherLayoutComponent implements OnInit {

  sidenavOpened = true;
  isMobile      = false;

  // Teacher navigation — intentionally limited vs admin
  navItems = [
    { label: 'My Profile',   icon: 'person',        route: '/teacher/dashboard', exact: true  },
    { label: 'Mark Entry',   icon: 'grading',       route: '/teacher/marks',     exact: true  },
    { label: 'Notice Board', icon: 'notifications', route: '/teacher/notices',   exact: true  },
    { label: 'View Results', icon: 'leaderboard',   route: '/teacher/results',   exact: false },
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

  get sidenavMode(): 'over' | 'side' {
    return this.isMobile ? 'over' : 'side';
  }

  get userName():    string { return this.auth.currentUser?.name    || 'Teacher';  }
  get userSubject(): string { return this.auth.currentUser?.subject || 'Teacher';  }
  get userInitial(): string { return this.userName.charAt(0).toUpperCase(); }

  isActive(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  toggleSidenav(): void { this.sidenavOpened = !this.sidenavOpened; }

  logout(): void { this.auth.logout(); }
}
