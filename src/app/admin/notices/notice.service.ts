import { Injectable }             from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable }             from 'rxjs';
import { environment }            from '../../../environments/environment';
import { Notice, ApiResponse }    from '../../core/models';

export interface NoticeQuery {
  isPublished?: boolean;
  targetClass?: string;
  category?:   string;
  page?:       number;
  limit?:      number;
}

export interface NoticeCreatePayload {
  title:          string;
  content:        string;
  category?:      string;
  targetClass?:   string | null;
  isPublished?:   boolean;
  expiresAt?:     string | null;
  attachmentUrl?: string | null;
}

// ─── Institute info (for print header) ───────────────────────────────────────

export interface NoticeInstituteInfo {
  name:     string;
  address?: string;
  phone?:   string;
  logoUrl?: string;
}

// ─── Notice Templates ─────────────────────────────────────────────────────────

export interface NoticeTemplateField {
  key:          string;
  label:        string;
  type:         'text' | 'date' | 'textarea';
  placeholder?: string;
  required:     boolean;
}

export interface NoticeTemplate {
  id:           string;
  name:         string;
  category:     string;
  icon:         string;
  description:  string;
  fields:       NoticeTemplateField[];
  buildTitle:   (f: Record<string, string>) => string;
  buildContent: (f: Record<string, string>) => string;
}

