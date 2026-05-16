import {
  Component, Input, OnChanges, SimpleChanges,
} from '@angular/core';
import { AdmitCardPrintPayload } from './exam.service';

/**
 * Renders ONE admit card block.
 * The parent (AdmitCardComponent) renders it twice — Office Copy + Student Copy —
 * inside a single .print-area div so both fit on one A4 sheet.
 */
@Component({
  selector: 'app-admit-card-print',
  template: `
<div class="ac-card" *ngIf="card">

  <!-- Copy badge: "Office Copy" / "Student Copy" -->
  <div class="ac-copy-badge" *ngIf="copyLabel">{{ copyLabel }}</div>

  <!-- ── Institute header ──────────────────────────────────────────────── -->
  <div class="ac-header">
    <img
      *ngIf="card.institute.logoUrl"
      [src]="card.institute.logoUrl"
      alt="Logo"
      class="ac-logo"
    />
    <div class="ac-inst-text">
      <h1 class="ac-inst-name">{{ card.institute.name }}</h1>
      <p class="ac-inst-addr">{{ card.institute.address }}</p>
      <p *ngIf="card.institute.phone" class="ac-inst-phone">Tel: {{ card.institute.phone }}</p>
    </div>
  </div>

  <!-- ── Title bar ─────────────────────────────────────────────────────── -->
  <div class="ac-title-bar">
    <span class="ac-title">ADMIT CARD</span>
    <span class="ac-exam-name">{{ card.exam.name }}</span>
  </div>

  <!-- ── Student info + photo ──────────────────────────────────────────── -->
  <div class="ac-student-row">
    <table class="ac-info-table">
      <tbody>
        <tr>
          <td class="ac-lbl">Student Name</td>
          <td class="ac-val ac-val--name">{{ card.student.name }}</td>
        </tr>
        <tr>
          <td class="ac-lbl">Exam Roll No.</td>
          <td class="ac-val ac-val--roll">{{ card.rollNo }}</td>
        </tr>
        <tr>
          <td class="ac-lbl">Class / Section</td>
          <td class="ac-val">{{ card.student.class }}-{{ card.student.section }}</td>
        </tr>
        <tr *ngIf="card.student.dob">
          <td class="ac-lbl">Date of Birth</td>
          <td class="ac-val">{{ formatDob(card.student.dob) }}</td>
        </tr>
        <tr>
          <td class="ac-lbl">Guardian Name</td>
          <td class="ac-val">{{ card.student.guardianName }}</td>
        </tr>
        <tr>
          <td class="ac-lbl">Exam Centre</td>
          <td class="ac-val">{{ card.center }}</td>
        </tr>
        <tr>
          <td class="ac-lbl">Issue Date</td>
          <td class="ac-val">{{ formatDate(card.issuedDate) }}</td>
        </tr>
        <tr *ngIf="card.seatNo">
          <td class="ac-lbl">Seat No.</td>
          <td class="ac-val ac-val--roll">{{ card.seatNo }}</td>
        </tr>
      </tbody>
    </table>

    <div class="ac-photo-box">
      <img
        *ngIf="card.student.photo"
        [src]="card.student.photo"
        alt="{{ card.student.name }}"
        class="ac-photo"
      />
      <div *ngIf="!card.student.photo" class="ac-photo-placeholder">Photo</div>
      <p class="ac-photo-lbl">Candidate's Photo</p>
    </div>
  </div>

  <!-- ── Exam schedule ──────────────────────────────────────────────────── -->
  <div class="ac-schedule" *ngIf="card.schedule?.length">
    <h3 class="ac-sec-title">Examination Schedule</h3>
    <table class="ac-sched-table">
      <thead>
        <tr>
          <th>Subject</th>
          <th>Date</th>
          <th>Time</th>
          <th>Max</th>
          <th>Pass</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let r of card.schedule; let i = index" [class.ac-row-alt]="i % 2 === 1">
          <td class="ac-sub-name">{{ r.subject }}</td>
          <td class="ac-nowrap">{{ r.examDate ? formatDate(r.examDate) : '—' }}</td>
          <td class="ac-nowrap">{{ r.examTime || '—' }}</td>
          <td class="ac-center">{{ r.maxMarks }}</td>
          <td class="ac-center">{{ r.passingMarks }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ── Instructions ──────────────────────────────────────────────────── -->
  <div class="ac-instructions">
    <h3 class="ac-sec-title">Instructions to Candidates</h3>
    <ol class="ac-instr-list">
      <li *ngFor="let line of instructionLines">{{ line }}</li>
    </ol>
  </div>

  <!-- ── Signature strip ───────────────────────────────────────────────── -->
  <div class="ac-signatures">
    <div class="ac-sig">
      <div class="ac-sig-line"></div>
      <p class="ac-sig-lbl">Student's Signature</p>
    </div>
    <div class="ac-sig">
      <img
        *ngIf="card.signatureUrl"
        [src]="card.signatureUrl"
        alt="Controller's Signature"
        class="ac-sig-img"
      />
      <div *ngIf="!card.signatureUrl" class="ac-sig-line"></div>
      <p class="ac-sig-lbl">Controller of Examinations</p>
    </div>
    <div class="ac-sig">
      <div class="ac-sig-line"></div>
      <p class="ac-sig-lbl">Principal's Signature</p>
    </div>
  </div>

</div>
  `,
  styleUrls: ['./admit-card-print.component.scss'],
})
export class AdmitCardPrintComponent implements OnChanges {

  @Input() card:      AdmitCardPrintPayload | null = null;
  @Input() copyLabel: string = '';

  instructionLines: string[] = [];

  private readonly defaultInstructions = [
    'Bring this admit card to every examination session along with school photo ID.',
    'Be seated 15 minutes before the exam begins. Late entry is not permitted.',
    'Mobile phones and electronic devices are strictly prohibited in the examination hall.',
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['card']) {
      const instr = this.card?.exam?.instructions;
      this.instructionLines = instr
        ? instr.split(/\n|(?<=\.)\s+/).map(l => l.trim()).filter(l => l.length > 0)
        : this.defaultInstructions;
    }
  }

  formatDate(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  formatDob(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }
}
