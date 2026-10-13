package vn.edu.lms.announcement;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.lms.announcement.AnnouncementDtos.*;
import vn.edu.lms.common.ApiException;
import vn.edu.lms.course.Course;
import vn.edu.lms.course.CourseRepository;
import vn.edu.lms.enrollment.EnrollmentRepository;
import vn.edu.lms.user.Role;
import vn.edu.lms.user.UserAccount;
import vn.edu.lms.user.UserRepository;

@Service
@Transactional(readOnly = true)
public class AnnouncementService {
    private final AnnouncementRepository announcements;
    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;

    public AnnouncementService(
            AnnouncementRepository announcements,
            CourseRepository courses,
            EnrollmentRepository enrollments,
            UserRepository users
    ) {
        this.announcements = announcements;
        this.courses = courses;
        this.enrollments = enrollments;
        this.users = users;
    }

    public List<AnnouncementView> list(Long courseId, UserAccount user) {
        Course course = getCourseOrThrow(courseId);
        boolean isOwner = isCourseOwner(course, user);
        boolean isEnrolled = isStudentEnrolled(courseId, user);
        if (!isOwner && !isEnrolled) {
            throw forbidden();
        }

        List<CourseAnnouncement> list = announcements.findByCourseIdOrderByCreatedAtDesc(courseId);
        List<Long> authorIds = list.stream().map(CourseAnnouncement::getAuthorId).distinct().toList();
        Map<Long, String> authorNames = new HashMap<>();
        if (!authorIds.isEmpty()) {
            users.findAllById(authorIds).forEach(u -> authorNames.put(u.getId(), u.getFullName()));
        }

        return list.stream()
                .map(a -> AnnouncementView.from(a, authorNames.getOrDefault(a.getAuthorId(), "Giảng viên")))
                .toList();
    }

    @Transactional
    public AnnouncementView create(Long courseId, CreateAnnouncement request, UserAccount teacher) {
        Course course = getCourseOrThrow(courseId);
        requireCourseOwner(course, teacher);

        CourseAnnouncement a = new CourseAnnouncement(
                courseId,
                teacher.getId(),
                request.title().trim(),
                request.content().trim()
        );
        CourseAnnouncement saved = announcements.save(a);
        return AnnouncementView.from(saved, teacher.getFullName());
    }

    @Transactional
    public void delete(Long announcementId, UserAccount teacher) {
        CourseAnnouncement a = announcements.findById(announcementId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ANNOUNCEMENT_NOT_FOUND", "Không tìm thấy thông báo."));
        Course course = getCourseOrThrow(a.getCourseId());
        requireCourseOwner(course, teacher);

        announcements.delete(a);
    }

    private Course getCourseOrThrow(Long id) {
        return courses.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học."));
    }

    private boolean isCourseOwner(Course course, UserAccount user) {
        return user.getRole() == Role.TEACHER && course.getTeacherId().equals(user.getId());
    }

    private void requireCourseOwner(Course course, UserAccount user) {
        if (!isCourseOwner(course, user)) {
            throw forbidden();
        }
    }

    private boolean isStudentEnrolled(Long courseId, UserAccount user) {
        return user.getRole() == Role.STUDENT && enrollments.existsByCourseIdAndStudentId(courseId, user.getId());
    }

    private ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
    }
}
