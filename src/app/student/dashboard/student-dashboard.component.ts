import { Component, OnInit } from '@angular/core';
import { AuthService }         from '../../core/services/auth.service';
import { StudentPortalService } from '../services/student-portal.service';
import { StudentProfile, Result, Notice, FeeBill } from '../../core/models';
import { forkJoin }            from 'rxjs';

@Component({
  selector:    'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls:   ['./student-dashboard.component.scss'],
})
export class StudentDashboardComponent implements OnInit {

  studentName   = '';
  studentClass  = '';
  loading       = true;

  profile:         StudentProfile | null = null;
  latestResult:    Result | null         = null;
  recentNotices:   Notice[]              = [];
  pendingFees:     FeeBill[]             = [];

  constructor(
    private authService:    AuthService,
    private portalService:  StudentPortalService,
  ) {}

  ngOnInit(): void {
    this.studentName = this.authService.currentUser?.name || 'Student';

    forkJoin({
      profile: this.portalService.getMyProfile(),
      results: this.portalService.getMyResults(),
      notices: this.portalService.getMyNotices(),
      fees:    this.portalService.getMyFees(),
    }).subscribe({
      next: ({ profile, results, notices, fees }) => {
        this.profile       = profile.data || null;
        this.latestResult  = results.data?.[0] || null;
        this.recentNotices = (notices.data || []).slice(0, 3);
        this.pendingFees   = (fees.data || []).filter(b => b.overallStatus !== 'paid').slice(0, 3);
        if (this.profile) {
          this.studentClass = `Class ${this.profile.class}-${this.profile.section}`;
        }
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  get totalDue(): number {
    return this.pendingFees.reduce((sum, b) => sum + (b.totalDue || 0), 0);
  }
}
