import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import { FormControl }                  from '@angular/forms';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';
import { MatDialog }                    from '@angular/material/dialog';

import { SuperAdminService, InstituteDetail, InstituteUser, PLANS, PLAN_LIMITS } from '../super-admin.service';
import { NotificationService }                               from '../../core/services/notification.service';
import { SuperAdminResetPasswordDialogComponent, SuperAdminResetDialogData } from './reset-password-dialog.component';
import { DeleteInstituteDialogComponent, DeleteInstituteDialogData } from './delete-institute-dialog.component';

@Component({
  selector:    'app-institute-detail',
  templateUrl: './institute-detail.component.html',
  styleUrls:   ['./institute-detail.component.scss'],
})
export class InstituteDetailComponent implements OnInit, OnDestroy {

  institute: InstituteDetail | null = null;
  loading   = true;

  // ── Plan management state ─────────────────────────────────────────────────
  readonly plans      = PLANS;
  readonly planLimits = PLAN_LIMITS;
  planCtrl    = new FormControl<string>('trial');
  expiryCtrl  = new FormControl<string | null>(null);
  planSaving  = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route:    ActivatedRoute,
    private router:   Router,
    private superSvc: SuperAdminService,
    private notify:   NotificationService,
    private dialog:   MatDialog,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
    else    this.router.navigate(['/super-admin/institutes']);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private load(id: string): void {
    this.loading = true;
    this.superSvc.getInstitute(id)
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.institute = res.data ?? null;
          if (this.institute) {
            this.planCtrl.setValue(this.institute.plan ?? 'trial');
            this.expiryCtrl.setValue(this.institute.planExpiresAt ?? null);
          }
        },
        error: () => {
          this.notify.error('Failed to load institute details.');
          this.router.navigate(['/super-admin/institutes']);
        },
      });
  }

  // ── Computed from users array ─────────────────────────────────────────────
  get admins():       InstituteUser[] { return this.institute?.users.filter(u => u.role === 'admin')   ?? []; }
  get teachers():     InstituteUser[] { return this.institute?.users.filter(u => u.role === 'teacher') ?? []; }
  get totalUsers():   number          { return this.institute?.users.length ?? 0; }

  // ── Plan management computed ──────────────────────────────────────────────
  get planLimit(): number {
    return PLAN_LIMITS[this.institute?.plan ?? 'trial'] ?? PLAN_LIMITS['trial'];
  }

  get studentUsagePct(): number {
    if (!this.institute || this.planLimit === 0) return 0;
    return Math.min(100, Math.round((this.institute.stats.activeStudents / this.planLimit) * 100));
  }

  get usageBarColor(): 'primary' | 'warn' {
    return this.studentUsagePct >= 90 ? 'warn' : 'primary';
  }

  planLimitFor(plan: string): number {
    return PLAN_LIMITS[plan] ?? 0;
  }

  downgradeWarning(): string {
    const newPlan = this.planCtrl.value ?? '';
    if (!this.institute || !newPlan) return '';
    const newLimit = PLAN_LIMITS[newPlan]                    ?? 0;
    const curLimit = PLAN_LIMITS[this.institute.plan ?? '']  ?? 0;
    const active   = this.institute.stats.activeStudents;
    if (newLimit < curLimit && active > newLimit) {
      const excess = active - newLimit;
      return (
        `Cannot downgrade to ${this.superSvc.planLabel(newPlan)} plan. ` +
        `This institute has ${active} active students, but the ${this.superSvc.planLabel(newPlan)} ` +
        `plan only allows ${newLimit}. ` +
        `Please deactivate ${excess} student${excess > 1 ? 's' : ''} first.`
      );
    }
    return '';
  }

  savePlan(): void {
    if (!this.institute || this.downgradeWarning()) return;
    this.planSaving = true;
    const expiry = this.expiryCtrl.value;

    this.superSvc.updateInstitute(this.institute._id, {
      plan:          this.planCtrl.value   ?? undefined,
      planExpiresAt: expiry ? new Date(expiry).toISOString() : undefined,
    }).pipe(finalize(() => this.planSaving = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.notify.success('Plan updated successfully.');
          if (this.institute) {
            this.institute.plan          = this.planCtrl.value         ?? this.institute.plan;
            this.institute.planExpiresAt = res.data?.planExpiresAt     ?? this.institute.planExpiresAt;
          }
        },
      });
  }

  goBack():              void   { this.router.navigate(['/super-admin/institutes']); }
  planLabel(p: string): string  { return this.superSvc.planLabel(p); }
  planColor(p: string): string  { return this.superSvc.planColor(p); }
  fmt(d: string | null): string { return d ? this.superSvc.formatDate(d) : 'Never'; }

  roleLabel(u: InstituteUser): string {
    return u.role === 'admin' ? 'Admin' : 'Teacher';
  }

  roleIcon(u: InstituteUser): string {
    return u.role === 'admin' ? 'shield' : 'school';
  }

  roleColor(u: InstituteUser): string {
    return u.role === 'admin' ? '#1565c0' : '#2e7d32';
  }

  openResetPassword(user: InstituteUser): void {
    const data: SuperAdminResetDialogData = { userId: user._id, userName: user.name, userRole: user.role };
    this.dialog.open(SuperAdminResetPasswordDialogComponent, { data, width: '420px' });
  }

  openDeleteInstitute(): void {
    if (!this.institute) return;
    const data: DeleteInstituteDialogData = {
      instituteId:   this.institute._id,
      instituteName: this.institute.name,
      stats: {
        totalStudents: this.institute.stats?.totalStudents ?? 0,
        totalUsers:    this.totalUsers,
        totalAdmins:   this.admins.length,
        totalTeachers: this.teachers.length,
      },
    };
    const ref = this.dialog.open(DeleteInstituteDialogComponent, {
      data,
      width: '500px',
      disableClose: true,
    });
    ref.afterClosed().subscribe(result => {
      if (result?.deleted) {
        this.router.navigate(['/super-admin/institutes']);
      }
    });
  }
}
