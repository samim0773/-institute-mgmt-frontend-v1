import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';
import { MatDialog }                    from '@angular/material/dialog';

import { SuperAdminService, InstituteDetail, InstituteUser } from '../super-admin.service';
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
        next:  res => { this.institute = res.data ?? null; },
        error: ()  => {
          this.notify.error('Failed to load institute details.');
          this.router.navigate(['/super-admin/institutes']);
        },
      });
  }

  // ── Computed from users array ─────────────────────────────────────────────
  get admins():       InstituteUser[] { return this.institute?.users.filter(u => u.role === 'admin')   ?? []; }
  get teachers():     InstituteUser[] { return this.institute?.users.filter(u => u.role === 'teacher') ?? []; }
  get totalUsers():   number          { return this.institute?.users.length ?? 0; }

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