export const NOTICE_TEMPLATES: NoticeTemplate[] = [
  {
    id: 'sports-day', name: 'Annual Sports Day', category: 'event', icon: 'sports_score',
    description: 'Sports day event with venue, time and chief guest details',
    fields: [
      { key: 'date',       label: 'Event Date',              type: 'date', required: true },
      { key: 'venue',      label: 'Venue',                   type: 'text', placeholder: 'School Ground', required: true },
      { key: 'startTime',  label: 'Start Time',              type: 'text', placeholder: '9:00 AM', required: true },
      { key: 'chiefGuest', label: 'Chief Guest (optional)',  type: 'text', placeholder: 'Name & Designation', required: false },
    ],
    buildTitle:   f => `Annual Sports Day — ${f['date'] || '___'}`,
    buildContent: f =>
`This is to inform all students, parents, and staff that the Annual Sports Day will be held on ${f['date'] || '___'} at ${f['venue'] || '___'}.

The programme will commence at ${f['startTime'] || '___'}. All students are required to report in their sports attire at least 30 minutes before the event.${f['chiefGuest'] ? `\n\nWe are honoured to have ${f['chiefGuest']} as our Chief Guest for the occasion.` : ''}

Parents and guardians are cordially invited to attend and encourage our talented students.

Students selected for events will receive their individual schedules from their class teachers. Your enthusiastic participation is earnestly solicited.`,
  },
  {
    id: 'ptm', name: 'Parent-Teacher Meeting', category: 'event', icon: 'groups',
    description: 'PTM notice with date, time, venue and optional class targeting',
    fields: [
      { key: 'date',        label: 'Meeting Date',             type: 'date', required: true },
      { key: 'time',        label: 'Start Time',               type: 'text', placeholder: '10:00 AM', required: true },
      { key: 'venue',       label: 'Venue',                    type: 'text', placeholder: 'School Hall', required: true },
      { key: 'targetClass', label: 'For Class (optional)',     type: 'text', placeholder: 'e.g. 10 — blank for all', required: false },
    ],
    buildTitle:   f => `Parent-Teacher Meeting — ${f['date'] || '___'}`,
    buildContent: f =>
`Dear Parents / Guardians,

A Parent-Teacher Meeting (PTM) has been scheduled on ${f['date'] || '___'} at ${f['time'] || '___'} in ${f['venue'] || '___'}.${f['targetClass'] ? `\n\nThis meeting is specifically arranged for parents of Class ${f['targetClass']} students.` : '\n\nAll parents are requested to attend.'}

The purpose of this meeting is to discuss your ward's academic performance, attendance, conduct, and overall development. Please bring your ward's progress reports if available.

Kindly ensure your punctual presence. We look forward to your valuable participation.`,
  },
  {
    id: 'exam-schedule', name: 'Examination Notice', category: 'exam', icon: 'assignment',
    description: 'Exam date sheet announcement with start and end dates',
    fields: [
      { key: 'examName',    label: 'Exam Name',   type: 'text', placeholder: 'e.g. Half-Yearly Examination', required: true },
      { key: 'targetClass', label: 'Class',       type: 'text', placeholder: 'e.g. 6 to 10', required: true },
      { key: 'startDate',   label: 'Start Date',  type: 'date', required: true },
      { key: 'endDate',     label: 'End Date',    type: 'date', required: true },
    ],
    buildTitle:   f => `${f['examName'] || 'Examination'} — Class ${f['targetClass'] || '___'}`,
    buildContent: f =>
`This is to notify all students and parents that the ${f['examName'] || 'Examination'} for Class ${f['targetClass'] || '___'} will commence from ${f['startDate'] || '___'} and conclude on ${f['endDate'] || '___'}.

Students are advised to:
• Collect the detailed date sheet from the school notice board or their class teacher.
• Carry their school identity card to every examination session.
• Report to the examination hall at least 15 minutes before the scheduled time.
• Mobile phones and electronic devices are strictly prohibited in the examination hall.

Wishing all students the very best for their examinations.`,
  },
  {
    id: 'result-day', name: 'Result Day Notice', category: 'exam', icon: 'emoji_events',
    description: 'Result declaration announcement with date, time and venue',
    fields: [
      { key: 'examName',    label: 'Exam Name',    type: 'text', placeholder: 'e.g. Annual Examination', required: true },
      { key: 'targetClass', label: 'Class',        type: 'text', placeholder: 'e.g. 1 to 12', required: true },
      { key: 'date',        label: 'Result Date',  type: 'date', required: true },
      { key: 'time',        label: 'Time',         type: 'text', placeholder: '10:00 AM', required: true },
    ],
    buildTitle:   f => `Result Declaration — ${f['examName'] || 'Examination'}`,
    buildContent: f =>
`This is to inform all students and parents that the results of the ${f['examName'] || 'Examination'} for Class ${f['targetClass'] || '___'} will be declared on ${f['date'] || '___'} at ${f['time'] || '___'}.

Students are required to be present along with their parents/guardians to collect their report cards. Report cards will not be issued in the student's absence.

Students with outstanding dues are requested to clear all payments before the result day.

The school management congratulates all students on completing their examinations and wishes them the best for their results.`,
  },
  {
    id: 'holiday', name: 'Holiday Notice', category: 'holiday', icon: 'beach_access',
    description: 'School holiday or vacation announcement with dates',
    fields: [
      { key: 'occasion',   label: 'Occasion',            type: 'text', placeholder: 'e.g. Diwali, Eid, Christmas', required: true },
      { key: 'fromDate',   label: 'From Date',           type: 'date', required: true },
      { key: 'toDate',     label: 'To Date (optional)',  type: 'date', required: false },
      { key: 'reopenDate', label: 'School Reopens On',  type: 'date', required: true },
    ],
    buildTitle:   f => `Holiday Notice — ${f['occasion'] || '___'}`,
    buildContent: f =>
`This is to inform all students, parents, and staff that the school will remain closed on account of ${f['occasion'] || '___'}.${f['toDate'] ? `\n\nHoliday Period: ${f['fromDate'] || '___'} to ${f['toDate']}` : `\n\nHoliday Date: ${f['fromDate'] || '___'}`}

School will resume normal activities from ${f['reopenDate'] || '___'}.

The school management wishes everyone a joyful and safe celebration. Students are advised to utilise this time productively and complete any pending assignments.

Any inconvenience caused is deeply regretted.`,
  },
  {
    id: 'school-reopening', name: 'School Reopening', category: 'general', icon: 'school',
    description: 'Reopening notice after vacation or extended closure',
    fields: [
      { key: 'vacationType',  label: 'Vacation / Closure Type', type: 'text', placeholder: 'e.g. Summer Vacation, Winter Break', required: true },
      { key: 'closureFrom',   label: 'Closed From',             type: 'date', required: true },
      { key: 'reopeningDate', label: 'Reopening Date',          type: 'date', required: true },
      { key: 'extraNote',     label: 'Additional Note (optional)', type: 'text', placeholder: 'e.g. New timetable effective', required: false },
    ],
    buildTitle:   f => `School Reopening — ${f['reopeningDate'] || '___'}`,
    buildContent: f =>
`This is to inform all students, parents, and staff that the school will reopen on ${f['reopeningDate'] || '___'} after the ${f['vacationType'] || '___'} (closed from ${f['closureFrom'] || '___'}).

All students are expected to attend school in proper uniform on the reopening day. Students are advised to:
• Complete all pending assignments and holiday homework.
• Bring their school diary and required textbooks.
• Report at regular school timing.${f['extraNote'] ? `\n\nPlease Note: ${f['extraNote']}` : ''}

Parents are requested to ensure their ward's punctual attendance from the first day.`,
  },
  {
    id: 'fee-reminder', name: 'Fee Payment Reminder', category: 'fee', icon: 'receipt_long',
    description: 'Fee due date reminder with late fine information',
    fields: [
      { key: 'feeType',      label: 'Fee Type',                   type: 'text', placeholder: 'e.g. Tuition Fee, Annual Fee', required: true },
      { key: 'academicYear', label: 'Academic Year',              type: 'text', placeholder: 'e.g. 2025-26', required: true },
      { key: 'lastDate',     label: 'Last Date for Payment',      type: 'date', required: true },
      { key: 'lateFine',     label: 'Late Fine (optional)',       type: 'text', placeholder: 'e.g. ₹10 per day', required: false },
    ],
    buildTitle:   f => `Fee Payment Reminder — ${f['feeType'] || '___'}`,
    buildContent: f =>
`This is a reminder to all parents that the ${f['feeType'] || '___'} for the academic year ${f['academicYear'] || '___'} is now due.

Last Date for Payment: ${f['lastDate'] || '___'}${f['lateFine'] ? `\n\nPlease note that a late fine of ${f['lateFine']} will be charged after the due date.` : ''}

Fee can be paid at the school accounts office during working hours (Monday–Saturday, 9:00 AM–1:00 PM). Online payment through the school portal is also accepted.

Students with outstanding dues may be restricted from accessing certain school services. Kindly ensure timely payment to avoid inconvenience. For genuine hardship cases, please contact the school office.`,
  },
  {
    id: 'national-day', name: 'National Day Celebration', category: 'event', icon: 'flag',
    description: 'Republic Day, Independence Day or similar national celebration',
    fields: [
      { key: 'occasion',  label: 'Occasion',     type: 'text', placeholder: 'e.g. Republic Day, Independence Day', required: true },
      { key: 'date',      label: 'Date',         type: 'date', required: true },
      { key: 'venue',     label: 'Venue',        type: 'text', placeholder: 'School Ground', required: true },
      { key: 'startTime', label: 'Start Time',   type: 'text', placeholder: '8:00 AM', required: true },
    ],
    buildTitle:   f => `${f['occasion'] || 'National Day'} Celebration — ${f['date'] || '___'}`,
    buildContent: f =>
`This is to inform all students, staff, and parents that the school will celebrate ${f['occasion'] || '___'} on ${f['date'] || '___'} at ${f['venue'] || '___'}.

The programme will begin at ${f['startTime'] || '___'}. Attendance for all students and teaching staff is compulsory.

Students are requested to:
• Arrive at least 15 minutes before the programme begins.
• Report in full school uniform with proper grooming.

Parents wishing to attend are most welcome. Let us come together to honour this significant occasion with pride and patriotism.`,
  },
  {
    id: 'school-trip', name: 'Educational Trip / Picnic', category: 'event', icon: 'directions_bus',
    description: 'School excursion or picnic with destination and logistics',
    fields: [
      { key: 'destination',   label: 'Destination',           type: 'text', placeholder: 'e.g. Science Museum, Delhi', required: true },
      { key: 'targetClass',   label: 'Class',                 type: 'text', placeholder: 'e.g. 6 and 7', required: true },
      { key: 'date',          label: 'Trip Date',             type: 'date', required: true },
      { key: 'departureTime', label: 'Departure Time',        type: 'text', placeholder: '7:00 AM from school', required: true },
      { key: 'returnTime',    label: 'Expected Return Time',  type: 'text', placeholder: '4:00 PM approx.', required: true },
      { key: 'amount',        label: 'Trip Fee (optional)',   type: 'text', placeholder: 'e.g. ₹300 per student', required: false },
    ],
    buildTitle:   f => `Educational Trip — ${f['destination'] || '___'}`,
    buildContent: f =>
`This is to inform parents and guardians of Class ${f['targetClass'] || '___'} that the school has organised an Educational Trip to ${f['destination'] || '___'} on ${f['date'] || '___'}.

Departure: ${f['departureTime'] || '___'}
Expected Return: ${f['returnTime'] || '___'}${f['amount'] ? `\nTrip Fee: ${f['amount']}` : ''}

Students are required to:
• Submit the signed consent form to their class teacher before the last date.
• Carry their school identity card, packed lunch, and water bottle.
• Report at the assembly point in school uniform.
• Maintain discipline and follow all instructions from accompanying staff.

Students without a signed consent form will not be permitted to participate.`,
  },
  {
    id: 'meeting-notice', name: 'School / Staff Meeting', category: 'general', icon: 'meeting_room',
    description: 'Staff or general meeting with agenda details',
    fields: [
      { key: 'meetingType', label: 'Meeting Type',  type: 'text', placeholder: 'e.g. Staff Meeting, PTA Meeting', required: true },
      { key: 'date',        label: 'Date',          type: 'date', required: true },
      { key: 'time',        label: 'Time',          type: 'text', placeholder: '11:00 AM', required: true },
      { key: 'venue',       label: 'Venue',         type: 'text', placeholder: 'Conference Room', required: true },
      { key: 'agenda',      label: 'Agenda (optional)', type: 'textarea', placeholder: 'e.g.\n• Review of term results\n• Curriculum planning', required: false },
    ],
    buildTitle:   f => `${f['meetingType'] || 'Meeting'} Notice — ${f['date'] || '___'}`,
    buildContent: f =>
`This is to inform all concerned that a ${f['meetingType'] || 'Meeting'} has been scheduled on ${f['date'] || '___'} at ${f['time'] || '___'} in ${f['venue'] || '___'}.

Attendance is mandatory for all members concerned. Please ensure punctuality.${f['agenda'] ? `\n\nAgenda:\n${f['agenda']}` : ''}

Kindly keep this notice for reference. For any queries, please contact the school office.`,
  },
  {
    id: 'prize-day', name: 'Prize Distribution Ceremony', category: 'event', icon: 'workspace_premium',
    description: 'Annual prize day with chief guest and dress code',
    fields: [
      { key: 'date',       label: 'Date',                    type: 'date', required: true },
      { key: 'time',       label: 'Time',                    type: 'text', placeholder: '10:00 AM', required: true },
      { key: 'venue',      label: 'Venue',                   type: 'text', placeholder: 'School Auditorium', required: true },
      { key: 'chiefGuest', label: 'Chief Guest (optional)',  type: 'text', placeholder: 'Name & Designation', required: false },
    ],
    buildTitle:   f => `Annual Prize Distribution Ceremony — ${f['date'] || '___'}`,
    buildContent: f =>
`It is with great pleasure that we announce the Annual Prize Distribution Ceremony to be held on ${f['date'] || '___'} at ${f['time'] || '___'} in ${f['venue'] || '___'}.${f['chiefGuest'] ? `\n\nWe are privileged to have ${f['chiefGuest']} as the Chief Guest for this prestigious event.` : ''}

The ceremony will felicitate students who have excelled in academics, sports, and co-curricular activities during the academic year. All students and staff are required to attend.

Dress Code: School Formal Uniform

Parents of award-winning students will be notified separately. We request everyone to be seated before the programme commences on time.`,
  },
  {
    id: 'emergency-closure', name: 'Urgent: School Closure', category: 'urgent', icon: 'report_problem',
    description: 'Emergency or unexpected closure with reason and reopening date',
    fields: [
      { key: 'date',          label: 'Closure Date(s)',  type: 'text', placeholder: 'e.g. 18 May 2026 or 18–20 May 2026', required: true },
      { key: 'reason',        label: 'Reason',          type: 'text', placeholder: 'e.g. heavy rainfall, power outage', required: true },
      { key: 'reopeningDate', label: 'Reopening Date',  type: 'date', required: true },
    ],
    buildTitle:   f => `URGENT: School Closed — ${f['date'] || '___'}`,
    buildContent: f =>
`URGENT NOTICE

This is to inform all students, parents, and staff that the school will remain closed on ${f['date'] || '___'} due to ${f['reason'] || '___'}.

School will reopen on ${f['reopeningDate'] || '___'}. All pending classes, tests, and activities scheduled during this period will be rescheduled and communicated separately.

Students are advised to stay safe and follow all safety guidelines. Parents are requested to ensure their ward's safety during this period.

We regret the inconvenience caused and appreciate your understanding and cooperation.`,
  },
];

