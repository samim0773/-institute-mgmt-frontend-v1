import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';
import { NoticeService }   from '../../admin/notices/notice.service';
import { Notice }          from '../../core/models';

@Component({
  selector:    'app-notice-board',
  templateUrl: './notice-board.component.html',
  styleUrls:   ['./notice-board.component.scss'],
})
export class NoticeBoardComponent implements OnInit, OnDestroy {
  notices:    Notice[] = [];
  loading     = true;
  expanded:   Set<string> = new Set();
  private destroy$ = new Subject<void>();

  constructor(private noticeSvc: NoticeService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.noticeSvc.getBoard()
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({ next: res => this.notices = res.data || [] });
  }

  toggle(id: string): void {
    this.expanded.has(id) ? this.expanded.delete(id) : this.expanded.add(id);
  }

  emoji(cat: string)  { return this.noticeSvc.categoryEmoji(cat);  }
  cLabel(cat: string) { return this.noticeSvc.categoryLabel(cat); }
  fmt(d: string)      { return this.noticeSvc.formatDate(d); }
  isExpanded(id: string): boolean { return this.expanded.has(id); }
  trackById(_: number, n: Notice): string { return n._id; }
}
