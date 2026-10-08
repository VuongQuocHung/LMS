package vn.edu.lms.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.lms.user.*;
import vn.edu.lms.course.*;
import vn.edu.lms.enrollment.*;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {
    private final UserRepository users;
    private final CourseRepository courses;
    private final LessonRepository lessons;
    private final EnrollmentRepository enrollments;
    private final PasswordEncoder passwords;
    // Giá trị demo lấy từ cấu hình; tuyệt đối không log mật khẩu.
    private final String demoPassword;

    /** Nhận các repository và mật khẩu demo của profile dev/test. */
    public DemoDataSeeder(UserRepository users, CourseRepository courses, LessonRepository lessons,
                          EnrollmentRepository enrollments, PasswordEncoder passwords,
                          @Value("${app.seed.password}") String demoPassword) {
        this.users = users;
        this.courses = courses;
        this.lessons = lessons;
        this.enrollments = enrollments;
        this.passwords = passwords;
        this.demoPassword = demoPassword;
    }

    /** Seed trong một transaction và chỉ khi database trống, không ghi đè dữ liệu cũ. */
    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        if (users.count() > 0) {
            return;
        }
        String hash = passwords.encode(demoPassword);
        users.save(new UserAccount("admin@lms.local", hash, "Quản trị viên", null, Role.ADMIN));
        UserAccount teacher = users.save(new UserAccount("teacher@lms.local", hash, "Nguyễn Minh An", null, Role.TEACHER));
        users.save(new UserAccount("teacher2@lms.local", hash, "Trần Thu Hà", null, Role.TEACHER));
        UserAccount student = users.save(new UserAccount("student@lms.local", hash, "Lê Hoàng Nam", "SV001", Role.STUDENT));
        users.save(new UserAccount("student2@lms.local", hash, "Phạm Ngọc Anh", "SV002", Role.STUDENT));

        Course course = courses.save(new Course(teacher.getId(), "Lập trình mạng",
                "Bắt đầu với mô hình Client–Server, HTTP và cách xây dựng một ứng dụng qua mạng.",
                CourseStatus.PUBLISHED));
        lessons.save(new Lesson(course.getId(), "01. Mô hình Client–Server",
                "Client gửi yêu cầu. Server kiểm tra quyền, xử lý dữ liệu và trả phản hồi.\n\nTrong base này: trình duyệt → Next.js proxy → Spring Boot → PostgreSQL.", 1, true));
        lessons.save(new Lesson(course.getId(), "02. HTTP và phiên đăng nhập",
                "HTTP là giao thức request/response. Session giúp server nhận ra người đã đăng nhập qua cookie JSESSIONID.\n\nCSRF token bảo vệ các thao tác thay đổi dữ liệu.", 2, true));
        lessons.save(new Lesson(course.getId(), "03. Bài học nháp",
                "Chỉ giảng viên sở hữu khóa được xem bài nháp này.", 3, false));
        enrollments.save(new Enrollment(course.getId(), student.getId()));
    }
}
