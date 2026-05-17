import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl }                  from '@angular/forms';
import { Router }                       from '@angular/router';
import { Subject }                      from 'rxjs';
import { takeUntil, finalize }          from 'rxjs/operators';

import { FeeService, Bill, ClassBillsResponse } from './fee.service';
import { StudentService }                        from '../students/student.service';

@Component({
  selector:    'app-fee-bulk-print',
  templateUrl: './fee-bulk-print.component.html',
  styleUrls:   ['./fee-bulk-print.component.scss'],
})
export class FeeBulkPrintComponent implements OnInit, OnDestroy {

  classFilter   = new FormControl('');
  sectionFilter = new FormControl('');
  statusFilter  = new FormControl('');

  classNames: string[] = [];
  sections:   string[] = [];

  bills:     Bill[] = [];
  institute: ClassBillsResponse['institute'] = null;
  loading    = false;
  printing   = false;
  printedAt  = new Date();

  readonly STATUS_OPTS = [
    { value: '',        label: 'All Statuses' },
    { value: 'pending', label: 'Pending Only' },
    { value: 'partial', label: 'Partial Only' },
    { value: 'paid',    label: 'Paid Only'    },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private feeSvc:     FeeService,
    private studentSvc: StudentService,
    private router:     Router,
  ) {}

