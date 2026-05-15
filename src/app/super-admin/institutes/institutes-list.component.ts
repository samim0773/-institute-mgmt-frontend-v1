import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl }                  from '@angular/forms';
import { Router }                       from '@angular/router';
import { Subject }                      from 'rxjs';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import {
  SuperAdminService, InstituteWithStats, PlatformStats, PLANS,
} from '../super-admin.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector:    'app-institutes-list',
  templateUrl: './institutes-list.component.html',
  styleUrls:   ['./institutes-list.component.scss'],
})
export class InstitutesListComponent implements OnInit, OnDestroy {

  institutes:    InstituteWithStats[] = [];
  stats:         PlatformStats | null = null;
  loading        = true;
  loadingStats   = true;
  togglingId     = '';

  // Filters
  searchCtrl     = new FormControl('');
  statusFilter   = new FormControl('');   // '' | 'true' | 'false'
  planFilter     = new FormControl('');

  plans          = PLANS;

  readonly STATUS_OPTS = [
    { value: '',      label: 'All Statuses' },
    { value: 'true',  label: 'Active'       },
    { value: 'false', label: 'Inactive'     },
  ];

  // Table columns
  displayedColumns = [
    'name', 'code', 'plan', 'students', 'users', 'fees', 'status', 'actions',
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private superSvc: SuperAdminService,
    private notify:   NotificationService,
    private router:   Router,
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadInstitutes();
    this.watchFilters();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Load platform stats ────────────────────────────────────────────────────
  private loadStats(): void {
    this.loadingStats = true;
    this.superSvc.getPlatformStats()
      .pipe(finalize(() => this.loadingStats = false), takeUntil(this.destroy$))
      .subscribe({ next: res => this.stats = res.data || null });
  }

  // ── Load institute list ────────────────────────────────────────────────────
  loadInstitutes(): void {
    this.loading = true;
    const q: any = {};
    const status = this.statusFilter.value;
    if (status === 'true')  q.isActive = true;
    if (status === 'false') q.isActive = false;
    if (this.planFilter.value)   q.plan   = this.planFilter.value;
    if (this.searchCtrl.value?.trim()) q.search = this.searchCtrl.value.trim();

    this.superSvc.getInstitutes(q)
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({ next: res => this.institutes = res.data || [] });
  }

  // ── Auto-reload on filter change ──────────────────────────────────────────
  private watchFilters(): void {
    this.searchCtrl.valueChanges.pipe(
      debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$),
    ).subscribe(() => this.loadInstitutes());

    this.statusFilter.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadInstitutes());

    this.planFilter.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadInstitutes());
  }

  clearFilters(): void {
    this.searchCtrl.setValue('');
    this.statusFilter.setValue('');
    this.planFilter.setValue('');
  }

  // ── Toggle active/inactive ────────────────────────────────────────────────
 toggleStatus(inst: InstituteWithStats, event: MatSlideToggleChange): void {

    const action = inst.isActive ? 'deactivate' : 'activate';

    if (!confirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} "${inst.name}"?\n` +
      (inst.isActive
        ? 'Users will no longer be able to log in.'
        : 'Users will be able to log in again.')
    )) {
      return;
    }

    this.togglingId = inst._id;

    this.superSvc.toggleStatus(inst._id)
      .pipe(
        finalize(() => this.togglingId = ''),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: res => {
          this.notify.success(res.message || 'Status updated.');

          const idx = this.institutes.findIndex(i => i._id === inst._id);

          if (idx !== -1) {
            this.institutes[idx] = {
              ...this.institutes[idx],
              isActive: !inst.isActive
            };

            this.institutes = [...this.institutes];
          }

          this.loadStats();
        }
      });
  }

  // ── Navigate ──────────────────────────────────────────────────────────────
  addInstitute(): void { this.router.navigate(['/super-admin/institutes/new']); }
  viewInstitute(id: string): void { this.router.navigate(['/super-admin/institutes', id]); }

  // ── Helpers ───────────────────────────────────────────────────────────────
  get hasFilter(): boolean {
    return !!(this.searchCtrl.value || this.statusFilter.value || this.planFilter.value);
  }

  planLabel(p: string): string { return this.superSvc.planLabel(p); }
  planColor(p: string): string { return this.superSvc.planColor(p); }
  fmt(d: string):       string { return this.superSvc.formatDate(d); }

  pendingFees(inst: InstituteWithStats): number {
    return (inst.stats?.fees?.pending?.count || 0) + (inst.stats?.fees?.partial?.count || 0);
  }

  trackById(_: number, i: InstituteWithStats): string { return i._id; }
}
