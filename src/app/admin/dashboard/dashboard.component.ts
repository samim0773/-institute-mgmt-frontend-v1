import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, forkJoin }            from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';
import { AdminApiService }              from '../services/admin-api.service';
import { AuthService }                  from '../../core/services/auth.service';

interface StatCard {
  label:    string;
  value:    string | number;
  icon:     string;
  color:    string;        // CSS class suffix: blue | green | amber | red | purple
  sub?:     string;        // small subtitle text
  route?:   string;        // click to navigate
  loading:  boolean;
}

interface UpcomingExam {
  _id:       string;
  name:      string;
  class:     string;
  section:   string;
  startDate: string;
  status:    string;
}

interface RecentNotice {
  _id:         string;
  title:       string;
  category:    string;
  publishedAt: string;
  createdAt: string;
}

interface ClassCount {
  _id:   { class: string; section: string };
  count: number;
}

@Component({
  selector:    'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls:   ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {

  // ── Stats cards ───────────────────────────────────────────────────────────
  cards: StatCard[] = [
    {
      label:   'Total Students',
      value:   '—',
      icon:    'people',
      color:   'blue',
      route:   '/admin/students',
      loading: true,
    },
    {
      label:   'Pending Fees',
      value:   '—',
      icon:    'payments',
      color:   'amber',
      route:   '/admin/fees',
      loading: true,
    },
    {
      label:   'Upcoming Exams',
      value:   '—',
      icon:    'assignment',
      color:   'purple',
      route:   '/admin/exams',
      loading: true,
    },
    {
      label:   'Active Notices',
      value:   '—',
      icon:    'notifications',
      color:   'green',
      route:   '/admin/notices',
      loading: true,
    },
  ];

  // ── Tables ────────────────────────────────────────────────────────────────
  upcomingExams:  UpcomingExam[] = [];
  recentNotices:  RecentNotice[] = [];
  classCounts:    ClassCount[]   = [];

  examsLoading   = true;
  noticesLoading = true;
  classLoading   = true;

  // ── Greet ─────────────────────────────────────────────────────────────────
  greeting   = '';
  userName   = '';
  today      = new Date();

  private destroy$ = new Subject<void>();

  constructor(
    private api:  AdminApiService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.setupGreeting();
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Greeting ──────────────────────────────────────────────────────────────
  private setupGreeting(): void {
    const hour = new Date().getHours();
    this.greeting = hour < 12 ? 'Good morning'
                  : hour < 17 ? 'Good afternoon'
                  :              'Good evening';
    this.userName = this.auth.currentUser?.name?.split(' ')[0] || 'Admin';
  }

  // ── Load all dashboard data in parallel ───────────────────────────────────
  private loadDashboard(): void {
    forkJoin({
      students: this.api.getStudentStats(),
      fees:     this.api.getFeeSummary(),
      exams:    this.api.getExams({ status: 'upcoming,ongoing' }),
      notices:  this.api.getNoticeStats(),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.examsLoading   = false;
          this.noticesLoading = false;
          this.classLoading   = false;
        }),
      )
      .subscribe({
        next: ({ students, fees, exams, notices }) => {
          this.applyStudentStats(students?.data);
          this.applyFeeStats(fees?.data);
          this.applyExamStats(exams);
          this.applyNoticeStats(notices?.data);
        },
        error: () => {
          // ErrorInterceptor shows the snackbar — just clear loading states
          this.cards.forEach(c => { c.loading = false; c.value = 'Error'; });
        },
      });
  }

  // ── Stat appliers ─────────────────────────────────────────────────────────
  private applyStudentStats(data: any): void {
    const card    = this.cards[0];
    card.loading  = false;
    card.value    = data?.total ?? 0;
    this.classCounts   = data?.byClass || [];
    this.classLoading  = false;

    // Sub-text: "across N classes"
    const classCount = this.classCounts.length;
    card.sub = classCount > 0 ? `across ${classCount} class-section${classCount > 1 ? 's' : ''}` : '';
  }

  private applyFeeStats(data: any): void {
    const card   = this.cards[1];
    card.loading = false;

    const pending = data?.totalPending ?? 0;
    card.value    = this.formatCurrency(pending);
    card.sub      = data?.overdueCount > 0
      ? `${data.overdueCount} overdue record${data.overdueCount > 1 ? 's' : ''}`
      : 'All up to date';

    if (data?.overdueCount > 0) card.color = 'red';
  }

  private applyExamStats(res: any): void {
    const card   = this.cards[2];
    card.loading = false;

    const list: UpcomingExam[] = res?.data || [];
    this.upcomingExams = list.slice(0, 5);

    const upcoming = list.filter(e => e.status === 'upcoming').length;
    const ongoing  = list.filter(e => e.status === 'ongoing').length;
    card.value     = upcoming + ongoing;
    card.sub       = ongoing > 0 ? `${ongoing} ongoing` : upcoming > 0 ? `${upcoming} scheduled` : 'None scheduled';
  }

  private applyNoticeStats(data: any): void {
    const card       = this.cards[3];
    card.loading     = false;
    card.value       = data?.active ?? 0;
    card.sub         = data?.drafts > 0
      ? `${data.drafts} draft${data.drafts > 1 ? 's' : ''} unpublished`
      : 'No drafts pending';
    this.recentNotices = (data?.recentDrafts || []).slice(0, 4);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatCurrency(val: number): string {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000)   return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  examStatusColor(status: string): string {
    const map: Record<string, string> = {
      upcoming:  'status-upcoming',
      ongoing:   'status-ongoing',
      completed: 'status-completed',
      draft:     'status-draft',
    };
    return map[status] || '';
  }

  noticeCategory(cat: string): string {
    const map: Record<string, string> = {
      urgent:  '🔴',
      exam:    '📋',
      holiday: '🏖️',
      fee:     '💰',
      event:   '🎉',
      general: '📢',
    };
    return map[cat] || '📢';
  }

  getBarWidth(count: number): number {
    const max = Math.max(...this.classCounts.map(c => c.count), 1);
    return Math.round((count / max) * 100);
  }

  trackById(_: number, item: any): string {
    return item._id;
  }
}
