package vn.edu.lms.course;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.lms.auth.CurrentUserService;
import vn.edu.lms.course.CourseDtos.*;

@RestController
@RequestMapping("/api/v1/courses")
public class CourseController {
    private final CourseService courses;
    private final CurrentUserService currentUser;

    /** Controller chỉ nhận HTTP và gọi service; không chứa quy tắc quyền bản ghi. */
    public CourseController(CourseService courses, CurrentUserService currentUser) {
        this.courses = courses;
        this.currentUser = currentUser;
    }

    /** Liệt kê khóa người đang đăng nhập được phép thấy. */
    @GetMapping
    public List<CourseView> list(Authentication authentication) {
        return courses.list(currentUser.require(authentication));
    }

    /** Lấy chi tiết khóa và bài học đã qua lọc quyền. */
    @GetMapping("/{id}")
    public CourseDetail detail(@PathVariable Long id, Authentication authentication) {
        return courses.detail(id, currentUser.require(authentication));
    }

    /** Validate dữ liệu đầu vào rồi tạo khóa nháp cho giảng viên hiện tại. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CourseView create(@Valid @RequestBody CreateCourse request, Authentication authentication) {
        return courses.create(request, currentUser.require(authentication));
    }

    /** Cập nhật thông tin (tiêu đề, mô tả) của khóa học; chỉ chủ khóa được sửa. */
    @PutMapping("/{id}")
    public CourseView update(@PathVariable Long id, @Valid @RequestBody UpdateCourse request,
                             Authentication authentication) {
        return courses.update(id, request, currentUser.require(authentication));
    }

    /** Thay đổi trạng thái khóa học (DRAFT, PUBLISHED, ARCHIVED). */
    @PatchMapping("/{id}/status")
    public CourseView updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateCourseStatus request,
                                   Authentication authentication) {
        return courses.updateStatus(id, request, currentUser.require(authentication));
    }

    /** Xóa khóa học cùng các bài học và dữ liệu ghi danh. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        courses.delete(id, currentUser.require(authentication));
    }

    // ==================== QUẢN LÝ BÀI HỌC TRONG KHÓA ====================

    /** Thêm bài học mới vào khóa học; chỉ chủ khóa mới có quyền. */
    @PostMapping("/{courseId}/lessons")
    @ResponseStatus(HttpStatus.CREATED)
    public LessonView createLesson(@PathVariable Long courseId, @Valid @RequestBody CreateLesson request,
                                   Authentication authentication) {
        return courses.createLesson(courseId, request, currentUser.require(authentication));
    }

    /** Lấy chi tiết một bài học; sinh viên chỉ được xem bài đã công bố. */
    @GetMapping("/{courseId}/lessons/{lessonId}")
    public LessonView getLesson(@PathVariable Long courseId, @PathVariable Long lessonId,
                                Authentication authentication) {
        return courses.getLesson(courseId, lessonId, currentUser.require(authentication));
    }

    /** Cập nhật bài học; chỉ chủ khóa mới có quyền. */
    @PutMapping("/{courseId}/lessons/{lessonId}")
    public LessonView updateLesson(@PathVariable Long courseId, @PathVariable Long lessonId,
                                   @Valid @RequestBody UpdateLesson request,
                                   Authentication authentication) {
        return courses.updateLesson(courseId, lessonId, request, currentUser.require(authentication));
    }

    /** Xóa bài học khỏi khóa; chỉ chủ khóa mới có quyền. */
    @DeleteMapping("/{courseId}/lessons/{lessonId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLesson(@PathVariable Long courseId, @PathVariable Long lessonId,
                             Authentication authentication) {
        courses.deleteLesson(courseId, lessonId, currentUser.require(authentication));
    }
}
