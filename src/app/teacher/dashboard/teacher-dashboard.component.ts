import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router }                       from '@angular/router';
import { Subject }                      from 'rxjs';
import { takeUntil }                    from 'rxjs/operators';

import { AuthService }          from '../../core/services/auth.service';
import { AuthUser }             from '../../core/models';

@Component({
  selector:    'app-teacher-dashboard',
  templateUrl: './teacher-dashboard.component.html',
  styleUrls:   ['./teacher-dashboard.component.scss'],
})
export class TeacherDashboardComponent implements OnInit, OnDestroy {

  profile:       AuthUser | null = null;
  loading:       boolean = true;
  instituteName: string  = '';

  private destroy$ = new Subject<void>();

  constructor(
    private auth:   AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.profile = this.auth.currentUser;
    this.loading = !!this.profile === false;

    this.auth.refreshMe()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.profile = res.data ?? this.auth.currentUser;
          this.loading = false;
        },
        error: () => {
          this.profile = this.auth.currentUser;
          this.loading = false;
        },
      });

    this.auth.getMyInstituteInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe(info => { this.instituteName = info?.name || ''; });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  get userInitial(): string {
    return (this.profile?.name || 'T').charAt(0).toUpperCase();
  }

  formatDate(d: string | undefined): string {
    if (!d) return 'Never';
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  goToMarks():   void { this.router.navigate(['/teacher/marks']);   }
  goToResults(): void { this.router.navigate(['/teacher/results']); }
  goToNotices(): void { this.router.navigate(['/teacher/notices']); }
}
