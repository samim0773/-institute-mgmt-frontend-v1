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
  private observer!: IntersectionObserver;

  // ── Brand config exposed to template ──────────────────────────────────────
  // To change name / email / WhatsApp / phone: edit brand.config.ts only.
  readonly brand       = BRAND;
  readonly whatsappLink = WA_LINK;

  // ── Features ──────────────────────────────────────────────────────────────
  readonly features = [
    {
      icon: 'school',
      title: 'Student Management',
      desc: 'Complete student profiles, enrollment tracking, admission numbers, and progress records — all searchable in seconds.',
    },
    {
      icon: 'assignment',
      title: 'Exam & Results',
      desc: 'Create exams, record marks subject-wise, and auto-generate result sheets with pass/fail analytics instantly.',
    },
    {
      icon: 'payments',
      title: 'Fee Management',
      desc: 'Track fee collection, generate digital receipts, flag overdue payments, and get instant financial summaries.',
    },
    {
      icon: 'campaign',
      title: 'Notice Board',
      desc: 'Publish announcements and notices to teachers and students from a single admin panel — no more printouts.',
    },
    {
      icon: 'people',
      title: 'Teacher Portal',
      desc: 'Teachers get their own secure dashboard to enter marks, view class assignments, and access notices.',
    },
    {
      icon: 'business',
      title: 'Multi-Institute Ready',
      desc: 'Our platform supports multiple institutes — perfect for coaching chains, school groups, and franchise centres.',
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

  // ── Stats (animated counter) ───────────────────────────────────────────────
  readonly stats = [
    { value: 500,                    suffix: '+',  label: 'Students Managed' },
    { value: parseInt(BRAND.institutesCount, 10), suffix: '+',  label: 'Institutes Onboarded' },
    { value: BRAND.uptimePercent,    suffix: '%',  label: 'Uptime Guaranteed' },
    { value: 24,                     suffix: '/7', label: 'Support Available' },
  ];

  animatedStats: { value: number; suffix: string; label: string; current: number }[] = [];
  private statsAnimated = false;

  // ── Comparison Table ───────────────────────────────────────────────────────
  readonly comparisonRows = [
    {
      feature: 'Student Record Management',
      us: 'Digital, searchable, instant',
      spreadsheet: 'Manual entry required',  spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Physical files, slow to find', paperIcon: 'cancel', paperClass: 'cross',
    },
    {
      feature: 'Exam Marks & Results',
      us: 'Auto-calculated, one click',
      spreadsheet: 'Formula errors, slow',    spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Manual calculation, error-prone', paperIcon: 'cancel', paperClass: 'cross',
    },
    {
      feature: 'Fee Collection Tracking',
      us: 'Real-time, with receipts',
      spreadsheet: 'Manual update needed',    spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Cash book, no digital trail',   paperIcon: 'cancel', paperClass: 'cross',
    },
    {
      feature: 'Notice Board',
      us: 'Instant digital announcements',
      spreadsheet: 'Not possible',            spreadsheetIcon: 'cancel', spreadsheetClass: 'cross',
      paper: 'Physical printouts only',       paperIcon: 'warning', paperClass: 'warn',
    },
    {
      feature: 'Teacher Access Portal',
      us: 'Dedicated secure login',
      spreadsheet: 'No role-based access',    spreadsheetIcon: 'cancel', spreadsheetClass: 'cross',
      paper: 'None',                          paperIcon: 'cancel', paperClass: 'cross',
    },
    {
      feature: 'Reports & Analytics',
      us: 'Generated in seconds',
      spreadsheet: 'Hours of manual work',    spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Not available',                 paperIcon: 'cancel', paperClass: 'cross',
    },
    {
      feature: 'Data Backup & Safety',
      us: 'Automatic daily cloud backup',
      spreadsheet: 'High risk of file loss',  spreadsheetIcon: 'cancel', spreadsheetClass: 'cross',
      paper: 'Fire/flood/theft risk',         paperIcon: 'cancel', paperClass: 'cross',
    },
    {
      feature: 'Access From Anywhere',
      us: 'Any device, any time',
      spreadsheet: 'Limited, one computer',   spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Not possible',                  paperIcon: 'cancel', paperClass: 'cross',
    },
    {
      feature: 'Setup Time',
      us: '2 minutes to get started',
      spreadsheet: 'Hours of template setup', spreadsheetIcon: 'warning', spreadsheetClass: 'warn',
      paper: 'Days of preparation',           paperIcon: 'warning', paperClass: 'warn',
    },
  ];

  // ── Testimonials ───────────────────────────────────────────────────────────
  readonly testimonials = [
    {
      quote: 'EduManage Pro transformed how we run our coaching centre. What used to take us 2 days at the end of each month now takes 15 minutes. The fee tracking alone is worth every rupee.',
      name: 'Ravi Sharma',
      role: 'Director',
      institute: 'Sharma Coaching Centre',
      location: 'Delhi',
      initials: 'RS',
    },
    {
      quote: 'Setting up was incredibly easy. Within 20 minutes of registering, our teachers were already entering marks. The teacher portal is exactly what we needed — they love it.',
      name: 'Priya Nair',
      role: 'Principal',
      institute: 'Bright Minds Academy',
      location: 'Kochi',
      initials: 'PN',
    },
    {
      quote: 'Parents now get instant digital receipts for fee payments. No more confusion about who has paid. The support team also responded within an hour when I had a question.',
      name: 'Mohammed Farooq',
      role: 'Administrator',
      institute: 'Al-Noor Institute',
      location: 'Hyderabad',
      initials: 'MF',
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
      a: 'We offer Basic, Standard, and Advanced plans based on your student count and feature requirements. All plans include all core features. Contact us for a personalised quote — we price fairly for Indian institutes of all sizes.',
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
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
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
        const progress = step / steps;
        const eased    = 1 - Math.pow(1 - progress, 3);
        this.animatedStats[i] = { ...stat, current: Math.round(stat.value * eased) };
        if (step >= steps) clearInterval(timer);
      }, interval);
    });
  }

  toggleFaq(index: number): void {
    this.faqs[index].open = !this.faqs[index].open;
  }

  scrollTo(sectionId: string): void {
    this.mobileMenuOpen = false;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  }

  goToLogin():    void { this.router.navigate(['/auth/login']); }
  goToRegister(): void { this.router.navigate(['/register']); }
}
