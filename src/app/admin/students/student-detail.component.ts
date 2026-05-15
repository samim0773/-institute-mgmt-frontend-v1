import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';

import { StudentService } from './student.service';

// Matches the actual API response shape (guardian fields are flat, not nested)
export interface StudentDetail {
  _id:              string;
  name:             string;
  rollNo:           string;
  admissionNo?:     string;
  class:            string;
  section:          string;
  academicYear:     string;
  dob?:             string;
  gender?:          string;
  bloodGroup?:      string;
  guardianName?:    string;
  guardianPhone?:   string;
  guardianEmail?:   string;
  guardianRelation?: string;
  emergencyContact?: { name: string; relationship: string; phone: string };
  address?:          { street?: string; city?: string; state?: string; pincode?: string };
  isActive:         boolean;
  createdAt?:       string;
}

@Component({
  selector:    'app-student-detail',
  templateUrl: './student-detail.component.html',
  styleUrls:   ['./student-detail.component.scss'],
})
export class StudentDetailComponent implements OnInit, OnDestroy {

  student:  StudentDetail | null = null;
  loading   = true;
  notFound  = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route:      ActivatedRoute,
    private router:     Router,
    private studentSvc: StudentService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/admin/students']); return; }
    this.load(id);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private load(id: string): void {
    this.loading = true;
    this.studentSvc.getStudent(id)
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({
        next:  (res: any) => { this.student = res.data ?? res; },
        error: ()         => { this.notFound = true; },
      });
  }

  edit():   void { this.router.navigate(['/admin/students', this.student!._id, 'edit']); }
  goBack(): void { this.router.navigate(['/admin/students']); }

  formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  age(dob?: string): string {
    if (!dob) return '';
    const years = Math.floor(
      (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)
    );
    return `${years} yrs`;
  }

  capitalize(s?: string): string {
    if (!s) return '—';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
