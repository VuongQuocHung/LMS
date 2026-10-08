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
}
