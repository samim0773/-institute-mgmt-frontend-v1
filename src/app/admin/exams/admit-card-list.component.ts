import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router }        from '@angular/router';
import { Subject, forkJoin, of }         from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';

import {
  ExamService,
  AdmitCardEntry,
  AdmitCardPrintPayload,
} from './exam.service';
import { ApiResponse }         from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector:    'app-admit-card-list',
  templateUrl: './admit-card-list.component.html',
  styleUrls:   ['./admit-card-list.component.scss'],
})
export class AdmitCardListComponent implements OnInit, OnDestroy {

  examId   = '';
  examInfo: { id: string; name: string; class: string; section: string } | null = null;
  cards:   AdmitCardEntry[] = [];

  loading      = true;
  generating   = false;
  bulkPrinting = false;
  revokingId   = '';

  selected = new Set<string>();

  readonly displayedColumns = ['select', 'student', 'rollNo', 'center', 'issued', 'status', 'actions'];

  private destroy$ = new Subject<void>();

  constructor(
    private route:   ActivatedRoute,
    private router:  Router,
    private examSvc: ExamService,
    private notify:  NotificationService,
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(p => {
      this.examId = p['examId'];
      this.loadCards();
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ─── Data ──────────────────────────────────────────────────────────────────
  private loadCards(): void {
    this.loading = true;
    this.selected.clear();
    this.examSvc.getAdmitCardsByExam(this.examId)
      .pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: res => {
          this.cards = res.data || [];
          if (res.exam) this.examInfo = res.exam;
        },
        error: () => this.notify.error('Failed to load admit cards.'),
      });
  }

  generateCards(): void {
    this.generating = true;
    this.examSvc.generateAdmitCards(this.examId)
      .pipe(takeUntil(this.destroy$), finalize(() => this.generating = false))
      .subscribe({
        next: res => {
          const d = res.data!;
          this.notify.success(`${d.created} card(s) generated, ${d.skipped} already existed.`);
          this.loadCards();
        },
      });
  }

  // ─── Row selection ─────────────────────────────────────────────────────────
  get activeCards(): AdmitCardEntry[] { return this.cards.filter(c => c.isActive); }

  isAllSelected(): boolean {
    return this.activeCards.length > 0 && this.activeCards.every(c => this.selected.has(c.id));
  }

  isIndeterminate(): boolean {
    const n = this.activeCards.filter(c => this.selected.has(c.id)).length;
    return n > 0 && n < this.activeCards.length;
  }

  toggleAll(): void {
    if (this.isAllSelected()) this.selected.clear();
    else this.activeCards.forEach(c => this.selected.add(c.id));
  }

  toggleOne(card: AdmitCardEntry): void {
    if (this.selected.has(card.id)) this.selected.delete(card.id);
    else this.selected.add(card.id);
  }

  get selectedCount(): number { return this.selected.size; }

  // ─── Print ─────────────────────────────────────────────────────────────────
  printSingle(card: AdmitCardEntry): void {
    this.router.navigate(['/admin/exams', this.examId, 'admit-cards', card.studentId._id]);
  }

  printAll(): void { this.doBulkPrint(this.activeCards); }

  printSelected(): void {
    const sel = this.activeCards.filter(c => this.selected.has(c.id));
    if (!sel.length) { this.notify.warn('Select at least one student first.'); return; }
    this.doBulkPrint(sel);
  }

  private doBulkPrint(entries: AdmitCardEntry[]): void {
    if (!entries.length) return;
    this.bulkPrinting = true;

    const calls = entries.map(e =>
      this.examSvc.getAdmitCardForPrint(e.studentId._id, this.examId).pipe(
        catchError(() => of(null)),
      ),
    );

    forkJoin(calls)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results: Array<ApiResponse<AdmitCardPrintPayload> | null>) => {
          const payloads = results
            .filter((r): r is ApiResponse<AdmitCardPrintPayload> => r != null && r.data != null)
            .map(r => r.data!);

          if (!payloads.length) {
            this.notify.error('No admit card data available.');
            this.bulkPrinting = false;
            return;
          }
          this.printViaIframe(payloads);
        },
        error: () => {
          this.notify.error('Failed to load admit card data for printing.');
          this.bulkPrinting = false;
        },
      });
  }

  // ─── Iframe print (bypasses Angular DOM; supports pagination) ─────────────
  private printViaIframe(cards: AdmitCardPrintPayload[]): void {
    const iframe = document.createElement('iframe');
    iframe.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { this.bulkPrinting = false; return; }

    doc.open();
    doc.write(this.buildPrintHtml(cards));
    doc.close();

    // Give images ~600 ms to load before triggering print
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        this.bulkPrinting = false;
      }, 1500);
    }, 600);
  }

  // ─── HTML builder ──────────────────────────────────────────────────────────
  private buildPrintHtml(cards: AdmitCardPrintPayload[]): string {
    const pagePairs: string[] = [];

    for (let i = 0; i < cards.length; i += 2) {
      const top    = cards[i];
      const bottom = cards[i + 1] ?? null;

      const topHtml    = this.buildCardHtml(top);
      const cutLine    = `<div class="cut-line"><span class="cut-text">✂&nbsp;&nbsp; CUT HERE &nbsp;&nbsp;✂</span></div>`;
      const bottomHtml = bottom
        ? `<div class="card-half">${this.buildCardHtml(bottom)}</div>`
        : `<div class="empty-half"></div>`;

      pagePairs.push(`
<div class="page-pair">
  <div class="card-half">${topHtml}</div>
  ${cutLine}
  ${bottomHtml}
</div>`);
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Admit Cards</title>
<style>${this.printCss()}</style>
</head>
<body>
${pagePairs.join('\n')}
</body>
</html>`;
  }

  private buildCardHtml(card: AdmitCardPrintPayload): string {
    const esc = (s: string | undefined | null) =>
      (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const fmtDate = (d: string | undefined) => {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const logoHtml   = card.institute.logoUrl
      ? `<img class="ac-logo" src="${esc(card.institute.logoUrl)}" alt="Logo" />`
      : '';
    const phoneHtml  = card.institute.phone
      ? `<p class="ac-inst-phone">Tel: ${esc(card.institute.phone)}</p>` : '';
    const photoHtml  = card.student.photo
      ? `<img class="ac-photo" src="${esc(card.student.photo)}" alt="${esc(card.student.name)}" />`
      : `<div class="ac-photo-placeholder">Photo</div>`;
    const dobRow     = card.student.dob
      ? `<tr><td class="ac-lbl">Date of Birth</td><td class="ac-val">${esc(fmtDate(card.student.dob))}</td></tr>` : '';
    const seatRow    = card.seatNo
      ? `<tr><td class="ac-lbl">Seat No.</td><td class="ac-val ac-val--roll">${esc(card.seatNo)}</td></tr>` : '';
    const sigHtml    = card.signatureUrl
      ? `<img class="ac-sig-img" src="${esc(card.signatureUrl)}" alt="Signature" />`
      : `<div class="ac-sig-line"></div>`;

    const schedRows = (card.schedule || []).map((r, i) => `
      <tr${i % 2 === 1 ? ' class="ac-row-alt"' : ''}>
        <td class="ac-sub-name">${esc(r.subject)}</td>
        <td class="ac-nowrap">${esc(r.examDate ? fmtDate(r.examDate) : '—')}</td>
        <td class="ac-nowrap">${esc(r.examTime || '—')}</td>
        <td class="ac-center">${r.maxMarks}</td>
        <td class="ac-center">${r.passingMarks}</td>
      </tr>`).join('');

    const defaultInstr = [
      'Bring this admit card to every examination session along with school photo ID.',
      'Be seated 15 minutes before the exam begins. Late entry is not permitted.',
      'Mobile phones and electronic devices are strictly prohibited in the examination hall.',
    ];
    const instrLines = card.exam.instructions
      ? card.exam.instructions.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      : defaultInstr;
    const instrHtml = instrLines.map(l => `<li>${esc(l)}</li>`).join('');

    return `<div class="ac-card">
  <div class="ac-header">
    ${logoHtml}
    <div class="ac-inst-text">
      <h1 class="ac-inst-name">${esc(card.institute.name)}</h1>
      <p class="ac-inst-addr">${esc(card.institute.address)}</p>
      ${phoneHtml}
    </div>
  </div>
  <div class="ac-title-bar">
    <span class="ac-title">ADMIT CARD</span>
    <span class="ac-exam-name">${esc(card.exam.name)}</span>
  </div>
  <div class="ac-student-row">
    <table class="ac-info-table"><tbody>
      <tr><td class="ac-lbl">Student Name</td><td class="ac-val ac-val--name">${esc(card.student.name)}</td></tr>
      <tr><td class="ac-lbl">Exam Roll No.</td><td class="ac-val ac-val--roll">${esc(card.rollNo)}</td></tr>
      <tr><td class="ac-lbl">Class / Section</td><td class="ac-val">${esc(card.student.class)}-${esc(card.student.section)}</td></tr>
      ${dobRow}
      <tr><td class="ac-lbl">Guardian Name</td><td class="ac-val">${esc(card.student.guardianName)}</td></tr>
      <tr><td class="ac-lbl">Exam Centre</td><td class="ac-val">${esc(card.center)}</td></tr>
      <tr><td class="ac-lbl">Issue Date</td><td class="ac-val">${esc(fmtDate(card.issuedDate))}</td></tr>
      ${seatRow}
    </tbody></table>
    <div class="ac-photo-box">
      ${photoHtml}
      <p class="ac-photo-lbl">Candidate's Photo</p>
    </div>
  </div>
  <div class="ac-schedule">
    <h3 class="ac-sec-title">Examination Schedule</h3>
    <table class="ac-sched-table">
      <thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Max</th><th>Pass</th></tr></thead>
      <tbody>${schedRows}</tbody>
    </table>
  </div>
  <div class="ac-instructions">
    <h3 class="ac-sec-title">Instructions to Candidates</h3>
    <ol class="ac-instr-list">${instrHtml}</ol>
  </div>
  <div class="ac-signatures">
    <div class="ac-sig"><div class="ac-sig-line"></div><p class="ac-sig-lbl">Student's Signature</p></div>
    <div class="ac-sig">${sigHtml}<p class="ac-sig-lbl">Controller of Examinations</p></div>
    <div class="ac-sig"><div class="ac-sig-line"></div><p class="ac-sig-lbl">Principal's Signature</p></div>
  </div>
</div>`;
  }

  private printCss(): string {
    return `
@page { size: A4 portrait; margin: 8mm 10mm; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: 'Times New Roman', Times, serif; color: #000; background: white; }

/* ── Page pair: 2 students per A4 ── */
.page-pair {
  display: flex; flex-direction: column;
  height: 277mm;            /* A4 297mm − 8mm top − 8mm bottom − 4mm buffer */
  page-break-inside: avoid; break-inside: avoid;
}
.page-pair + .page-pair { page-break-before: always; break-before: page; }

.card-half  { flex: 1; overflow: hidden; max-height: 134mm; display: flex; flex-direction: column; }
.empty-half { flex: 1; max-height: 134mm; }

.cut-line {
  display: flex; align-items: center; justify-content: center;
  border-top: 1px dashed #aaa; border-bottom: 1px dashed #aaa;
  padding: 3px 0; flex-shrink: 0; background: white;
}
.cut-text { font-size: 8pt; color: #888; background: white; padding: 0 12px; letter-spacing: 2px; white-space: nowrap; }

/* ── Admit card ── */
.ac-card {
  position: relative; background: #fff; border: 1px solid #000;
  font-family: 'Times New Roman', Times, serif; color: #000; font-size: 8.5pt;
  height: 100%; display: flex; flex-direction: column;
}
.ac-header { display: flex; align-items: center; gap: 10pt; padding: 5pt 12pt; border-bottom: 3px double #000; flex-shrink: 0; }
.ac-logo { width: 42pt; height: 42pt; object-fit: contain; flex-shrink: 0; }
.ac-inst-text { flex: 1; text-align: center; }
.ac-inst-name { font-size: 12pt; font-weight: 700; margin: 0 0 2pt; text-transform: uppercase; letter-spacing: 0.8px; }
.ac-inst-addr, .ac-inst-phone { font-size: 7.5pt; margin: 0; color: #333; line-height: 1.4; }

.ac-title-bar {
  display: flex; flex-direction: column; align-items: center;
  padding: 4pt 8pt; gap: 1pt; flex-shrink: 0;
  background: #1a237e; color: #fff;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.ac-title { font-size: 9pt; font-weight: 700; letter-spacing: 3pt; text-transform: uppercase; }
.ac-exam-name { font-size: 7.5pt; font-style: italic; }

.ac-student-row { display: flex; gap: 10pt; padding: 5pt 12pt; border-bottom: 1px solid #888; flex-shrink: 0; }
.ac-info-table { flex: 1; border-collapse: collapse; font-size: 7.5pt; }
.ac-info-table td { padding: 2pt 4pt; vertical-align: top; }
.ac-lbl { font-weight: 600; white-space: nowrap; width: 95pt; color: #333; }
.ac-lbl::after { content: ':'; }
.ac-val { color: #000; }
.ac-val--name { font-weight: 700; font-size: 8.5pt; }
.ac-val--roll { font-weight: 700; color: #1a237e; }

.ac-photo-box { width: 62pt; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 3pt; }
.ac-photo { width: 62pt; height: 76pt; object-fit: cover; border: 1px solid #888; display: block; }
.ac-photo-placeholder { width: 62pt; height: 76pt; border: 1px solid #888; display: flex; align-items: center; justify-content: center; color: #bbb; font-size: 7pt; font-style: italic; }
.ac-photo-lbl { font-size: 6pt; color: #555; text-align: center; margin: 0; }

.ac-schedule { padding: 4pt 12pt 3pt; flex-shrink: 0; }
.ac-sec-title { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 3pt; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 2pt; }
.ac-sched-table { width: 100%; border-collapse: collapse; font-size: 7pt; }
.ac-sched-table th, .ac-sched-table td { border: 1px solid #aaa; padding: 2pt 5pt; text-align: left; }
.ac-sched-table th {
  background: #1a237e; color: #fff; font-weight: 600; font-size: 6.5pt; text-transform: uppercase;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.ac-row-alt td { background: #f0f2ff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.ac-sub-name { min-width: 90pt; }
.ac-nowrap { white-space: nowrap; }
.ac-center { text-align: center; }

.ac-instructions { margin: 0 12pt 3pt; padding: 3pt 8pt; border: 1px solid #ccc; border-radius: 2pt; flex-shrink: 0; }
.ac-instr-list { margin: 3pt 0 0; padding: 0 0 0 14pt; font-size: 6.5pt; color: #333; line-height: 1.4; }
.ac-instr-list li + li { margin-top: 1pt; }

.ac-signatures { display: flex; justify-content: space-between; padding: 5pt 12pt 7pt; border-top: 1px solid #aaa; margin-top: auto; flex-shrink: 0; }
.ac-sig { display: flex; flex-direction: column; align-items: center; gap: 2pt; min-width: 90pt; }
.ac-sig-line { width: 90pt; height: 22pt; border-bottom: 1px solid #000; margin-bottom: 2pt; }
.ac-sig-img { max-width: 90pt; max-height: 22pt; object-fit: contain; }
.ac-sig-lbl { font-size: 6.5pt; color: #555; text-align: center; font-style: italic; margin: 0; }
`;
  }

  // ─── Revoke ────────────────────────────────────────────────────────────────
  revokeCard(card: AdmitCardEntry): void {
    const reason = prompt(`Reason for revoking ${card.studentId.name}'s admit card:`);
    if (!reason?.trim()) return;
    this.revokingId = card.id;
    this.examSvc.revokeAdmitCard(card.id, reason.trim())
      .pipe(takeUntil(this.destroy$), finalize(() => this.revokingId = ''))
      .subscribe({
        next: () => {
          this.notify.success(`Admit card revoked for ${card.studentId.name}.`);
          this.loadCards();
        },
      });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  goBack(): void { this.router.navigate(['/admin/exams']); }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
