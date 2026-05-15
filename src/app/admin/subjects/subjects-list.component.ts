import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl }                  from '@angular/forms';
import { Router }                       from '@angular/router';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';

import { SubjectService, SubjectAssignment } from './subject.service';
import { ClassService, ClassRecord }         from '../classes/class.service';
import { NotificationService }               from '../../core/services/notification.service';

@Component({
  selector:    'app-subjects-list',
  templateUrl: './subjects-list.component.html',
  styleUrls:   ['./subjects-list.component.scss'],
})
export class SubjectsListComponent implements OnInit, OnDestroy {

  subjects:     SubjectAssignment[] = [];
  loading       = true;
  deletingId    = '';
  showInactive  = false;

  // Filter controls
  classFilter   = new FormControl('');
  sectionFilter = new FormControl('');

  // Dropdown data
  allClasses:    ClassRecord[] = [];
  classNames:    string[]      = [];
  sections:      string[]      = [];

  displayedColumns = ['subject', 'class', 'teacher', 'status', 'actions'];

  private destroy$ = new Subject<void>();

  constructor(
    private subjectSvc: SubjectService,
    private classSvc:   ClassService,
    private notify:     NotificationService,
    private router:     Router,
  ) {}

  ngOnInit(): void {
    this.loadClasses();
    this.watchClassFilter();
    this.load();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadClasses(): void {
    this.classSvc.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.allClasses = res.data || [];
          // distinct class names
          this.classNames = [...new Set(this.allClasses.map((c: ClassRecord) => c.className))];
        },
      });
  }

  private watchClassFilter(): void {
    this.classFilter.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(cls => {
        this.sectionFilter.setValue('', { emitEvent: false });
        this.sections = cls
          ? [...new Set(this.allClasses.filter(c => c.className === cls).map(c => c.section))]
          : [];
        this.load();
      });

    this.sectionFilter.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.load());
  }

  load(): void {
    this.loading = true;
    const params: any = {};
    if (this.classFilter.value)   params.className = this.classFilter.value;
    if (this.sectionFilter.value) params.section   = this.sectionFilter.value;
    if (this.showInactive)        params.isActive  = false;

    this.subjectSvc.getSubjects(params)
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({ next: res => { this.subjects = res.data || []; } });
  }

  toggleInactive(): void { this.showInactive = !this.showInactive; this.load(); }

  clearFilters(): void {
    this.classFilter.setValue('');
    this.sectionFilter.setValue('');
  }

  get hasFilter(): boolean {
    return !!(this.classFilter.value || this.sectionFilter.value);
  }

  addSubject(): void { this.router.navigate(['/admin/subjects/new']); }

  editSubject(id: string): void { this.router.navigate(['/admin/subjects', id, 'edit']); }

  deleteSubject(s: SubjectAssignment): void {
    const label = `"${s.subjectName}" from Class ${s.className}-${s.section}`;
    if (!confirm(`Remove ${label}?\n\nThis will deactivate the subject assignment.`)) return;

    this.deletingId = s._id;
    this.subjectSvc.deleteSubject(s._id)
      .pipe(finalize(() => this.deletingId = ''), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.notify.success(res.message || `Subject removed.`);
          this.load();
        },
      });
  }

  classBadge(s: SubjectAssignment): string {
    return `${s.className}-${s.section}`;
  }

  trackById(_: number, s: SubjectAssignment): string { return s._id; }
}
