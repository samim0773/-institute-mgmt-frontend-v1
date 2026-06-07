import {
  Component, OnInit, OnDestroy, HostListener,
  ElementRef, ViewChildren, QueryList, AfterViewInit,
} from '@angular/core';
import { Router } from '@angular/router';

import { BRAND, WA_LINK } from '../../core/config/brand.config';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {

  navScrolled         = false;
  mobileMenuOpen      = false;
  showAnnouncementBar = true;
  activeRoleTab: 'admin' | 'teacher' | 'student' = 'admin';
  private observer!: IntersectionObserver;

  readonly brand        = BRAND;
  readonly whatsappLink = WA_LINK;

  // ── Features (12 modules) ─────────────────────────────────────────────────
  readonly features = [
    {
      icon: 'school', color: '#1565c0',
      title: 'Student Management',
      desc: 'Complete digital student records with profiles, admission numbers, guardian info and academic history.',
      bullets: ['Bulk import from Excel / CSV', 'Advanced search & filters', 'Admission number auto-generation', 'Active / inactive status control'],
    },
    {
      icon: 'class', color: '#00695c',
      title: 'Class & Curriculum Setup',
      desc: 'Structure your institute into classes, sections, and subjects with teacher assignments.',
      bullets: ['Multiple sections per class', 'Subject & curriculum setup', 'Homeroom teacher assignment', 'Academic year management'],
    },
    {
      icon: 'assignment', color: '#6a1b9a',
      title: 'Exam Management',
      desc: 'End-to-end exam workflow — from creation and scheduling to published result sheets.',
      bullets: ['Create & schedule exams', 'Subject-wise mark entry', 'Auto pass / fail calculation', 'Result publishing control'],
    },
    {
      icon: 'payments', color: '#c62828',
      title: 'Fee Management',
      desc: 'Full fee lifecycle — billing, tracking, overdue alerts, and digital receipts.',
      bullets: ['Fee structure templates', 'Individual billing control', 'Overdue & pending alerts', 'Online payment via Razorpay'],
      planTag: 'Online Payments: Standard+',
    },
    {
      icon: 'credit_card', color: '#e65100',
      title: 'Admit Card Generation',
      desc: 'Generate and issue digital admit cards for any exam in a single click.',
      bullets: ['Exam-linked admit cards', 'Bulk generation in one click', 'Student portal download', 'Active / inactive control'],
    },
    {
      icon: 'campaign', color: '#00838f',
      title: 'Notice Board',
      desc: 'Publish announcements to specific classes or the entire institute — no printouts.',
      bullets: ['Target by class or school-wide', 'Expiry dates on notices', 'Published / draft status', 'Teacher & student visibility'],
    },
    {
      icon: 'person', color: '#2e7d32',
      title: 'Teacher Portal',
      desc: 'Dedicated secure login for teachers with their own marks entry and class workspace.',
      bullets: ['Role-based secure access', 'Mark entry interface', 'Class & subject assignment view', 'Student list per class'],
    },
    {
      icon: 'account_circle', color: '#7c4dff',
      title: 'Student Self-Service Portal',
      desc: 'Students access their results, fees, notices, and admit cards 24/7 from any device.',
      bullets: ['Username + password login', 'View published results & marks', 'Download admit cards', 'Fee status & payment history'],
      planTag: 'Standard+',
    },
    {
      icon: 'sms', color: '#558b2f',
      title: 'SMS Notifications',
      desc: 'Automated SMS alerts sent directly to parents for fees, results, and notices.',
      bullets: ['Fee payment reminders', 'Result notification SMS', 'Custom message templates', 'Guardian phone delivery'],
      planTag: 'Advance',
    },
    {
      icon: 'download', color: '#0277bd',
      title: 'Data Export',
      desc: 'Export any data — students, fees, results, reports — to Excel or CSV in seconds.',
      bullets: ['Student & fee records export', 'Exam result exports', 'Custom date range filters', 'One-click download'],
      planTag: 'Advance',
    },
    {
      icon: 'inventory_2', color: '#37474f',
      title: 'Inventory Management',
      desc: 'Track all institute assets — furniture, electronics, lab equipment — with full condition history.',
      bullets: ['8 asset categories', 'Condition & warranty tracking', 'Supplier & location records', 'Low-stock alerts'],
      planTag: 'Advance',
    },
    {
      icon: 'account_balance_wallet', color: '#4e342e',
      title: 'Expense & Salary Tracking',
      desc: 'Complete financial management — teacher salaries, utilities, rent, and all institute expenses.',
      bullets: ['9 expense categories', 'Teacher salary records', 'Payment mode tracking', 'Monthly & yearly summaries'],
      planTag: 'Advance',
    },
  ];

  // ── Role-based features ────────────────────────────────────────────────────
  readonly roleFeatures = {
    admin: [
      { icon: 'dashboard',              text: 'Real-time dashboard with live institute statistics' },
      { icon: 'school',                 text: 'Full student management — add, edit, bulk import' },
      { icon: 'class',                  text: 'Class, section & subject management' },
      { icon: 'people',                 text: 'Teacher account creation & management' },
      { icon: 'assignment',             text: 'Exam creation, scheduling & management' },
      { icon: 'grade',                  text: 'Marks entry, result calculation & publishing' },
      { icon: 'payments',               text: 'Fee billing, tracking & overdue alerts' },
      { icon: 'credit_card',            text: 'Admit card generation & bulk issuance' },
      { icon: 'campaign',               text: 'Class-targeted & school-wide notice board' },
      { icon: 'download',               text: 'One-click Excel / CSV data export' },
      { icon: 'inventory_2',            text: 'Asset & inventory tracking with low-stock alerts' },
      { icon: 'account_balance_wallet', text: 'Full expense, salary & financial management' },
    ],
    teacher: [
      { icon: 'dashboard',   text: 'Personal teacher dashboard on every login' },
      { icon: 'grade',       text: 'Marks entry for each assigned subject & exam' },
      { icon: 'class',       text: 'View homeroom and subject class assignments' },
      { icon: 'school',      text: 'Access student list for each assigned class' },
      { icon: 'assignment',  text: 'View scheduled exams for assigned classes' },
      { icon: 'campaign',    text: 'Read all institute announcements & notices' },
    ],
    student: [
      { icon: 'dashboard',      text: 'Personal student portal — accessible anytime' },
      { icon: 'grade',          text: 'View all published exam results & subject marks' },
      { icon: 'payments',       text: 'Check fee status, due amounts & payment history' },
      { icon: 'campaign',       text: 'Read notices from the institute' },
      { icon: 'credit_card',    text: 'Download admit cards for upcoming exams' },
      { icon: 'account_circle', text: 'View personal profile & class details' },
    ],
  };

  // ── 4-Plan Pricing ────────────────────────────────────────────────────────
  readonly plans = [
    {
      key: 'trial', name: 'Free Trial',
      price: '₹0', period: `${BRAND.trialDays} days`,
      students: `Up to ${BRAND.trialMaxStudents} students`,
      badge: 'Free', badgeClass: 'badge-free',
      highlighted: false,
      icon: 'explore',
      included: [
        'Student management',
        'Class & section setup',
        'Exam & results system',
        'Fee billing & tracking',
        'Notice board',
        'Admit card generation',
        'Admin + Teacher portals',
        'Email & chat support',
      ],
      excluded: ['Student login portal', 'Online payments', 'SMS notifications', 'Data export', 'Inventory & expenses'],
      ctaLabel: 'Start Free Trial', ctaAction: 'register',
    },
    {
      key: 'basic', name: 'Basic',
      price: 'Custom', period: 'per year',
      students: 'Up to 500 students',
      badge: null, badgeClass: '',
      highlighted: false,
      icon: 'bolt',
      included: [
        'Everything in Trial',
        'Up to 500 students',
        'Priority support',
        'Onboarding session',
        'Data migration help',
      ],
      excluded: ['Student login portal', 'Online payments', 'SMS notifications', 'Data export', 'Inventory & expenses'],
      ctaLabel: 'Get a Quote', ctaAction: 'contact',
    },
    {
      key: 'standard', name: 'Standard',
      price: 'Custom', period: 'per year',
      students: 'Up to 1,000 students',
      badge: 'Most Popular', badgeClass: 'badge-popular',
      highlighted: true,
      icon: 'star',
      included: [
        'Everything in Basic',
        'Up to 1,000 students',
        'Student self-service portal',
        'Online fee payments (Razorpay)',
        'Priority 24/7 support',
        'Dedicated onboarding',
      ],
      excluded: ['SMS notifications', 'Data export', 'Inventory & expenses'],
      ctaLabel: 'Get a Quote', ctaAction: 'contact',
    },
    {
      key: 'advance', name: 'Advance',
      price: 'Custom', period: 'per year',
      students: '2,000+ students',
      badge: 'All Features', badgeClass: 'badge-advance',
      highlighted: false,
      icon: 'workspace_premium',
      included: [
        'Everything in Standard',
        '2,000+ students',
        'SMS notifications to parents',
        'Full data export (Excel/CSV)',
        'Inventory & asset tracking',
        'Expense & salary management',
        'Custom feature development',
        'Dedicated account manager',
      ],
      excluded: [],
      ctaLabel: 'Get a Quote', ctaAction: 'contact',
    },
  ];

  // ── Why Us ────────────────────────────────────────────────────────────────
  readonly whyUs = [
    {
      icon: 'support_agent',
      title: `${BRAND.supportHours} Support`,
      desc: `Round-the-clock assistance via email and WhatsApp. Response time: ${BRAND.responseTime}.`,
    },
    {
      icon: 'build',
      title: 'Custom Features',
      desc: `Need something specific? We customise ${BRAND.name} to fit your institute's exact workflow.`,
    },
    {
      icon: 'cloud_done',
      title: 'Cloud-Based & Secure',
      desc: 'Hosted on secure cloud infrastructure with daily backups. Access from anywhere, no hardware needed.',
    },
    {
      icon: 'trending_up',
      title: 'Grow With Confidence',
      desc: `Start small with our ${BRAND.trialDays}-day trial, scale up as you grow. Plans built around your student count.`,
    },
  ];

  // ── How It Works ──────────────────────────────────────────────────────────
  readonly steps = [
    {
      number: '01',
      title: 'Register Your Institute',
      desc: `Fill in your institute details and create an admin account in under 2 minutes — completely free.`,
    },
    {
      number: '02',
      title: 'Set Up & Onboard',
      desc: 'Add teachers, create classes, subjects, and import your student list. We help at every step.',
    },
    {
      number: '03',
      title: 'Go Live',
      desc: 'Start managing exams, fees, and notices from day one. Your institute runs itself.',
    },
  ];

  // ── Stats ─────────────────────────────────────────────────────────────────
  readonly stats = [
    { value: 500,                                    suffix: '+',  label: 'Students Managed' },
    { value: parseInt(BRAND.institutesCount, 10),    suffix: '+',  label: 'Institutes Onboarded' },
    { value: BRAND.uptimePercent,                    suffix: '%',  label: 'Uptime Guaranteed' },
    { value: 24,                                     suffix: '/7', label: 'Support Available' },
  ];

  animatedStats: { value: number; suffix: string; label: string; current: number }[] = [];
  private statsAnimated = false;

  // ── Comparison Table ───────────────────────────────────────────────────────
  readonly comparisonRows = [
    {
      feature: 'Student Record Management',
      us: 'Digital, searchable, instant',
      spreadsheet: 'Manual entry required',       spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Physical files, slow to find',      paperIcon: 'cancel',  paperClass: 'cross',
    },
    {
      feature: 'Exam Marks & Results',
      us: 'Auto-calculated, one click',
      spreadsheet: 'Formula errors, slow',        spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Manual calculation, error-prone',   paperIcon: 'cancel',  paperClass: 'cross',
    },
    {
      feature: 'Fee Collection Tracking',
      us: 'Real-time with digital receipts',
      spreadsheet: 'Manual update needed',        spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Cash book, no digital trail',       paperIcon: 'cancel',  paperClass: 'cross',
    },
    {
      feature: 'Notice Board',
      us: 'Instant digital announcements',
      spreadsheet: 'Not possible',               spreadsheetIcon: 'cancel',  spreadsheetClass: 'cross',
      paper: 'Physical printouts only',          paperIcon: 'warning', paperClass: 'warn',
    },
    {
      feature: 'Teacher Access Portal',
      us: 'Dedicated secure login',
      spreadsheet: 'No role-based access',       spreadsheetIcon: 'cancel',  spreadsheetClass: 'cross',
      paper: 'None',                             paperIcon: 'cancel',  paperClass: 'cross',
    },
    {
      feature: 'Student Self-Service Portal',
      us: 'Results, fees & admit cards anytime',
      spreadsheet: 'Not possible',               spreadsheetIcon: 'cancel',  spreadsheetClass: 'cross',
      paper: 'Not possible',                     paperIcon: 'cancel',  paperClass: 'cross',
    },
    {
      feature: 'Admit Card Generation',
      us: 'Digital, exam-linked, one click',
      spreadsheet: 'Manual design required',     spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Printed only, time-consuming',     paperIcon: 'warning', paperClass: 'warn',
    },
    {
      feature: 'Inventory & Asset Tracking',
      us: 'Full tracking, low-stock alerts',
      spreadsheet: 'Basic list only',            spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Physical registers only',          paperIcon: 'cancel',  paperClass: 'cross',
    },
    {
      feature: 'Expense & Salary Management',
      us: 'Real-time categorised tracking',
      spreadsheet: 'Manual, error-prone',        spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Cash book, no analysis',           paperIcon: 'cancel',  paperClass: 'cross',
    },
    {
      feature: 'SMS Parent Notifications',
      us: 'Auto SMS for fees, results, notices',
      spreadsheet: 'Not possible',               spreadsheetIcon: 'cancel',  spreadsheetClass: 'cross',
      paper: 'Not possible',                     paperIcon: 'cancel',  paperClass: 'cross',
    },
    {
      feature: 'Reports & Analytics',
      us: 'Generated in seconds',
      spreadsheet: 'Hours of manual work',       spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Not available',                    paperIcon: 'cancel',  paperClass: 'cross',
    },
    {
      feature: 'Data Backup & Safety',
      us: 'Automatic daily cloud backup',
      spreadsheet: 'High risk of file loss',     spreadsheetIcon: 'cancel',  spreadsheetClass: 'cross',
      paper: 'Fire / flood / theft risk',        paperIcon: 'cancel',  paperClass: 'cross',
    },
    {
      feature: 'Access From Anywhere',
      us: 'Any device, any time',
      spreadsheet: 'Limited, one computer',      spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Not possible',                     paperIcon: 'cancel',  paperClass: 'cross',
    },
    {
      feature: 'Setup Time',
      us: '2 minutes to get started',
      spreadsheet: 'Hours of template setup',    spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Days of preparation',              paperIcon: 'warning', paperClass: 'warn',
    },
  ];

  // ── Testimonials ───────────────────────────────────────────────────────────
  readonly testimonials = [
    {
      quote: 'EduManage Pro transformed how we run our coaching centre. What used to take us 2 days at the end of each month now takes 15 minutes. The fee tracking alone is worth every rupee.',
      name: 'Ravi Sharma', role: 'Director',
      institute: 'Sharma Coaching Centre', location: 'Delhi', initials: 'RS',
    },
    {
      quote: 'Setting up was incredibly easy. Within 20 minutes of registering, our teachers were already entering marks. The teacher portal is exactly what we needed — they love it.',
      name: 'Priya Nair', role: 'Principal',
      institute: 'Bright Minds Academy', location: 'Kochi', initials: 'PN',
    },
    {
      quote: 'Parents now get instant digital receipts for fee payments. No more confusion about who has paid. The support team also responded within an hour when I had a question.',
      name: 'Mohammed Farooq', role: 'Administrator',
      institute: 'Al-Noor Institute', location: 'Hyderabad', initials: 'MF',
    },
  ];

  // ── FAQ ────────────────────────────────────────────────────────────────────
  faqs: { q: string; a: string; open: boolean }[] = [
    {
      q: `Is my institute's data secure?`,
      a: `Absolutely. All data is hosted on secure cloud servers with encryption in transit and at rest. Daily automatic backups ensure you never lose data. Only authorised users from your institute can access your records — we never share your data with third parties.`,
      open: false,
    },
    {
      q: `What happens after my ${BRAND.trialDays}-day free trial ends?`,
      a: `After ${BRAND.trialDays} days, your account will be locked but your data is safely preserved. Simply contact us via email or WhatsApp and we'll set up your paid plan within 24 hours — no data loss, no re-setup needed.`,
      open: false,
    },
    {
      q: 'Can I import my existing student data from Excel?',
      a: `Yes! Our team will help you migrate your existing student records from Excel, Google Sheets, or any other format at no extra charge. Just reach out to us after registering and we'll handle it for you.`,
      open: false,
    },
    {
      q: 'How many students and teachers can I add?',
      a: `The free trial supports up to ${BRAND.trialMaxStudents} students and unlimited teachers. Our paid plans support from 100 to 2000+ students depending on the plan. Contact us to get a plan tailored to your exact needs.`,
      open: false,
    },
    {
      q: 'Do you offer phone or WhatsApp support?',
      a: `Yes! We offer ${BRAND.supportHours} support via email (${BRAND.email}) and WhatsApp. For onboarding and demos, we can schedule a call or a video session at a time that works for you.`,
      open: false,
    },
    {
      q: 'Are there any setup fees or hidden charges?',
      a: `Zero hidden charges. The ${BRAND.trialDays}-day trial is completely free — no credit card required. Paid plans are straightforward and will be clearly quoted before you commit. What we quote is what you pay.`,
      open: false,
    },
    {
      q: `Can features be customised for my institute's specific needs?`,
      a: `Custom development is one of our core strengths. Whether you need admit card generation, custom report formats, SMS integration, or any other feature — we can build it. Contact us at ${BRAND.email} to discuss your requirements.`,
      open: false,
    },
    {
      q: 'What plans are available after the trial?',
      a: 'We offer Basic, Standard, and Advance plans based on your student count and feature requirements. All plans include all core features. Contact us for a personalised quote — we price fairly for Indian institutes of all sizes.',
      open: false,
    },
  ];

  @ViewChildren('animateOnScroll') animateSections!: QueryList<ElementRef>;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.animatedStats = this.stats.map(s => ({ ...s, current: 0 }));
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      entries => { entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }); },
      { threshold: 0.12 },
    );
    this.animateSections.forEach(el => this.observer.observe(el.nativeElement));
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }

  @HostListener('window:scroll', [])
  onScroll(): void {
    this.navScrolled = window.scrollY > 50;
    this.checkStatsVisibility();
  }

  private checkStatsVisibility(): void {
    if (this.statsAnimated) return;
    const el = document.querySelector('.stats-section');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 100) {
      this.statsAnimated = true;
      this.animateCounters();
    }
  }

  private animateCounters(): void {
    const duration = 1800;
    const steps    = 60;
    const interval = duration / steps;

    this.animatedStats.forEach((stat, i) => {
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const eased = 1 - Math.pow(1 - step / steps, 3);
        this.animatedStats[i] = { ...stat, current: Math.round(stat.value * eased) };
        if (step >= steps) clearInterval(timer);
      }, interval);
    });
  }

  toggleFaq(index: number): void { this.faqs[index].open = !this.faqs[index].open; }

  scrollTo(sectionId: string): void {
    this.mobileMenuOpen = false;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  }

  planAction(action: string): void {
    if (action === 'register') this.goToRegister();
    else this.scrollTo('contact');
  }

  goToLogin():    void { this.router.navigate(['/auth/login']); }
  goToRegister(): void { this.router.navigate(['/register']); }
}
