import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Subject }                    from 'rxjs';
import { takeUntil, finalize }        from 'rxjs/operators';

import {
  NoticeService, NoticeCreatePayload, NoticeTemplate, NoticeInstituteInfo,
  NOTICE_CATEGORIES, NOTICE_TEMPLATES,
} from './notice.service';
import { NotificationService } from '../../core/services/notification.service';
import { Notice }              from '../../core/models';

type PanelMode = 'list' | 'create' | 'edit' | 'template';

@Component({
  selector:    'app-notices',
  templateUrl: './notices.component.html',
  styleUrls:   ['./notices.component.scss'],
})
export class NoticesComponent implements OnInit, OnDestroy {

  notices:     Notice[] = [];
  loading      = false;
  saving       = false;
  deletingId   = '';
  actioningId  = '';

  panelMode:   PanelMode = 'list';
  editingId    = '';

  form!: FormGroup;
  categories = NOTICE_CATEGORIES;

  showDrafts    = true;
  showPublished = true;

  // ── Institute info (for print header) ─────────────────────────────────────
  instituteInfo: NoticeInstituteInfo | null = null;

  // ── Template gallery ───────────────────────────────────────────────────────
  templates              = NOTICE_TEMPLATES;
  selectedTemplate:      NoticeTemplate | null = null;
  templateForm!:         FormGroup;
  templateCategoryFilter = '';
  previewTitle           = '';
  previewContent         = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb:        FormBuilder,
    private noticeSvc: NoticeService,
    private notify:    NotificationService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadNotices();
    this.loadInstituteInfo();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private buildForm(): void {
    this.form = this.fb.group({
      title:         ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      content:       ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
      category:      ['general'],
      targetClass:   [null],
      isPublished:   [false],
      expiresAt:     [null],
      attachmentUrl: [null, Validators.pattern(/^https?:\/\/.+/)],
    });
  }

  loadNotices(): void {
    this.loading = true;
    this.noticeSvc.getNotices({ limit: 50 })
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({ next: res => this.notices = res.data || [] });
  }

