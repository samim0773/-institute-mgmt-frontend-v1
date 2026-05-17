// ─── Auth / User ──────────────────────────────────────────────────────────────
export type UserRole = 'super_admin' | 'admin' | 'teacher';

export interface HomeroomClass {
  classSectionId: string;
  className:      string;
  section:        string;
  academicYear:   string;
  displayName:    string;
}

export interface SubjectAssignmentEntry {
  className:    string;
  section:      string;
  academicYear: string;
  subjectName:  string;
  displayName:  string;
}

export interface AuthUser {
  _id:                string;
  name:               string;
  email:              string;
  role:               UserRole;
  instituteId:        string;
  subject?:           string;
  isActive?:          boolean;
  lastLoginAt?:       string;
  homeroomClasses?:   HomeroomClass[];
  subjectAssignments?: SubjectAssignmentEntry[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

// ─── Institute ────────────────────────────────────────────────────────────────
export interface Institute {
  _id:          string;
  name:         string;
  code:         string;
  address:      string;
  contactEmail: string;
  contactPhone?: string;
  plan?:        string;
  isActive:     boolean;
  createdAt:    string;
  updatedAt?:   string;
}

// ─── Student ──────────────────────────────────────────────────────────────────
export interface Student {
  _id: string;
  instituteId: string;
  name: string;
  rollNo: string;
  class: string;
  section: string;
  dob?: string;
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
  photo?: string;
  bloodGroup: string;
  gender: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Exam ─────────────────────────────────────────────────────────────────────
export interface ExamSubject {
  name:              string;
  maxMarks:          number;
  passingMarks?:     number;
  writtenMaxMarks?:  number;
  oralMaxMarks?:     number;
  oralPassingMarks?: number;
  examDate?:         string;
  examTime?:         string;
}

export interface Exam {
  _id:           string;
  instituteId:   string;
  name:          string;
  class:         string;
  section:       string;
  academicYear?: string;
  startDate:     string;
  endDate:       string;
  subjects:      ExamSubject[];
  status: 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'results_published';
  center:        string;
  admitCardCount?: number;
  createdAt:     string;
}

// ─── Admit Card ───────────────────────────────────────────────────────────────
export interface AdmitCard {
  _id: string;
  instituteId: string;
  examId: Exam;
  studentId: Student;
  rollNo: string;
  center: string;
  issuedDate: string;
}

// ─── Marks ────────────────────────────────────────────────────────────────────
export interface Marks {
  _id: string;
  instituteId: string;
  examId: string;
  studentId: Student | string;
  subjectName: string;
  teacherId: string;
  marksObtained: number;
  maxMarks: number;
  enteredAt: string;
}

// ─── Result ───────────────────────────────────────────────────────────────────
export interface ResultSubject {
  subjectName: string;
  marksObtained: number;
  maxMarks: number;
}

export interface Result {
  _id: string;
  instituteId: string;
  examId: Exam | string;
  studentId: Student | string;
  subjects: ResultSubject[];
  totalMarks: number;
  maxTotalMarks: number;
  percentage: number;
  grade: string;
  isPassed: boolean;
  publishedAt?: string;
}

// ─── Fee ──────────────────────────────────────────────────────────────────────
export interface PaymentEntry {
  _id?: string;
  amount: number;
  date: string;
  mode: 'cash' | 'cheque' | 'upi' | 'bank_transfer' | 'other';
 referenceNo?: string;
  note?: string;
}

export interface Fee {
  _id: string;
  instituteId: string;
  studentId: Student | string;
  feeType: string;
  amount: number;
  dueDate: string;
  payments: PaymentEntry[];
  status: 'paid' | 'pending' | 'partial' | 'waived';
  referenceNo: string;
  createdAt: string;
}

// ─── Notice ───────────────────────────────────────────────────────────────────
export interface Notice {
  _id: string;
  instituteId: string;
  title: string;
  content: string;
  postedBy: AuthUser | string;
  targetClass?: string;
  isPublished: boolean;
  createdAt: string;
}

// ─── API response wrapper ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
}
