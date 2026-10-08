package vn.edu.lms.course;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.lms.common.ApiException;
import vn.edu.lms.enrollment.EnrollmentRepository;
import vn.edu.lms.user.*;
import vn.edu.lms.course.CourseDtos.*;

@Service
@Transactional(readOnly = true)
public class CourseService {
    private final CourseRepository courses;
    private final LessonRepository lessons;
    private final EnrollmentRepository enrollments;

    /** Nhận repository để xử lý quyền và dữ liệu trong cùng tầng nghiệp vụ. */
    public CourseService(CourseRepository courses, LessonRepository lessons, EnrollmentRepository enrollments) {
        this.courses = courses;
        this.lessons = lessons;
        this.enrollments = enrollments;
    }

    /** Trả danh sách khác nhau theo vai trò; admin quản lý tài khoản ở màn hình riêng. */
    public List<CourseView> list(UserAccount user) {
        List<Course> visible;
        if (user.getRole() == Role.TEACHER) {
            visible = courses.findByTeacherIdOrderByIdDesc(user.getId());
        } else if (user.getRole() == Role.STUDENT) {
            visible = courses.findVisibleToStudent(user.getId());
        } else {
            throw forbidden();
        }
        return visible.stream().map(CourseView::from).toList();
    }

    /** Kiểm tra quyền bản ghi trước khi trả nội dung, không chỉ kiểm tra role. */
    public CourseDetail detail(Long id, UserAccount user) {
        Course course = courses.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học."));
        boolean owner = user.getRole() == Role.TEACHER && course.getTeacherId().equals(user.getId());
        boolean enrolled = user.getRole() == Role.STUDENT
                && course.getStatus() == CourseStatus.PUBLISHED
                && enrollments.existsByCourseIdAndStudentId(id, user.getId());
        if (!owner && !enrolled) {
            throw forbidden();
        }
        List<LessonView> visibleLessons = lessons.findByCourseIdOrderByPositionAscIdAsc(id).stream()
                .filter(lesson -> owner || lesson.isPublished())
                .map(LessonView::from).toList();
        return new CourseDetail(CourseView.from(course), visibleLessons);
    }

    /** Tạo khóa nháp; công bố/chỉnh sửa sẽ triển khai ở bước CRUD tiếp theo. */
    @Transactional
    public CourseView create(CreateCourse request, UserAccount teacher) {
        if (teacher.getRole() != Role.TEACHER) {
            throw forbidden();
        }
        Course course = new Course(teacher.getId(), request.title().trim(),
                request.description().trim(), CourseStatus.DRAFT);
        return CourseView.from(courses.save(course));
    }

    /** Dùng cùng thông báo cho các trường hợp không đủ quyền trên khóa. */
    private ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền truy cập khóa học này.");
    }
}
