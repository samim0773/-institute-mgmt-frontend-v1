import { Component, OnInit } from '@angular/core';
import { StudentPortalService } from '../services/student-portal.service';
import { Notice } from '../../core/models';

@Component({
  selector:    'app-student-notices',
  templateUrl: './student-notices.component.html',
})
export class StudentNoticesComponent implements OnInit {

  notices:  Notice[] = [];
  loading   = true;
  error     = '';
  expanded: Set<string> = new Set();

  constructor(private portalService: StudentPortalService) {}

  ngOnInit(): void {
    this.portalService.getMyNotices().subscribe({
      next:  res  => { this.notices = res.data || []; this.loading = false; },
      error: ()   => { this.error = 'Failed to load notices.'; this.loading = false; },
    });
  }

  toggle(id: string): void {
    this.expanded.has(id) ? this.expanded.delete(id) : this.expanded.add(id);
  }

  postedByName(notice: Notice): string {
    return typeof notice.postedBy === 'object' ? (notice.postedBy as any).name : 'Admin';
  }
}
