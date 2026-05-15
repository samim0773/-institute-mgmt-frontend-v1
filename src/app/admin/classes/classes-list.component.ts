import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router }                       from '@angular/router';
import { FormControl }                  from '@angular/forms';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';

import { ClassService, ClassRecord } from './class.service';
import { NotificationService }       from '../../core/services/notification.service';

@Component({
  selector:    'app-classes-list',
  templateUrl: './classes-list.component.html',
  styleUrls:   ['./classes-list.component.scss'],
})
export class ClassesListComponent implements OnInit, OnDestroy {

  classes:     ClassRecord[] = [];
  loading      = true;
  deletingId   = '';
  showInactive = false;

  yearFilter = new FormControl('');

  displayedColumns = ['displayName', 'teacher', 'room', 'academicYear', 'status', 'actions'];

  private destroy$ = new Subject<void>();

  constructor(
    private classSvc: ClassService,
    private notify:   NotificationService,
    private router:   Router,
  ) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    const params: any = {};
    if (this.yearFilter.value) params.academicYear = this.yearFilter.value;
    if (this.showInactive)     params.isActive = false;

    this.classSvc.getClasses(params)
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({ next: res => { this.classes = res.data || []; } });
  }

  toggleInactive(): void {
    this.showInactive = !this.showInactive;
    this.load();
  }

  applyYear(): void { this.load(); }

  addClass(): void { this.router.navigate(['/admin/classes/new']); }

  editClass(id: string): void { this.router.navigate(['/admin/classes', id, 'edit']); }

  deleteClass(cls: ClassRecord): void {
    const confirmed = window.confirm(
      `Deactivate "${cls.displayName}"?\n\nStudents in this class will not be affected.`
    );
    if (!confirmed) return;

    this.deletingId = cls._id;
    this.classSvc.deleteClass(cls._id)
      .pipe(finalize(() => this.deletingId = ''), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.notify.success(res.message || `${cls.displayName} deactivated.`);
          this.load();
        },
        error: (err) => {
          // 400 "has students" error is shown by the global error interceptor
        },
      });
  }

  trackById(_: number, c: ClassRecord): string { return c._id; }

  teacherName(cls: ClassRecord): string {
    return cls.classTeacherId?.name ?? '—';
  }
}