export const NOTICE_CATEGORIES = [
  { value: 'general', label: 'General',  icon: 'campaign'      },
  { value: 'exam',    label: 'Exam',     icon: 'assignment'     },
  { value: 'holiday', label: 'Holiday',  icon: 'beach_access'   },
  { value: 'fee',     label: 'Fee',      icon: 'receipt_long'   },
  { value: 'event',   label: 'Event',    icon: 'event'          },
  { value: 'urgent',  label: 'Urgent',   icon: 'priority_high'  },
];

export const CATEGORY_EMOJI: Record<string, string> = {
  general: '📢', exam: '📝', holiday: '🏖️',
  fee: '💰', event: '🎉', urgent: '🚨',
};

@Injectable({ providedIn: 'root' })
export class NoticeService {

  private readonly base = `${environment.apiUrl}/notices`;

  constructor(private http: HttpClient) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  getNotices(q: NoticeQuery = {}): Observable<ApiResponse<Notice[]>> {
    let p = new HttpParams();
    if (q.isPublished !== undefined) p = p.set('isPublished', String(q.isPublished));
    if (q.targetClass) p = p.set('targetClass', q.targetClass);
    if (q.category)    p = p.set('category',    q.category);
    p = p.set('page',  String(q.page  ?? 1));
    p = p.set('limit', String(q.limit ?? 20));
    return this.http.get<ApiResponse<Notice[]>>(this.base, { params: p });
  }

