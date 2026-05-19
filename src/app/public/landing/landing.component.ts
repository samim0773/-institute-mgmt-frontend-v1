import {
  Component, OnInit, OnDestroy, HostListener,
  ElementRef, ViewChildren, QueryList, AfterViewInit,
} from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {

  navScrolled  = false;
  mobileMenuOpen = false;
  private observer!: IntersectionObserver;

  readonly features = [
    {
      icon: 'school',
      title: 'Student Management',
      desc: 'Complete student profiles, enrollment tracking, attendance, and progress reports — all in one place.',
    },
    {
      icon: 'assignment',
      title: 'Exam & Results',
      desc: 'Create exams, record marks subject-wise, and auto-generate result sheets with pass/fail analytics.',
    },
    {
      icon: 'payments',
      title: 'Fee Management',
      desc: 'Track fee collection, generate receipts, flag overdue payments, and get financial summaries instantly.',
    },
    {
      icon: 'campaign',
      title: 'Notice Board',
      desc: 'Publish announcements and notices to teachers and students from a single admin panel.',
    },
    {
      icon: 'people',
      title: 'Teacher Portal',
      desc: 'Teachers get their own dashboard to enter marks, view class assignments, and access notices.',
    },
    {
      icon: 'business',
      title: 'Multi-Institute Ready',
      desc: 'Our platform supports multiple institutes on one system — perfect for coaching chains and school groups.',
    },
  ];

  readonly whyUs = [
    {
      icon: 'support_agent',
      title: '24/7 Support',
      desc: 'Round-the-clock assistance via email and chat. We never leave you stuck.',
    },
    {
      icon: 'build',
      title: 'Custom Features',
      desc: "Need something specific? We customize the platform to fit your institute's exact workflow.",
    },
    {
      icon: 'cloud_done',
      title: 'Cloud-Based & Secure',
      desc: 'Hosted on secure cloud infrastructure. Access from anywhere, no hardware needed.',
    },
    {
      icon: 'trending_up',
      title: 'Grow With Confidence',
      desc: 'Start small with our trial, scale up as you grow. Plans built around your student count.',
    },
  ];

  readonly steps = [
    {
      number: '01',
      title: 'Register Your Institute',
      desc: 'Fill in your institute details and create an admin account in under 2 minutes.',
    },
    {
      number: '02',
      title: 'Set Up & Onboard',
      desc: 'Add teachers, create classes, subjects, and import your student list.',
    },
    {
      number: '03',
      title: 'Go Live',
      desc: 'Start managing exams, fees, and notices from day one.',
    },
  ];

  readonly stats = [
    { value: 500, suffix: '+', label: 'Students Managed' },
    { value: 20,  suffix: '+', label: 'Institutes' },
    { value: 99,  suffix: '%', label: 'Uptime' },
    { value: 24,  suffix: '/7', label: 'Support' },
  ];

  animatedStats: { value: number; suffix: string; label: string; current: number }[] = [];
  private statsAnimated = false;

  @ViewChildren('animateOnScroll') animateSections!: QueryList<ElementRef>;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.animatedStats = this.stats.map(s => ({ ...s, current: 0 }));
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15 },
    );

    this.animateSections.forEach(el => this.observer.observe(el.nativeElement));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

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
        this.animatedStats[i] = {
          ...stat,
          current: Math.round(stat.value * eased),
        };
        if (step >= steps) clearInterval(timer);
      }, interval);
    });
  }

  scrollTo(sectionId: string): void {
    this.mobileMenuOpen = false;
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: 'smooth' });
  }

  goToLogin():    void { this.router.navigate(['/auth/login']); }
  goToRegister(): void { this.router.navigate(['/register']); }
}
