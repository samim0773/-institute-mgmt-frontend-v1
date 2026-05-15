import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router }                       from '@angular/router';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';
import { FormControl }                  from '@angular/forms';
import { MatDialog }                    from '@angular/material/dialog';

import { HttpClient }          from '@angular/common/http';
import { environment }         from '../../../environments/environment';
import { NotificationService } from '../../core/services/notification.service';

export interface HomeroomClass {
  classSectionId: string;
  className:      string;
  section:        string;
  academicYear:   string;
  displayName:    string;
}

export interface SubjectAssignmentEntry {
  className:    string;
  section:      string;
  academicYear: string;
  subjectName:  string;
  displayName:  string;
}

export interface Teacher {
  _id:                string;
  name:               string;
  email:              string;
  subject:            string;
  isActive:           boolean;
  lastLoginAt?:       string;
  homeroomClasses:    HomeroomClass[];
  subjectAssignments: SubjectAssignmentEntry[];
}

@Component({
  selector:    'app-teachers-list',
  templateUrl: './teachers-list.component.html',
  styleUrls:   ['./teachers-list.component.scss'],
})
export class TeachersListComponent implements OnInit, OnDestroy {

  teachers:       Teacher[] = [];
  filtered:       Teacher[] = [];
  loading         = true;
  togglingId      = '';

  searchCtrl      = new FormControl('');

  displayedColumns = ['name', 'subject', 'classes', 'status', 'lastLogin', 'actions'];

  private destroy$ = new Subject<void>();

  constructor(
    private http:   HttpClient,
    private notify: NotificationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
    this.searchCtrl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(q => this.applyFilter(q || ''));
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/auth/teachers`)
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.teachers = res.data || [];
          this.applyFilter(this.searchCtrl.value || '');
        },
      });
  }

  applyFilter(query: string): void {
    const q = query.toLowerCase();
    this.filtered = q
      ? this.teachers.filter(t =>
          t.name.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          (t.subject || '').toLowerCase().includes(q) ||
          (t.homeroomClasses || []).some(c => c.displayName.toLowerCase().includes(q)) ||
          (t.subjectAssignments || []).some(a =>
            a.displayName.toLowerCase().includes(q) ||
            a.subjectName.toLowerCase().includes(q)
          )
        )
      : [...this.teachers];
  }

  toggleActive(teacher: Teacher): void {
    const action = teacher.isActive ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${teacher.name}"?`)) return;

    this.togglingId = teacher._id;
    this.http.put<any>(`${environment.apiUrl}/auth/teacher/${teacher._id}`, { isActive: !teacher.isActive })
      .pipe(finalize(() => this.togglingId = ''), takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notify.success(`${teacher.name} ${teacher.isActive ? 'deactivated' : 'activated'}.`);
          this.load();
        },
      });
  }

  addTeacher(): void { this.router.navigate(['/admin/teachers/new']); }

  formatDate(d: string): string {
    if (!d) return 'Never';
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  trackById(_: number, t: Teacher): string { return t._id; }
}