  getNotice(id: string): Observable<ApiResponse<Notice>> {
    return this.http.get<ApiResponse<Notice>>(`${this.base}/${id}`);
  }

  /** Published non-expired notices for notice board */
  getBoard(targetClass?: string): Observable<ApiResponse<Notice[]>> {
    let p = new HttpParams();
    if (targetClass) p = p.set('targetClass', targetClass);
    return this.http.get<ApiResponse<Notice[]>>(`${this.base}/board`, { params: p });
  }

  createNotice(payload: NoticeCreatePayload): Observable<ApiResponse<Notice>> {
    return this.http.post<ApiResponse<Notice>>(this.base, payload);
  }

  updateNotice(id: string, payload: Partial<NoticeCreatePayload>): Observable<ApiResponse<Notice>> {
    return this.http.put<ApiResponse<Notice>>(`${this.base}/${id}`, payload);
  }

  publishNotice(id: string): Observable<ApiResponse<Notice>> {
    return this.http.put<ApiResponse<Notice>>(`${this.base}/${id}/publish`, {});
  }

  unpublishNotice(id: string): Observable<ApiResponse<Notice>> {
    return this.http.put<ApiResponse<Notice>>(`${this.base}/${id}/unpublish`, {});
  }

  deleteNotice(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.base}/${id}`);
  }

  getStats(): Observable<{ success: boolean; data: any; institute: NoticeInstituteInfo | null }> {
    return this.http.get<{ success: boolean; data: any; institute: NoticeInstituteInfo | null }>(`${this.base}/stats`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  categoryEmoji(cat: string): string {
    return CATEGORY_EMOJI[cat] ?? '📢';
  }

  categoryLabel(cat: string): string {
    return NOTICE_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
  }

  categoryIcon(cat: string): string {
    return NOTICE_CATEGORIES.find(c => c.value === cat)?.icon ?? 'campaign';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
}
