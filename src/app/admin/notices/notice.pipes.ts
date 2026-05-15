import { Pipe, PipeTransform } from '@angular/core';
import { Notice }              from '../../core/models';

/** Extracts the category from a Notice (stored as (notice as any).category) */
@Pipe({ name: 'noticeCategory' })
export class NoticeCategoryPipe implements PipeTransform {
  transform(notice: Notice): string { return (notice as any).category ?? 'general'; }
}

/** Extracts publishedAt date */
@Pipe({ name: 'noticePublishedAt' })
export class NoticePublishedAtPipe implements PipeTransform {
  transform(notice: Notice): string | null { return (notice as any).publishedAt ?? null; }
}

/** Extracts attachmentUrl */
@Pipe({ name: 'noticeAttachment' })
export class NoticeAttachmentPipe implements PipeTransform {
  transform(notice: Notice): string | null { return (notice as any).attachmentUrl ?? null; }
}

/** Count notices by status in template */
@Pipe({ name: 'noticeCount' })
export class NoticeCountPipe implements PipeTransform {
  transform(notices: Notice[], status: 'draft' | 'published'): number {
    if (status === 'draft')     return notices.filter(n => !n.isPublished).length;
    if (status === 'published') return notices.filter(n =>  n.isPublished).length;
    return notices.length;
  }
}
