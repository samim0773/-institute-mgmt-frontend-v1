import {
  Component, Input, OnChanges, SimpleChanges,
} from '@angular/core';
import { AdmitCardPrintPayload } from './exam.service';

/**
 * AdmitCardPrintComponent
 *
 * Purely presentational — receives a flat AdmitCardPrintPayload and renders
 * a print-optimized admit card layout.
 *
 * Used in TWO places:
 *   1. admit-card.component.html  → preview + print button
 *   2. Admit card list            → bulk print (one per student, @page breaks)
 *
 * @media print CSS hides everything on the page EXCEPT elements with
 * class="print-area", so the admit card renders cleanly on paper.
 */
@Component({
  selector: 'app-admit-card-print',
  template: `
<div class="admit-card-print print-area" *ngIf="card">

  <!-- ══ ADMIT CARD DOCUMENT ═════════════════════════════════════════════ -->
  <div class="card-doc">

    <!-- ── Institute header ──────────────────────────────────────────── -->
    <div class="inst-header">
      <img
        *ngIf="card.institute.logoUrl"
        [src]="card.institute.logoUrl"
        alt="{{ card.institute.name }} logo"
        class="inst-logo"
      />
      <div class="inst-text">
        <h1 class="inst-name">{{ card.institute.name }}</h1>
        <p class="inst-address">{{ card.institute.address }}</p>
        <p *ngIf="card.institute.phone" class="inst-phone">
          Tel: {{ card.institute.phone }}
        </p>
      </div>
    </div>

    <!-- ── Title bar ─────────────────────────────────────────────────── -->
    <div class="admit-title-bar">
      <span class="admit-title-text">ADMIT CARD</span>
      <span class="exam-name-label">{{ card.exam.name }}</span>
    </div>

    <!-- ── Two-column: student info + photo ──────────────────────────── -->
    <div class="student-section">

      <!-- Student details table -->
      <table class="student-info-table">
        <tbody>
          <tr>
            <td class="info-label">Student Name</td>
            <td class="info-value info-value--name">{{ card.student.name }}</td>
          </tr>
          <tr>
            <td class="info-label">Exam Roll No</td>
            <td class="info-value info-value--roll">{{ card.rollNo }}</td>
          </tr>
          <tr>
            <td class="info-label">Class / Section</td>
            <td class="info-value">
              {{ card.student.class }}-{{ card.student.section }}
            </td>
          </tr>
          <tr *ngIf="card.student.dob">
            <td class="info-label">Date of Birth</td>
            <td class="info-value">{{ formatDob(card.student.dob) }}</td>
          </tr>
          <tr>
            <td class="info-label">Father / Guardian</td>
            <td class="info-value">{{ card.student.guardianName }}</td>
          </tr>
          <tr>
            <td class="info-label">Examination Centre</td>
            <td class="info-value">{{ card.center }}</td>
          </tr>
          <tr>
            <td class="info-label">Issue Date</td>
            <td class="info-value">{{ formatDate(card.issuedDate) }}</td>
          </tr>
          <tr *ngIf="card.seatNo">
            <td class="info-label">Seat No.</td>
            <td class="info-value info-value--roll">{{ card.seatNo }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Student photo box -->
      <div class="photo-box">
        <img
          *ngIf="card.student.photo"
          [src]="card.student.photo"
          alt="{{ card.student.name }}"
          class="student-photo"
        />
        <div *ngIf="!card.student.photo" class="photo-placeholder">
          <span>Photo</span>
        </div>
        <p class="photo-caption">Candidate's Photo</p>
      </div>

    </div><!-- /student-section -->

    <!-- ── Exam schedule table ────────────────────────────────────────── -->
    <div *ngIf="card.schedule && card.schedule.length > 0" class="schedule-section">
      <h3 class="schedule-heading">Examination Schedule</h3>
      <table class="schedule-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Date</th>
            <th>Time</th>
            <th>Max Marks</th>
            <th>Pass Marks</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of card.schedule; let i = index" [class.row-alt]="i % 2 === 1">
            <td class="subject-name">{{ row.subject }}</td>
            <td>{{ row.examDate ? formatDate(row.examDate) : '—' }}</td>
            <td>{{ row.examTime || '—' }}</td>
            <td class="marks-cell">{{ row.maxMarks }}</td>
            <td class="marks-cell">{{ row.passingMarks }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Instructions ───────────────────────────────────────────────── -->
    <div *ngIf="card.exam.instructions" class="instructions-section">
      <h3 class="instructions-heading">Instructions to Candidates</h3>
      <ol class="instructions-list">
        <li *ngFor="let line of instructionLines">{{ line }}</li>
      </ol>
    </div>

    <!-- Default instructions if none provided -->
    <div *ngIf="!card.exam.instructions" class="instructions-section">
      <h3 class="instructions-heading">Instructions to Candidates</h3>
      <ol class="instructions-list">
        <li>Students must bring this admit card to every examination session.</li>
        <li>Admit card must be presented along with school photo ID.</li>
        <li>Students must be seated 15 minutes before the exam begins.</li>
        <li>Mobile phones and electronic devices are strictly prohibited.</li>
        <li>Unfair means will lead to immediate disqualification.</li>
      </ol>
    </div>

    <!-- ── Signature strip ────────────────────────────────────────────── -->
    <div class="signature-strip">
      <div class="sig-box">
        <div class="sig-line"></div>
        <p class="sig-label">Student's Signature</p>
      </div>
      <div class="sig-box sig-box--center">
        <img
          *ngIf="card.signatureUrl"
          [src]="card.signatureUrl"
          alt="Controller's Signature"
          class="controller-sig-img"
        />
        <div *ngIf="!card.signatureUrl" class="sig-line"></div>
        <p class="sig-label">Controller of Examinations</p>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <p class="sig-label">Principal's Signature</p>
      </div>
    </div>

    <!-- ── Cut line (shown only on print) ────────────────────────────── -->
    <div class="cut-line no-print">- - - - - - - - - - - - - - - - - - - - - - - - -</div>

  </div><!-- /card-doc -->
</div>
  `,
  styleUrls: ['./admit-card-print.component.scss'],
})
export class AdmitCardPrintComponent implements OnChanges {

  @Input() card: AdmitCardPrintPayload | null = null;

  instructionLines: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['card'] && this.card?.exam?.instructions) {
      // Split instructions on newline or period+space into bullet lines
      this.instructionLines = this.card.exam.instructions
        .split(/\n|(?<=\.)\s+/)
        .map(l => l.trim())
        .filter(l => l.length > 0);
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
