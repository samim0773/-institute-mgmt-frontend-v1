import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router }                       from '@angular/router';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';

import { SuperAdminService, PlatformStats, InstituteWithStats } from '../super-admin.service';

@Component({
  selector:    'app-super-admin-dashboard',
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls:   ['./super-admin-dashboard.component.scss'],
})
export class SuperAdminDashboardComponent implements OnInit, OnDestroy {

  stats:             PlatformStats | null  = null;
  institutes:        InstituteWithStats[]  = [];
  loadingStats       = true;
  loadingInstitutes  = true;

  private destroy$ = new Subject<void>();

  constructor(
    private superSvc: SuperAdminService,
    private router:   Router,
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadInstitutes();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadStats(): void {
    this.superSvc.getPlatformStats()
      .pipe(finalize(() => this.loadingStats = false), takeUntil(this.destroy$))
      .subscribe({ next: res => this.stats = res.data || null });
  }

  private loadInstitutes(): void {
    this.superSvc.getInstitutes()
      .pipe(finalize(() => this.loadingInstitutes = false), takeUntil(this.destroy$))
      .subscribe({ next: res => this.institutes = (res.data || []).slice(0, 5) });
  }

  viewInstitute(id: string): void { this.router.navigate(['/super-admin/institutes', id]); }
  addInstitute():            void { this.router.navigate(['/super-admin/institutes/new']); }
  viewAll():                 void { this.router.navigate(['/super-admin/institutes']); }

  planLabel(p: string): string { return this.superSvc.planLabel(p); }
  planColor(p: string): string { return this.superSvc.planColor(p); }
  fmt(d: string):       string { return this.superSvc.formatDate(d); }

  pendingFees(inst: InstituteWithStats): number {
    return (inst.stats?.fees?.pending?.count || 0) + (inst.stats?.fees?.partial?.count || 0);
  }
}