  ngOnInit(): void {
    this.studentSvc.getClassNames().pipe(takeUntil(this.destroy$))
      .subscribe(res => { this.classNames = res.data || []; });
    this.studentSvc.getClasses().pipe(takeUntil(this.destroy$)).subscribe();

    this.classFilter.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(cls => {
      this.sectionFilter.setValue('', { emitEvent: false });
      this.sections   = cls ? this.studentSvc.getSectionsForClass(cls) : [];
      this.bills      = [];
      this.institute  = null;
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    const cls = this.classFilter.value;
    const sec = this.sectionFilter.value;
    if (!cls || !sec) return;

    this.loading = true;
    this.bills   = [];
    this.feeSvc.getClassBills(cls, sec, { status: this.statusFilter.value || undefined })
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.bills     = res.data    || [];
          this.institute = res.institute;
        },
      });
  }

  print(): void {
    if (!this.bills.length) return;
    this.printing   = true;
    this.printedAt  = new Date();
    this.printViaIframe(this.bills);
  }

  // ── Iframe print (bypasses Angular DOM; supports A4 pagination) ──────────────
  private printViaIframe(bills: Bill[]): void {
    const iframe = document.createElement('iframe');
    iframe.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { this.printing = false; return; }

    doc.open();
    doc.write(this.buildPrintHtml(bills));
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        this.printing = false;
      }, 1500);
    }, 600);
  }

  private buildPrintHtml(bills: Bill[]): string {
    const pagePairs: string[] = [];
    const inst = this.institute;

    for (let i = 0; i < bills.length; i += 2) {
      const top    = bills[i];
      const bottom = bills[i + 1] ?? null;
      const cutLine = `<div class="cut-line"><span class="cut-text">✂&nbsp;&nbsp; CUT HERE &nbsp;&nbsp;✂</span></div>`;
      const bottomHtml = bottom
        ? `<div class="card-half">${this.buildSlipHtml(bottom, inst)}</div>`
        : `<div class="empty-half"></div>`;

      pagePairs.push(`
<div class="page-pair">
  <div class="card-half">${this.buildSlipHtml(top, inst)}</div>
  ${cutLine}
  ${bottomHtml}
</div>`);
    }

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Fee Slips</title>
<style>${this.slipPrintCss()}</style>
</head>
<body>${pagePairs.join('\n')}</body>
</html>`;
  }

  private buildSlipHtml(bill: Bill, inst: ClassBillsResponse['institute']): string {
    const esc = (s: string | number | undefined | null) =>
      String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const fmtAmt = (n: number) => '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

    const fmtDate = (d: string | Date | undefined) => {
      if (!d) return '&mdash;';
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const shortId   = bill.billId ? String(bill.billId).slice(-8).toUpperCase() : '&mdash;';
    const hasWaiver = (bill.feeBreakdown ?? []).some(f => (f.waivedAmount ?? 0) > 0);
    const totWaived = (bill.feeBreakdown ?? []).reduce((s, f) => s + (f.waivedAmount ?? 0), 0);

    const logoHtml  = inst?.logoUrl  ? `<img class="slip-logo" src="${esc(inst.logoUrl)}" alt="Logo" />` : '';
    const addrHtml  = inst?.address  ? `<p class="slip-inst-addr">${esc(inst.address)}</p>` : '';
    const phoneHtml = inst?.phone    ? `<p class="slip-inst-phone">Tel: ${esc(inst.phone)}</p>` : '';

    const waivedTh   = hasWaiver ? `<th class="col-waived">Waived</th>` : '';
    const waivedFoot = hasWaiver ? `<td class="col-waived total-cell">${esc(fmtAmt(totWaived))}</td>` : '';

    const statusLabel = (s: string) =>
      ({ pending: 'Pending', partial: 'Partial', paid: 'Paid', waived: 'Waived' } as Record<string, string>)[s] ?? s;

    const feeRows = (bill.feeBreakdown ?? []).map((item, i) => {
      const rowCls    = item.status === 'paid' ? 'row-paid' : item.status === 'waived' ? 'row-waived' : '';
      const waivedTd  = hasWaiver ? `<td class="col-waived">${esc(fmtAmt(item.waivedAmount ?? 0))}</td>` : '';
      const balCls    = item.amountDue > 0 ? 'col-bal bal-due' : 'col-bal';
      return `<tr class="${rowCls}">
        <td class="col-no">${i + 1}</td>
        <td class="col-type">${esc(item.feeType)}</td>
        <td class="col-amt">${esc(fmtAmt(item.amount))}</td>
        <td class="col-paid">${esc(fmtAmt(item.amountPaid))}</td>
        ${waivedTd}
        <td class="${balCls}">${esc(fmtAmt(item.amountDue))}</td>
        <td class="col-status"><span class="status-chip chip-${item.status}">${esc(statusLabel(item.status))}</span></td>
      </tr>`;
    }).join('');

    const fineRow = (bill.totalLateFine ?? 0) > 0 ? `
      <tr class="fine-row">
        <td colspan="4" class="fine-label">Late Fine (${esc(String(bill.lateFinePerDay))}/day)</td>
        <td class="col-bal fine-amt">${esc(fmtAmt(bill.totalLateFine!))}</td>
        <td></td>
      </tr>` : '';

    const overallStatus = bill.overallStatus ?? '';
    const showStamp = ['paid', 'partial', 'waived'].includes(overallStatus);
    const stampText = overallStatus === 'paid' ? 'PAID' : overallStatus === 'waived' ? 'WAIVED' : 'PARTIAL';
    const stampHtml = showStamp
      ? `<div class="stamp-area"><div class="stamp stamp-${overallStatus}">${stampText}</div></div>` : '';

    const notesHtml = bill.notes
      ? `<div class="slip-notes"><span class="notes-label">Note:</span> ${esc(bill.notes)}</div>` : '';

    const totalDueCls = (bill.totalDue ?? 0) > 0 ? 'col-bal total-cell bal-due' : 'col-bal total-cell';
    const issueDt = this.printedAt.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    return `<div class="slip-doc">
  <div class="slip-header">
    ${logoHtml}
    <div class="slip-inst-text">
      <h1 class="slip-inst-name">${esc(inst?.name || 'Institute')}</h1>
      ${addrHtml}${phoneHtml}
    </div>
  </div>
  <div class="slip-title-bar">
    <span class="slip-title">FEE RECEIPT</span>
    <span class="slip-ref">Ref: #${shortId}</span>
  </div>
  <div class="slip-info-grid">
    <table class="info-table"><tbody>
      <tr>
        <td class="info-lbl">Student Name</td>
        <td class="info-val info-val--name">${esc(bill.student.name)}</td>
        <td class="info-lbl">Roll No.</td>
        <td class="info-val info-val--roll">${esc(bill.student.rollNo)}</td>
      </tr>
      <tr>
        <td class="info-lbl">Class / Section</td>
        <td class="info-val">${esc(bill.student.class)}-${esc(bill.student.section)}</td>
        <td class="info-lbl">Admission No.</td>
        <td class="info-val">${esc(bill.student.admissionNo || '&mdash;')}</td>
      </tr>
      <tr>
        <td class="info-lbl">Academic Year</td>
        <td class="info-val">${esc(bill.academicYear || '&mdash;')}</td>
        <td class="info-lbl">Due Date</td>
        <td class="info-val${bill.isOverdue ? ' info-val--overdue' : ''}">
          ${fmtDate(bill.dueDate)}${bill.isOverdue ? ' <span class="overdue-tag">OVERDUE</span>' : ''}
        </td>
      </tr>
      <tr>
        <td class="info-lbl">Issue Date</td>
        <td class="info-val">${esc(issueDt)}</td>
        <td class="info-lbl">Bill ID</td>
        <td class="info-val info-val--mono">#${shortId}</td>
      </tr>
    </tbody></table>
  </div>
  <table class="fee-table">
    <thead>
      <tr>
        <th class="col-no">#</th>
        <th class="col-type">Fee Type</th>
        <th class="col-amt">Amount</th>
        <th class="col-paid">Paid</th>
        ${waivedTh}
        <th class="col-bal">Balance</th>
        <th class="col-status">Status</th>
      </tr>
    </thead>
    <tbody>${feeRows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="2" class="total-label">TOTAL</td>
        <td class="col-amt total-cell">${esc(fmtAmt(bill.totalAmount))}</td>
        <td class="col-paid total-cell">${esc(fmtAmt(bill.totalPaid))}</td>
        ${waivedFoot}
        <td class="${totalDueCls}">${esc(fmtAmt(bill.totalDue))}</td>
        <td class="col-status"><span class="status-chip chip-${overallStatus}">${esc(statusLabel(overallStatus))}</span></td>
      </tr>
      ${fineRow}
    </tfoot>
  </table>
  ${notesHtml}
  ${stampHtml}
  <div class="sig-row">
    <div class="sig-block"><div class="sig-line"></div><span class="sig-label">Parent / Guardian Signature</span></div>
    <div class="sig-block"><div class="sig-line"></div><span class="sig-label">Authorised Signatory</span></div>
  </div>
</div>`;
  }

  private slipPrintCss(): string {
    return `
@page { size: A4 portrait; margin: 8mm 10mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #000; background: white; }

.page-pair {
  display: flex; flex-direction: column;
  height: 277mm;
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
.cut-text { font-size: 8pt; color: #888; padding: 0 12px; letter-spacing: 2px; white-space: nowrap; }

.slip-doc {
  background: #fff; border: 1px solid #bbb; padding: 7pt 10pt 6pt;
  font-size: 7.5pt; color: #1a1a1a; height: 100%; display: flex; flex-direction: column;
}

.slip-header { display: flex; align-items: center; gap: 10pt; border-bottom: 2px solid #1565c0; padding-bottom: 5pt; margin-bottom: 4pt; flex-shrink: 0; }
.slip-logo   { width: 38pt; height: 38pt; object-fit: contain; flex-shrink: 0; }
.slip-inst-text { flex: 1; text-align: center; }
.slip-inst-name  { font-size: 10pt; font-weight: 700; margin: 0 0 1pt; color: #1565c0; text-transform: uppercase; }
.slip-inst-addr, .slip-inst-phone { font-size: 6.5pt; color: #555; margin: 1pt 0 0; }

.slip-title-bar { display: flex; justify-content: space-between; align-items: center; background: #1565c0; color: #fff; padding: 3pt 8pt; margin-bottom: 4pt; border-radius: 2pt; flex-shrink: 0; }
.slip-title { font-size: 8.5pt; font-weight: 700; letter-spacing: 2px; }
.slip-ref   { font-size: 7pt; opacity: 0.85; font-family: monospace; }

.slip-info-grid { margin-bottom: 4pt; flex-shrink: 0; }
.info-table { width: 100%; border-collapse: collapse; font-size: 7pt; }
.info-table td { padding: 2pt 4pt; border: 1px solid #e0e0e0; vertical-align: middle; }
.info-lbl { font-weight: 600; color: #555; width: 16%; white-space: nowrap; background: #f8f9fa; }
.info-val { width: 34%; }
.info-val--name { font-weight: 600; }
.info-val--roll { font-weight: 600; font-family: monospace; }
.info-val--mono { font-family: monospace; font-size: 6.5pt; }
.info-val--overdue { color: #c62828; font-weight: 600; }
.overdue-tag { display: inline-block; background: #c62828; color: #fff; font-size: 5.5pt; font-weight: 700; padding: 1pt 3pt; border-radius: 2pt; margin-left: 3pt; vertical-align: middle; }

.fee-table { width: 100%; border-collapse: collapse; font-size: 7pt; margin-bottom: 4pt; flex-shrink: 0; }
.fee-table th, .fee-table td { border: 1px solid #ddd; padding: 2pt 4pt; }
.fee-table thead th { background: #1565c0; color: #fff; font-weight: 600; text-align: center; white-space: nowrap; font-size: 6.5pt; }
.fee-table tbody tr:nth-child(even) { background: #fafafa; }

.col-no { width: 4%; text-align: center; }
.col-type { width: 30%; }
.col-amt, .col-paid, .col-waived, .col-bal { width: 12%; text-align: right; }
.col-status { width: 14%; text-align: center; }

.row-paid   { color: #2e7d32; }
.row-waived { color: #6a1b9a; }
.bal-due    { color: #c62828; font-weight: 700; }

.status-chip { display: inline-block; font-size: 5.5pt; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; padding: 1pt 3pt; border-radius: 2pt; }
.chip-pending { background: #fff3e0; color: #e65100; border: 1px solid #ffb74d; }
.chip-partial { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }
.chip-paid    { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
.chip-waived  { background: #f3e5f5; color: #6a1b9a; border: 1px solid #ce93d8; }

.total-row { background: #f0f4ff; font-weight: 700; }
.total-row td { border-top: 2px solid #1565c0; }
.total-label { font-weight: 700; font-size: 7.5pt; }
.total-cell  { text-align: right; }
.fine-row   { background: #fff8e1; }
.fine-label { color: #e65100; font-style: italic; }
.fine-amt   { text-align: right; color: #c62828; font-weight: 700; }

.slip-notes { font-size: 6.5pt; color: #555; border: 1px dashed #bdbdbd; border-radius: 2pt; padding: 2pt 5pt; margin-bottom: 4pt; background: #fffde7; flex-shrink: 0; }
.notes-label { font-weight: 700; }

.stamp-area { display: flex; justify-content: flex-end; margin-bottom: 3pt; flex-shrink: 0; }
.stamp { font-size: 14pt; font-weight: 900; letter-spacing: 3px; padding: 2pt 10pt; border-radius: 3pt; border-width: 2px; border-style: solid; opacity: 0.7; transform: rotate(-8deg); }
.stamp-paid    { color: #2e7d32; border-color: #2e7d32; }
.stamp-partial { color: #1565c0; border-color: #1565c0; }
.stamp-waived  { color: #6a1b9a; border-color: #6a1b9a; }

.sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-top: 4pt; border-top: 1px solid #e0e0e0; flex-shrink: 0; }
.sig-block { display: flex; flex-direction: column; align-items: center; gap: 2pt; width: 42%; }
.sig-line  { width: 100%; border-bottom: 1px solid #555; height: 18pt; }
.sig-label { font-size: 6pt; color: #555; text-align: center; letter-spacing: 0.5px; }
`;
  }

  goBack(): void { this.router.navigate(['/admin/fees']); }

  // ── Per-bill helpers ─────────────────────────────────────────────────────────
  hasWaiver(bill: Bill): boolean {
    return (bill.feeBreakdown ?? []).some(f => (f.waivedAmount ?? 0) > 0);
  }

  totalWaived(bill: Bill): number {
    return (bill.feeBreakdown ?? []).reduce((s, f) => s + (f.waivedAmount ?? 0), 0);
  }

  shortId(bill: Bill): string {
    return bill.billId ? String(bill.billId).slice(-8).toUpperCase() : '—';
  }

  // ── Format helpers ───────────────────────────────────────────────────────────
  fmt(n: number): string {
    return '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  formatDate(d: string | Date | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDatetime(d: Date): string {
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  statusLabel(s: string): string {
    return { pending: 'Pending', partial: 'Partial', paid: 'Paid', waived: 'Waived' }[s] ?? s;
  }

  trackByBillId(_: number, b: Bill): any { return b.billId ?? b.student._id; }
}
