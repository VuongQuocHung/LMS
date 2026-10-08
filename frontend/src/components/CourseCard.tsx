"use client";

import type { Course } from "@/lib/types";

// Nhãn trạng thái dùng chung cho cả chế độ thẻ và danh sách.
const STATUS_LABELS = { DRAFT: "Bản nháp", PUBLISHED: "Đã công bố", ARCHIVED: "Lưu trữ" };

interface CourseCardProps {
  course: Course;
  selected: boolean;
  onOpen: (id: number) => void;
}

/** Hiển thị một khóa thật từ API; ảnh bìa được vẽ bằng CSS để không cần upload. */
export default function CourseCard({ course, selected, onOpen }: CourseCardProps) {
  // ID quyết định mẫu bìa ổn định: lọc/sắp xếp không làm đổi màu của khóa.
  const coverIndex = ((course.id - 1) % 8 + 8) % 8;

  return (
    <article className={`course-card${selected ? " course-card-selected" : ""}`}>
      <button className={`course-cover cover-${coverIndex}`} onClick={() => onOpen(course.id)}
        aria-label={`Mở khóa học ${course.title}`} aria-controls="course-detail">
        <span className="cover-open" aria-hidden="true">↗</span>
      </button>
      <div className="course-body">
        <h2 className="course-title">
          <button onClick={() => onOpen(course.id)} aria-controls="course-detail">{course.title}</button>
        </h2>
        <p className="course-description">{course.description || "Chưa có mô tả khóa học."}</p>
        <div className="course-card-footer">
          <span className={`course-status status-${course.status.toLowerCase()}`}>{STATUS_LABELS[course.status]}</span>
          <button className="text-button" onClick={() => onOpen(course.id)} aria-controls="course-detail">
            {selected ? "Đang xem" : "Vào học"} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </article>
  );
}
