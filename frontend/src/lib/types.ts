/** Tên role phải khớp enum Role bên backend. */
export type Role = "ADMIN" | "TEACHER" | "STUDENT";

/** Thông tin được phép đưa ra giao diện; không chứa passwordHash. */
export interface User {
  id: number;
  email: string;
  fullName: string;
  studentCode: string | null;
  role: Role;
  enabled: boolean;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export interface Lesson {
  id: number;
  title: string;
  content: string;
  position: number;
  published: boolean;
}

export interface CourseDetail {
  course: Course;
  lessons: Lesson[];
}

export interface Enrollment {
  id: number;
  courseId: number;
  studentId: number;
  email: string;
  fullName: string;
  studentCode: string | null;
}

/** Cấu trúc lỗi thống nhất của Spring API. */
export interface ErrorBody {
  code: string;
  message: string;
  fieldErrors: Record<string, string>;
}

export type AssignmentType = "QUIZ" | "ESSAY";
export type AssignmentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type SubmissionStatus = "SUBMITTED" | "GRADED" | "LATE";

export interface Assignment {
  id: number;
  courseId: number;
  title: string;
  description: string;
  type: AssignmentType;
  openAt: string | null;
  dueAt: string | null;
  maxScore: number;
  status: AssignmentStatus;
  createdAt: string;
  submissionCount?: number | null;
  mySubmitted?: boolean | null;
  myScore?: number | null;
  mySubmissionStatus?: SubmissionStatus | null;
}

export interface QuizOption {
  id: number;
  questionId: number;
  optionText: string;
  isCorrect?: boolean | null;
  position: number;
}

export interface QuizQuestion {
  id: number;
  assignmentId: number;
  questionText: string;
  points: number;
  position: number;
  options: QuizOption[];
}

export interface QuizAnswerDetail {
  questionId: number;
  questionText: string;
  points: number;
  selectedOptionId: number | null;
  selectedOptionText: string | null;
  correctOptionId: number | null;
  correctOptionText: string | null;
  isCorrect: boolean;
}

export interface Submission {
  id: number;
  assignmentId: number;
  studentId: number;
  studentName: string;
  studentEmail: string | null;
  studentCode: string | null;
  content: string | null;
  score: number | null;
  maxScore: number;
  feedback: string | null;
  status: SubmissionStatus;
  submittedAt: string;
  gradedAt: string | null;
  quizAnswers?: QuizAnswerDetail[] | null;
}

export interface Announcement {
  id: number;
  courseId: number;
  authorId: number;
  authorName: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface DiscussionPost {
  id: number;
  topicId: number;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface DiscussionTopic {
  id: number;
  courseId: number;
  authorId: number;
  authorName: string;
  title: string;
  content: string;
  createdAt: string;
  replyCount: number;
  posts?: DiscussionPost[];
}

export interface LessonProgress {
  lessonId: number;
  completed: boolean;
  completedAt: string | null;
}

export interface CourseProgress {
  courseId: number;
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  lessonProgress: LessonProgress[];
}

export interface SubmissionScoreView {
  submissionId: number;
  score: number | null;
  maxScore: number;
  status: SubmissionStatus;
  submittedAt: string;
}

export interface GradebookEntry {
  studentId: number;
  studentName: string;
  studentEmail: string | null;
  studentCode: string | null;
  scores: Record<number, SubmissionScoreView>;
}

export interface Gradebook {
  courseId: number;
  assignments: Assignment[];
  entries: GradebookEntry[];
}

export interface ScheduleItem {
  assignmentId: number;
  courseId: number;
  courseTitle: string;
  title: string;
  type: AssignmentType;
  openAt: string | null;
  dueAt: string | null;
  maxScore: number;
  submitted: boolean | null;
  score: number | null;
  status: SubmissionStatus | null;
}

export interface ScheduleView {
  upcoming: ScheduleItem[];
  past: ScheduleItem[];
}

