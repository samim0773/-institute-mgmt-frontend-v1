import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject }                    from 'rxjs';
import { takeUntil, finalize }        from 'rxjs/operators';

import {
  NoticeService, NoticeCreatePayload, NOTICE_CATEGORIES,
} from './notice.service';
import { NotificationService } from '../../core/services/notification.service';
import { Notice }              from '../../core/models';

type PanelMode = 'list' | 'create' | 'edit';

@Component({
  selector:    'app-notices',
  templateUrl: './notices.component.html',
  styleUrls:   ['./notices.component.scss'],
})
export class NoticesComponent implements OnInit, OnDestroy {

  notices:     Notice[] = [];
  loading      = true;
  saving       = false;
  deletingId   = '';
  actioningId  = '';   // notice currently being published/unpublished

  panelMode:   PanelMode = 'list';
  editingId    = '';

  form!: FormGroup;
  categories = NOTICE_CATEGORIES;

  // Filter
  showDrafts   = true;
  showPublished= true;

  private destroy$ = new Subject<void>();

  constructor(
    private fb:          FormBuilder,
    private noticeSvc:   NoticeService,
    private notify:      NotificationService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadNotices();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private buildForm(): void {
    this.form = this.fb.group({
      title:        ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      content:      ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
      category:     ['general'],
      targetClass:  [null],
      isPublished:  [false],
      expiresAt:    [null],
      attachmentUrl:[null, Validators.pattern(/^https?:\/\/.+/)],
    });
  }

  loadNotices(): void {
    this.loading = true;
    this.noticeSvc.getNotices({ limit: 50 })
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({ next: res => this.notices = res.data || [] });
  }

  // ── Panel navigation ───────────────────────────────────────────────────────
  openCreate(): void {
    this.form.reset({ category: 'general', isPublished: false });
    this.editingId  = '';
    this.panelMode  = 'create';
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
      title:          v.title.trim(),
      content:        v.content.trim(),
      category:       v.category,
      targetClass:    v.targetClass || null,
      isPublished:    v.isPublished ?? false,
      expiresAt:      v.expiresAt ? new Date(v.expiresAt).toISOString() : null,
      attachmentUrl:  v.attachmentUrl?.trim() || null,
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
      .subscribe({
        next: () => { this.notify.success(`"${notice.title}" is now live.`); this.loadNotices(); },
      });
  }

  unpublish(notice: Notice, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Unpublish "${notice.title}"? Teachers will no longer see it.`)) return;
    this.actioningId = notice._id;
    this.noticeSvc.unpublishNotice(notice._id)
      .pipe(finalize(() => this.actioningId = ''), takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.notify.warn(`"${notice.title}" unpublished.`); this.loadNotices(); },
      });
  }

  delete(notice: Notice, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Permanently delete "${notice.title}"?`)) return;
    this.deletingId = notice._id;
    this.noticeSvc.deleteNotice(notice._id)
      .pipe(finalize(() => this.deletingId = ''), takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.notify.success('Notice deleted.'); this.loadNotices(); },
      });
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
