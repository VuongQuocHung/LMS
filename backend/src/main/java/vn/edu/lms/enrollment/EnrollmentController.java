package vn.edu.lms.enrollment;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.lms.auth.CurrentUserService;
import vn.edu.lms.enrollment.EnrollmentDtos.*;

@RestController
@RequestMapping("/api/v1/courses/{courseId}/enrollments")
public class EnrollmentController {
    private final EnrollmentService enrollmentService;
    private final CurrentUserService currentUser;

    public EnrollmentController(EnrollmentService enrollmentService, CurrentUserService currentUser) {
        this.enrollmentService = enrollmentService;
        this.currentUser = currentUser;
    }

    /** Lấy danh sách sinh viên ghi danh trong một khóa học. */
    @GetMapping
    public List<EnrollmentView> list(@PathVariable Long courseId, Authentication authentication) {
        return enrollmentService.list(courseId, currentUser.require(authentication));
    }

    /** Ghi danh một sinh viên vào khóa học. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EnrollmentView enroll(@PathVariable Long courseId, @Valid @RequestBody EnrollRequest request,
                                 Authentication authentication) {
        return enrollmentService.enroll(courseId, request, currentUser.require(authentication));
    }

    /** Hủy ghi danh sinh viên khỏi khóa học. */
    @DeleteMapping("/{studentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unenroll(@PathVariable Long courseId, @PathVariable Long studentId,
                         Authentication authentication) {
        enrollmentService.unenroll(courseId, studentId, currentUser.require(authentication));
    }
}
