package vn.edu.lms.course;

import jakarta.validation.constraints.*;
import java.util.List;

/** Gom DTO của chức năng khóa học trong một file để dễ tìm khi đọc base. */
public final class CourseDtos {
    private CourseDtos() {}

    /** Chỉ nhận nội dung người dùng nhập; chủ khóa luôn lấy từ session. */
    public record CreateCourse(
            @NotBlank(message = "Tên khóa học không được trống.")
            @Size(max = 150, message = "Tên khóa học tối đa 150 ký tự.") String title,
            @NotNull(message = "Cần truyền mô tả.")
            @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự.") String description) {}

    /** Dữ liệu gọn cho thẻ khóa học. */
    public record CourseView(Long id, String title, String description, CourseStatus status) {
        /** Chuyển entity sang DTO, tránh trả toàn bộ entity ra mạng. */
        public static CourseView from(Course course) {
            return new CourseView(course.getId(), course.getTitle(), course.getDescription(), course.getStatus());
        }
    }

    /** Bài nháp chỉ được gửi cho giảng viên sở hữu. */
    public record LessonView(Long id, String title, String content, int position, boolean published) {
        /** Chuyển bài học thành dữ liệu hiển thị. */
        public static LessonView from(Lesson lesson) {
            return new LessonView(lesson.getId(), lesson.getTitle(), lesson.getContent(),
                    lesson.getPosition(), lesson.isPublished());
        }
    }

    /** Trả khóa và các bài được phép đọc trong cùng một response. */
    public record CourseDetail(CourseView course, List<LessonView> lessons) {}
}