  private loadInstituteInfo(): void {
    this.noticeSvc.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: res => { this.instituteInfo = res.institute ?? null; } });
  }

  // ── Panel navigation ───────────────────────────────────────────────────────
  openCreate(): void {
    this.form.reset({ category: 'general', isPublished: false });
    this.editingId = '';
    this.panelMode = 'create';
  }

  openEdit(notice: Notice): void {
    this.editingId = notice._id;
    this.form.patchValue({
      title:         notice.title,
      content:       notice.content,
      category:      (notice as any).category || 'general',
      targetClass:   notice.targetClass || null,
      isPublished:   notice.isPublished,
      expiresAt:     (notice as any).expiresAt || null,
      attachmentUrl: (notice as any).attachmentUrl || null,
    });
    this.panelMode = 'edit';
  }

  cancelEdit(): void {
    this.panelMode = 'list';
    this.editingId = '';
    this.form.reset();
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;

    const v = this.form.value;
    const payload: NoticeCreatePayload = {
      title:         v.title.trim(),
      content:       v.content.trim(),
      category:      v.category,
      targetClass:   v.targetClass || null,
      isPublished:   v.isPublished ?? false,
      expiresAt:     v.expiresAt ? new Date(v.expiresAt).toISOString() : null,
      attachmentUrl: v.attachmentUrl?.trim() || null,
    };

    const call = this.editingId
      ? this.noticeSvc.updateNotice(this.editingId, payload)
      : this.noticeSvc.createNotice(payload);

    call.pipe(finalize(() => this.saving = false), takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          const action = this.editingId ? 'updated' : (v.isPublished ? 'published' : 'saved as draft');
          this.notify.success(`"${res.data?.title}" ${action}.`);
          this.panelMode = 'list';
          this.editingId = '';
          this.loadNotices();
        },
      });
  }

  // ── Quick actions ──────────────────────────────────────────────────────────
  publish(notice: Notice, event: Event): void {
    event.stopPropagation();
    this.actioningId = notice._id;
    this.noticeSvc.publishNotice(notice._id)
      .pipe(finalize(() => this.actioningId = ''), takeUntil(this.destroy$))
      .subscribe({ next: () => { this.notify.success(`"${notice.title}" is now live.`); this.loadNotices(); } });
  }

  unpublish(notice: Notice, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Unpublish "${notice.title}"?`)) return;
    this.actioningId = notice._id;
    this.noticeSvc.unpublishNotice(notice._id)
      .pipe(finalize(() => this.actioningId = ''), takeUntil(this.destroy$))
      .subscribe({ next: () => { this.notify.warn(`"${notice.title}" unpublished.`); this.loadNotices(); } });
  }

  delete(notice: Notice, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Permanently delete "${notice.title}"?`)) return;
    this.deletingId = notice._id;
    this.noticeSvc.deleteNotice(notice._id)
      .pipe(finalize(() => this.deletingId = ''), takeUntil(this.destroy$))
      .subscribe({ next: () => { this.notify.success('Notice deleted.'); this.loadNotices(); } });
  }

  // ── Template gallery ───────────────────────────────────────────────────────
  openTemplateGallery(): void {
    this.selectedTemplate        = null;
    this.templateCategoryFilter  = '';
    this.previewTitle            = '';
    this.previewContent          = '';
    this.panelMode               = 'template';
  }

  backToList(): void {
    this.panelMode        = 'list';
    this.selectedTemplate = null;
  }

  backToGallery(): void {
    this.selectedTemplate = null;
    this.previewTitle     = '';
    this.previewContent   = '';
  }

  selectTemplate(t: NoticeTemplate): void {
    this.selectedTemplate = t;
    this.buildTemplateForm(t);
    this.updatePreview();
  }

  private buildTemplateForm(t: NoticeTemplate): void {
    const controls: Record<string, FormControl> = {};
    t.fields.forEach(f => {
      controls[f.key] = new FormControl(null, f.required ? Validators.required : []);
    });
    this.templateForm = this.fb.group(controls);
    this.templateForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updatePreview());
  }

  updatePreview(): void {
    if (!this.selectedTemplate) return;
    const raw = this.templateForm?.value ?? {};
    const f: Record<string, string> = {};

    this.selectedTemplate.fields.forEach(field => {
      const val = raw[field.key];
      if (field.type === 'date' && val) {
        const d = val instanceof Date ? val : new Date(val);
        f[field.key] = isNaN(d.getTime()) ? '' :
          d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      } else {
        f[field.key] = val ?? '';
      }
    });

    this.previewTitle   = this.selectedTemplate.buildTitle(f);
    this.previewContent = this.selectedTemplate.buildContent(f);
  }

  applyTemplate(): void {
    if (!this.selectedTemplate) return;
    if (this.templateForm.invalid) { this.templateForm.markAllAsTouched(); return; }

    this.form.reset({ category: 'general', isPublished: false });
    this.form.patchValue({
      title:    this.previewTitle,
      content:  this.previewContent,
      category: this.selectedTemplate.category,
    });
    this.editingId = '';
    this.panelMode = 'create';
  }

  get filteredTemplates(): NoticeTemplate[] {
    return this.templates.filter(t =>
      !this.templateCategoryFilter || t.category === this.templateCategoryFilter,
    );
  }

  // ── Print ──────────────────────────────────────────────────────────────────
  printNotice(notice: Notice, event: Event): void {
    event.stopPropagation();
    this.doPrint({
      title:     notice.title,
      content:   notice.content,
      category:  (notice as any).category || 'general',
      date:      new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
      expiresAt: (notice as any).expiresAt,
    });
  }

  printForm(): void {
    const v = this.form.value;
    if (!v.title || !v.content) { this.notify.warn('Fill in the title and content before printing.'); return; }
    this.doPrint({
      title:     v.title,
      content:   v.content,
      category:  v.category || 'general',
      date:      new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
      expiresAt: v.expiresAt,
    });
  }

  private doPrint(data: { title: string; content: string; category: string; date: string; expiresAt?: any }): void {
    const iframe = document.createElement('iframe');
    iframe.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(this.buildNoticeHtml(data));
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1500);
    }, 400);
  }

  private buildNoticeHtml(data: {
    title: string; content: string; category: string; date: string; expiresAt?: any;
  }): string {
    const esc = (s: string) =>
      (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const inst = this.instituteInfo;
    const catLabel = this.categories.find(c => c.value === data.category)?.label ?? 'General';

    const logoHtml = inst?.logoUrl
      ? `<img class="inst-logo" src="${esc(inst.logoUrl)}" alt="Logo" />`
      : '';

    const headerHtml = inst
      ? `<div class="notice-header">
          ${logoHtml}
          <div class="inst-name">${esc(inst.name)}</div>
          ${inst.address ? `<div class="inst-sub">${esc(inst.address)}</div>` : ''}
          ${inst.phone ? `<div class="inst-sub">Phone: ${esc(inst.phone)}</div>` : ''}
        </div>`
      : '<div class="notice-header"><div class="inst-name">[ Institute Name ]</div></div>';

    const expiryHtml = data.expiresAt
      ? `<div class="footer">This notice is valid until ${esc(new Date(data.expiresAt)
          .toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }))}</div>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${esc(data.title)}</title>
<style>${this.noticePrintCss()}</style>
</head>
<body>
<div class="notice-wrap">
  ${headerHtml}
  <div class="notice-meta">
    <span>Ref. No.: _____________</span>
    <span>Date: ${esc(data.date)}</span>
  </div>
  <div class="notice-tag">&mdash;&nbsp;${esc(catLabel)} Notice&nbsp;&mdash;</div>
  <h1 class="notice-title">${esc(data.title)}</h1>
  <div class="notice-body">${esc(data.content)}</div>
  <div class="notice-sig">
    <div class="sig-line"></div>
    <p class="sig-name">Principal</p>
  </div>
  ${expiryHtml}
</div>
</body>
</html>`;
  }

  private noticePrintCss(): string {
    return `
@page { size: A4 portrait; margin: 18mm 20mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
body { margin: 0; padding: 0; font-family: 'Times New Roman', Times, serif; color: #000; }
.notice-wrap { border: 2px solid #000; padding: 14mm 14mm; min-height: 257mm; display: flex; flex-direction: column; }
.notice-header {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; border-bottom: 3px double #000;
  padding-bottom: 6mm; margin-bottom: 6mm; gap: 2mm;
}
.inst-logo { max-height: 18mm; max-width: 40mm; object-fit: contain; margin-bottom: 2mm; }
.inst-name { font-size: 16pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1.2; }
.inst-sub  { font-size: 9pt; color: #333; margin: 0; line-height: 1.4; }
.notice-meta { display: flex; justify-content: space-between; font-size: 9pt; margin-bottom: 8mm; }
.notice-tag { text-align: center; font-size: 9pt; color: #555; font-style: italic; letter-spacing: 2px; margin-bottom: 4mm; }
.notice-title { text-align: center; font-size: 13pt; font-weight: 700; text-transform: uppercase; margin: 0 0 10mm; letter-spacing: 0.5px; }
.notice-body { font-size: 11pt; line-height: 1.9; white-space: pre-wrap; text-align: justify; flex: 1; }
.notice-sig { margin-top: 16mm; text-align: right; }
.sig-line { width: 55mm; border-top: 1px solid #000; margin-left: auto; margin-bottom: 3pt; }
.sig-name { font-size: 10pt; margin: 0; font-style: italic; }
.footer { margin-top: 8mm; padding-top: 4mm; border-top: 1px dashed #aaa; text-align: center; font-size: 8pt; color: #555; }
`;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  get filteredNotices(): Notice[] {
    return this.notices.filter(n => {
      if (!this.showDrafts     && !n.isPublished) return false;
      if (!this.showPublished  &&  n.isPublished) return false;
      return true;
    });
  }

  emoji(cat: string)  { return this.noticeSvc.categoryEmoji(cat); }
  cLabel(cat: string) { return this.noticeSvc.categoryLabel(cat); }
  fmt(d: string)      { return this.noticeSvc.formatDate(d); }

  get charCount(): number { return this.form.get('content')?.value?.length ?? 0; }
  get pageTitle(): string { return this.panelMode === 'edit' ? 'Edit Notice' : 'New Notice'; }

  trackById(_: number, n: Notice): string { return n._id; }
}
