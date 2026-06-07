import {
  Component, OnInit, OnDestroy, ViewChild, AfterViewInit,
} from '@angular/core';
import { FormControl }            from '@angular/forms';
import { Router }                 from '@angular/router';
import { MatPaginator }           from '@angular/material/paginator';
import { MatSort }                from '@angular/material/sort';
import { MatTableDataSource }     from '@angular/material/table';
import { MatDialog }              from '@angular/material/dialog';
import { MatSnackBar }            from '@angular/material/snack-bar';
import { Subject, combineLatest } from 'rxjs';
import {
  takeUntil, debounceTime, distinctUntilChanged,
  startWith, switchMap, finalize,
} from 'rxjs/operators';

import { StudentService, StudentQuery, StudentCredential } from './student.service';
import { NotificationService }          from '../../core/services/notification.service';
import { AuthService }                  from '../../core/services/auth.service';
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
  loading           = true;
  deletingId        = '';
  generatingLoginId = '';
  exportingStudents = false;

  // Plan feature flags
  canGenerateLogin = false;
  canExport        = false;

  // Credential result panel (shown once after generation)
  credential: (StudentCredential & { studentName?: string }) | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private studentSvc:  StudentService,
    private notify:      NotificationService,
    private router:      Router,
    private dialog:      MatDialog,
    private authService: AuthService,
    private snackBar:    MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadClasses();
    this.watchClassFilter();
    this.loadPlanFeatures();
  }

  private loadPlanFeatures(): void {
    this.authService.getMyInstituteInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe(info => {
        const plan = info?.plan || 'trial';
        this.canGenerateLogin = ['standard', 'advance'].includes(plan);
        this.canExport        = plan === 'advance';
      });
  }

  ngAfterViewInit(): void {
    // Trigger first load after paginator/sort are ready
    this.watchFiltersAndLoad();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Load classes (populates cache so getSectionsForClass works) ───────────
  private loadClasses(): void {
    this.studentSvc.getClasses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          const all = res.data || [];
          this.classNames = [...new Set(all.map(c => c.className))]
            .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
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

  // ── Generate login credentials ────────────────────────────────────────────
  generateLogin(student: Student): void {
    this.generatingLoginId = student._id;
    this.credential = null;
    this.studentSvc.generateCredentials(student._id)
      .pipe(
        finalize(() => (this.generatingLoginId = '')),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: res => {
          this.credential = { ...res.data!, studentName: res.data?.studentName || student.name };
          if (res.data?.alreadyExists) {
            this.snackBar.open('Credentials already exist. Username shown below.', 'OK', { duration: 4000 });
          }
        },
        error: err => {
          const msg = err?.error?.message || 'Failed to generate credentials.';
          this.notify.error(msg);
        },
      });
  }

  dismissCredential(): void { this.credential = null; }

  copyText(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open(`${label} copied!`, '', { duration: 2000 });
    });
  }

  // ── Export students ───────────────────────────────────────────────────────
  exportStudents(): void {
    this.exportingStudents = true;
    this.studentSvc.exportStudents()
      .pipe(finalize(() => (this.exportingStudents = false)), takeUntil(this.destroy$))
      .subscribe({
        next: blob => {
          const url  = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href     = url;
          link.download = `students_${new Date().toISOString().slice(0,10)}.xlsx`;
          link.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.notify.error('Export failed. Please try again.'),
      });
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
