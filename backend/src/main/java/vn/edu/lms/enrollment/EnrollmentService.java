package vn.edu.lms.enrollment;

import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.lms.common.ApiException;
import vn.edu.lms.course.Course;
import vn.edu.lms.course.CourseRepository;
import vn.edu.lms.course.CourseStatus;
import vn.edu.lms.enrollment.EnrollmentDtos.*;
import vn.edu.lms.user.Role;
import vn.edu.lms.user.UserAccount;
import vn.edu.lms.user.UserRepository;

@Service
@Transactional(readOnly = true)
public class EnrollmentService {
    private final EnrollmentRepository enrollments;
    private final CourseRepository courses;
    private final UserRepository users;

    public EnrollmentService(EnrollmentRepository enrollments, CourseRepository courses, UserRepository users) {
        this.enrollments = enrollments;
        this.courses = courses;
        this.users = users;
    }

    /** Lấy danh sách sinh viên ghi danh trong khóa; chỉ chủ khóa hoặc admin được xem. */
    public List<EnrollmentView> list(Long courseId, UserAccount user) {
        Course course = getCourseOrThrow(courseId);
        requireOwnerOrAdmin(course, user);

        List<Enrollment> list = enrollments.findByCourseIdOrderByIdDesc(courseId);
        List<EnrollmentView> views = new ArrayList<>();
        for (Enrollment enrollment : list) {
            users.findById(enrollment.getStudentId()).ifPresent(student ->
                    views.add(EnrollmentView.from(enrollment, student)));
        }
        return views;
    }

    /** Ghi danh sinh viên vào khóa học; database có ràng buộc unique ngăn ghi danh trùng. */
    @Transactional
    public EnrollmentView enroll(Long courseId, EnrollRequest request, UserAccount user) {
        Course course = getCourseOrThrow(courseId);
        requireOwnerOrAdmin(course, user);

        if (course.getStatus() == CourseStatus.ARCHIVED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "COURSE_ARCHIVED", "Không thể ghi danh vào khóa học đã lưu trữ.");
        }

        UserAccount student = findStudent(request);
        if (student.getRole() != Role.STUDENT) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "USER_IS_NOT_STUDENT", "Chỉ có thể ghi danh tài khoản sinh viên.");
        }
        if (!student.isEnabled()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "STUDENT_ACCOUNT_DISABLED", "Tài khoản sinh viên đang bị khóa.");
        }
        if (enrollments.existsByCourseIdAndStudentId(courseId, student.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_ENROLLED", "Sinh viên này đã được ghi danh vào khóa học.");
        }

        Enrollment saved = enrollments.save(new Enrollment(courseId, student.getId()));
        return EnrollmentView.from(saved, student);
    }

    /** Hủy ghi danh sinh viên khỏi khóa học. */
    @Transactional
    public void unenroll(Long courseId, Long studentId, UserAccount user) {
        Course course = getCourseOrThrow(courseId);
        requireOwnerOrAdmin(course, user);

        Enrollment enrollment = enrollments.findByCourseIdAndStudentId(courseId, studentId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "ENROLLMENT_NOT_FOUND", "Sinh viên chưa được ghi danh trong khóa học này."));
        enrollments.delete(enrollment);
    }

    private Course getCourseOrThrow(Long id) {
        return courses.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học."));
    }

    private void requireOwnerOrAdmin(Course course, UserAccount user) {
        boolean isOwner = user.getRole() == Role.TEACHER && course.getTeacherId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền quản lý thành viên khóa học này.");
        }
    }

    private UserAccount findStudent(EnrollRequest request) {
        if (request.studentId() != null) {
            return users.findById(request.studentId()).orElseThrow(() ->
                    new ApiException(HttpStatus.NOT_FOUND, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên theo mã ID."));
        }
        String idOrCodeOrEmail = request.identifier() != null ? request.identifier().trim() : "";
        if (idOrCodeOrEmail.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MISSING_STUDENT_IDENTIFIER", "Vui lòng nhập mã sinh viên hoặc email.");
        }
        return users.findByStudentCode(idOrCodeOrEmail)
                .or(() -> users.findByEmail(idOrCodeOrEmail.toLowerCase()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "STUDENT_NOT_FOUND", "Không tìm thấy sinh viên có mã hoặc email này."));
    }
}
