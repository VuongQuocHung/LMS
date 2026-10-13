package vn.edu.lms.enrollment;

import jakarta.validation.constraints.NotNull;
import vn.edu.lms.user.UserAccount;

/** DTO quản lý ghi danh khóa học. */
public final class EnrollmentDtos {
    private EnrollmentDtos() {}

    /** Yêu cầu ghi danh sinh viên vào khóa học. */
    public record EnrollRequest(
            Long studentId,
            String identifier // Email hoặc mã sinh viên
    ) {}

    /** Thông tin sinh viên đã ghi danh hiển thị cho giảng viên/admin. */
    public record EnrollmentView(
            Long id,
            Long courseId,
            Long studentId,
            String email,
            String fullName,
            String studentCode
    ) {
        public static EnrollmentView from(Enrollment enrollment, UserAccount student) {
            return new EnrollmentView(
                    enrollment.getId(),
                    enrollment.getCourseId(),
                    student.getId(),
                    student.getEmail(),
                    student.getFullName(),
                    student.getStudentCode()
            );
        }
    }
}
