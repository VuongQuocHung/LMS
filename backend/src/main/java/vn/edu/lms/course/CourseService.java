package vn.edu.lms.course;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.lms.common.ApiException;
import vn.edu.lms.course.CourseDtos.*;
import vn.edu.lms.enrollment.EnrollmentRepository;
import vn.edu.lms.user.*;

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
        Course course = getCourseOrThrow(id);
        boolean owner = isCourseOwner(course, user);
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

    /** Tạo khóa nháp; chủ sở hữu lấy từ session của giảng viên. */
    @Transactional
    public CourseView create(CreateCourse request, UserAccount teacher) {
        requireTeacherRole(teacher);
        Course course = new Course(teacher.getId(), request.title().trim(),
                request.description().trim(), CourseStatus.DRAFT);
        return CourseView.from(courses.save(course));
    }

    /** Cập nhật tên và mô tả khóa học; chỉ chủ khóa mới được chỉnh sửa. */
    @Transactional
    public CourseView update(Long id, UpdateCourse request, UserAccount teacher) {
        Course course = getCourseOrThrow(id);
        requireCourseOwner(course, teacher);
        course.setTitle(request.title().trim());
        course.setDescription(request.description().trim());
        return CourseView.from(course);
    }

    /** Cập nhật trạng thái khóa học (DRAFT -> PUBLISHED -> ARCHIVED). */
    @Transactional
    public CourseView updateStatus(Long id, UpdateCourseStatus request, UserAccount teacher) {
        Course course = getCourseOrThrow(id);
        requireCourseOwner(course, teacher);
        course.setStatus(request.status());
        return CourseView.from(course);
    }

    /** Xóa khóa học cùng toàn bộ bài học và ghi danh liên quan. */
    @Transactional
    public void delete(Long id, UserAccount teacher) {
        Course course = getCourseOrThrow(id);
        requireCourseOwner(course, teacher);
        lessons.deleteByCourseId(id);
        enrollments.deleteByCourseId(id);
        courses.delete(course);
    }

    /** Tạo bài học mới trong khóa; chỉ chủ khóa mới có quyền. */
    @Transactional
    public LessonView createLesson(Long courseId, CreateLesson request, UserAccount teacher) {
        Course course = getCourseOrThrow(courseId);
        requireCourseOwner(course, teacher);
        Lesson lesson = new Lesson(
                courseId,
                request.title().trim(),
                request.content().trim(),
                request.position(),
                request.published()
        );
        return LessonView.from(lessons.save(lesson));
    }

    /** Lấy chi tiết một bài học; sinh viên chỉ được xem bài đã công bố. */
    public LessonView getLesson(Long courseId, Long lessonId, UserAccount user) {
        Course course = getCourseOrThrow(courseId);
        boolean owner = isCourseOwner(course, user);
        boolean enrolled = user.getRole() == Role.STUDENT
                && course.getStatus() == CourseStatus.PUBLISHED
                && enrollments.existsByCourseIdAndStudentId(courseId, user.getId());
        if (!owner && !enrolled) {
            throw forbidden();
        }
        Lesson lesson = lessons.findByIdAndCourseId(lessonId, courseId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Không tìm thấy bài học trong khóa này."));

        if (!owner && !lesson.isPublished()) {
            throw forbidden();
        }
        return LessonView.from(lesson);
    }

    /** Cập nhật bài học; chỉ chủ khóa mới có quyền. */
    @Transactional
    public LessonView updateLesson(Long courseId, Long lessonId, UpdateLesson request, UserAccount teacher) {
        Course course = getCourseOrThrow(courseId);
        requireCourseOwner(course, teacher);
        Lesson lesson = lessons.findByIdAndCourseId(lessonId, courseId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Không tìm thấy bài học trong khóa này."));
        lesson.setTitle(request.title().trim());
        lesson.setContent(request.content().trim());
        lesson.setPosition(request.position());
        lesson.setPublished(request.published());
        return LessonView.from(lesson);
    }

    /** Xóa một bài học khỏi khóa; chỉ chủ khóa mới có quyền. */
    @Transactional
    public void deleteLesson(Long courseId, Long lessonId, UserAccount teacher) {
        Course course = getCourseOrThrow(courseId);
        requireCourseOwner(course, teacher);
        Lesson lesson = lessons.findByIdAndCourseId(lessonId, courseId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Không tìm thấy bài học trong khóa này."));
        lessons.delete(lesson);
    }

    private Course getCourseOrThrow(Long id) {
        return courses.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học."));
    }

    private boolean isCourseOwner(Course course, UserAccount user) {
        return user.getRole() == Role.TEACHER && course.getTeacherId().equals(user.getId());
    }

    private void requireCourseOwner(Course course, UserAccount user) {
        if (!isCourseOwner(course, user)) {
            throw forbidden();
        }
    }

    private void requireTeacherRole(UserAccount teacher) {
        if (teacher.getRole() != Role.TEACHER) {
            throw forbidden();
        }
    }

    /** Dùng cùng thông báo cho các trường hợp không đủ quyền trên khóa. */
    private ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền truy cập khóa học này.");
    }
}
