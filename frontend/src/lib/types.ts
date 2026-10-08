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

/** Cấu trúc lỗi thống nhất của Spring API. */
export interface ErrorBody {
  code: string;
  message: string;
  fieldErrors: Record<string, string>;
}
