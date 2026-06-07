import { Component, OnInit } from '@angular/core';
import { StudentPortalService } from '../services/student-portal.service';
import { Result } from '../../core/models';

@Component({
  selector:    'app-student-results',
  templateUrl: './student-results.component.html',
})
export class StudentResultsComponent implements OnInit {

  results:  Result[] = [];
  loading   = true;
  error     = '';

  expanded: Set<string> = new Set();

  constructor(private portalService: StudentPortalService) {}

  ngOnInit(): void {
    this.portalService.getMyResults().subscribe({
      next:  res  => { this.results = res.data || []; this.loading = false; },
      error: ()   => { this.error = 'Failed to load results.'; this.loading = false; },
    });
  }

  toggle(id: string): void {
    this.expanded.has(id) ? this.expanded.delete(id) : this.expanded.add(id);
  }

  isExpanded(id: string): boolean { return this.expanded.has(id); }

  examName(result: Result): string {
    return typeof result.examId === 'object' ? (result.examId as any).name : 'Exam';
  }

  examPeriod(result: Result): string {
    if (typeof result.examId !== 'object') return '';
    const e = result.examId as any;
    return `${e.class}-${e.section} | ${e.academicYear || ''}`;
  }
}
