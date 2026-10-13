"use client";

import Link from "next/link";
import type { Course } from "@/lib/types";

// Nhãn trạng thái dùng chung cho cả chế độ thẻ và danh sách.
const STATUS_LABELS = { DRAFT: "Bản nháp", PUBLISHED: "Đã công bố", ARCHIVED: "Lưu trữ" };

interface CourseCardProps {
  course: Course;
  selected?: boolean;
  onOpen?: (id: number) => void;
}

/** Hiển thị một khóa thật từ API; ảnh bìa được vẽ bằng CSS để không cần upload. */
export default function CourseCard({ course, selected, onOpen }: CourseCardProps) {
  // ID quyết định mẫu bìa ổn định: lọc/sắp xếp không làm đổi màu của khóa.
  const coverIndex = (((course.id - 1) % 8) + 8) % 8;

  function handleClick() {
    if (onOpen) {
      onOpen(course.id);
    }
  }

  return (
    <article className={`course-card${selected ? " course-card-selected" : ""}`}>
      <Link
        href={`/courses/${course.id}`}
        className={`course-cover cover-${coverIndex}`}
        onClick={handleClick}
        aria-label={`Mở khóa học ${course.title}`}
      >
        <span className="cover-open" aria-hidden="true">
          ↗
        </span>
      </Link>
      <div className="course-body">
        <h2 className="course-title">
          <Link href={`/courses/${course.id}`} onClick={handleClick}>
            {course.title}
          </Link>
        </h2>
        <p className="course-description">{course.description || "Chưa có mô tả khóa học."}</p>
        <div className="course-card-footer">
          <span className={`course-status status-${course.status.toLowerCase()}`}>
            {STATUS_LABELS[course.status]}
          </span>
          <Link
            href={`/courses/${course.id}`}
            className="text-button"
            onClick={handleClick}
          >
            {selected ? "Đang xem" : "Vào học"} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
