import {
  Component, OnInit, OnDestroy, ViewChild, AfterViewInit,
} from '@angular/core';
import { FormControl }            from '@angular/forms';
import { Router }                 from '@angular/router';
import { MatPaginator }           from '@angular/material/paginator';
import { MatSort }                from '@angular/material/sort';
import { MatTableDataSource }     from '@angular/material/table';
import { MatDialog }              from '@angular/material/dialog';
import { Subject, combineLatest } from 'rxjs';
import {
  takeUntil, debounceTime, distinctUntilChanged,
  startWith, switchMap, finalize,
} from 'rxjs/operators';

import { StudentService, StudentQuery } from './student.service';
import { NotificationService }          from '../../core/services/notification.service';
import { Student }                      from '../../core/models';

@Component({
  selector:    'app-students-list',
  templateUrl: './students-list.component.html',
  styleUrls:   ['./students-list.component.scss'],
})
export class StudentsListComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort)      sort!:      MatSort;

  // ── Table ──────────────────────────────────────────────────────────────────
  displayedColumns = [
    'rollNo', 'name', 'class', 'guardianPhone', 'status', 'actions',
  ];
  dataSource = new MatTableDataSource<Student>([]);

  // ── Counts ─────────────────────────────────────────────────────────────────
  totalStudents = 0;
  pageSize      = 20;
  currentPage   = 1;

  // ── Filter controls ────────────────────────────────────────────────────────
  searchCtrl       = new FormControl('');
  classFilterCtrl  = new FormControl('');
  sectionFilterCtrl= new FormControl('');
  showInactive     = false;

  // ── Dropdown data ──────────────────────────────────────────────────────────
  classNames: string[] = [];
  sections:   string[] = [];

  // ── State ──────────────────────────────────────────────────────────────────
  loading        = true;
  deletingId     = '';
  private destroy$ = new Subject<void>();

  constructor(
    private studentSvc: StudentService,
    private notify:     NotificationService,
    private router:     Router,
    private dialog:     MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadClassNames();
    this.watchClassFilter();
  }

  ngAfterViewInit(): void {
    // Trigger first load after paginator/sort are ready
    this.watchFiltersAndLoad();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Load class names for filter dropdown ──────────────────────────────────
  private loadClassNames(): void {
    this.studentSvc.getClassNames()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.classNames = res.data || [];
        },
      });
  }

  // ── When class filter changes, update sections dropdown ───────────────────
  private watchClassFilter(): void {
    this.classFilterCtrl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(cls => {
        this.sectionFilterCtrl.setValue('', { emitEvent: false });
        this.sections = cls ? this.studentSvc.getSectionsForClass(cls) : [];
      });
  }

  // ── React to all filters and load students ────────────────────────────────
  private watchFiltersAndLoad(): void {
    // Merge all filter changes into one stream
    combineLatest([
      this.searchCtrl.valueChanges.pipe(
        startWith(''),
        debounceTime(350),
        distinctUntilChanged(),
      ),
      this.classFilterCtrl.valueChanges.pipe(startWith('')),
      this.sectionFilterCtrl.valueChanges.pipe(startWith('')),
    ])
      .pipe(
        takeUntil(this.destroy$),
        switchMap(([search, cls, section]) => {
          this.loading = true;
          const query: StudentQuery = {
            page:     this.currentPage,
            limit:    this.pageSize,
            isActive: !this.showInactive,
          };
          if (search)  query.search  = search;
          if (cls)     query.class   = cls;
          if (section) query.section = section;

          return this.studentSvc.getStudents(query).pipe(
            finalize(() => (this.loading = false)),
          );
        }),
      )
      .subscribe({
        next: res => {
          this.dataSource.data = res.data;
          this.totalStudents   = res.total;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  // ── Paginator page change ─────────────────────────────────────────────────
  onPageChange(event: any): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize    = event.pageSize;
    this.loadStudents();
  }

  // ── Manual reload (called after delete, toggle, etc.) ────────────────────
  loadStudents(): void {
    this.loading = true;
    const query: StudentQuery = {
      page:     this.currentPage,
      limit:    this.pageSize,
      isActive: !this.showInactive,
    };

    const search  = this.searchCtrl.value;
    const cls     = this.classFilterCtrl.value;
    const section = this.sectionFilterCtrl.value;

    if (search)  query.search  = search;
    if (cls)     query.class   = cls;
    if (section) query.section = section;

    this.studentSvc.getStudents(query)
      .pipe(finalize(() => (this.loading = false)), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.dataSource.data = res.data;
          this.totalStudents   = res.total;
        },
      });
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  addStudent(): void {
    this.router.navigate(['/admin/students/new']);
  }

  editStudent(id: string): void {
    this.router.navigate(['/admin/students', id, 'edit']);
  }

  viewStudent(id: string): void {
    this.router.navigate(['/admin/students', id]);
  }

  // ── Soft-delete with inline confirm ──────────────────────────────────────
  deleteStudent(student: Student): void {
    const confirmed = window.confirm(
      `Deactivate "${student.name}"?\n\n` +
      `Their academic records (marks, results, fees) will be preserved.`
    );
    if (!confirmed) return;

    this.deletingId = student._id;
    this.studentSvc.deleteStudent(student._id, 'Deactivated via admin panel')
      .pipe(
        finalize(() => (this.deletingId = '')),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.notify.success(`${student.name} deactivated.`);
          this.loadStudents();
        },
      });
  }

  // ── Toggle inactive view ──────────────────────────────────────────────────
  toggleInactive(): void {
    this.showInactive = !this.showInactive;
    this.currentPage  = 1;
    this.loadStudents();
  }

  // ── Clear all filters ─────────────────────────────────────────────────────
  clearFilters(): void {
    this.searchCtrl.setValue('');
    this.classFilterCtrl.setValue('');
    this.sectionFilterCtrl.setValue('');
  }

  get hasActiveFilter(): boolean {
    return !!(
      this.searchCtrl.value ||
      this.classFilterCtrl.value ||
      this.sectionFilterCtrl.value
    );
  }

  // ── Template helpers ──────────────────────────────────────────────────────
  trackById(_: number, s: Student): string { return s._id; }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
}
