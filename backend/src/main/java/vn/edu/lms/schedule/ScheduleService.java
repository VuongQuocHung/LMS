package vn.edu.lms.schedule;

import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.lms.assignment.Assignment;
import vn.edu.lms.assignment.AssignmentRepository;
import vn.edu.lms.assignment.AssignmentStatus;
import vn.edu.lms.assignment.AssignmentSubmission;
import vn.edu.lms.assignment.AssignmentSubmissionRepository;
import vn.edu.lms.course.Course;
import vn.edu.lms.course.CourseRepository;
import vn.edu.lms.enrollment.Enrollment;
import vn.edu.lms.enrollment.EnrollmentRepository;
import vn.edu.lms.schedule.ScheduleDtos.*;
import vn.edu.lms.user.Role;
import vn.edu.lms.user.UserAccount;

@Service
@Transactional(readOnly = true)
public class ScheduleService {
    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;
    private final AssignmentRepository assignments;
    private final AssignmentSubmissionRepository submissions;

    public ScheduleService(
            CourseRepository courses,
            EnrollmentRepository enrollments,
            AssignmentRepository assignments,
            AssignmentSubmissionRepository submissions
    ) {
        this.courses = courses;
        this.enrollments = enrollments;
        this.assignments = assignments;
        this.submissions = submissions;
    }

    public ScheduleView getSchedule(UserAccount user) {
        List<Course> userCourses;
        if (user.getRole() == Role.TEACHER) {
            userCourses = courses.findByTeacherIdOrderByIdDesc(user.getId());
        } else if (user.getRole() == Role.STUDENT) {
            userCourses = courses.findVisibleToStudent(user.getId());
        } else {
            return new ScheduleView(List.of(), List.of());
        }

        if (userCourses.isEmpty()) {
            return new ScheduleView(List.of(), List.of());
        }

        Map<Long, String> courseTitleMap = new HashMap<>();
        userCourses.forEach(c -> courseTitleMap.put(c.getId(), c.getTitle()));
        List<Long> courseIds = userCourses.stream().map(Course::getId).toList();

        List<Assignment> assignmentList;
        if (user.getRole() == Role.TEACHER) {
            assignmentList = assignments.findByCourseIdInOrderByIdDesc(courseIds);
        } else {
            assignmentList = assignments.findByCourseIdInAndStatusOrderByIdDesc(courseIds, AssignmentStatus.PUBLISHED);
        }

        List<Long> assignIds = assignmentList.stream().map(Assignment::getId).toList();
        List<AssignmentSubmission> userSubmissions = (user.getRole() == Role.STUDENT && !assignIds.isEmpty())
                ? submissions.findByAssignmentIdInAndStudentId(assignIds, user.getId())
                : List.of();

        Map<Long, AssignmentSubmission> subMap = new HashMap<>();
        userSubmissions.forEach(s -> subMap.put(s.getAssignmentId(), s));

        Instant now = Instant.now();
        List<ScheduleItem> upcoming = new ArrayList<>();
        List<ScheduleItem> past = new ArrayList<>();

        for (Assignment a : assignmentList) {
            AssignmentSubmission sub = subMap.get(a.getId());
            boolean isSubmitted = sub != null;
            Double score = sub != null ? sub.getScore() : null;
            var status = sub != null ? sub.getStatus() : null;

            ScheduleItem item = new ScheduleItem(
                    a.getId(),
                    a.getCourseId(),
                    courseTitleMap.getOrDefault(a.getCourseId(), "Khóa học"),
                    a.getTitle(),
                    a.getType(),
                    a.getOpenAt(),
                    a.getDueAt(),
                    a.getMaxScore(),
                    isSubmitted,
                    score,
                    status
            );

            if (a.getDueAt() == null || !now.isAfter(a.getDueAt())) {
                upcoming.add(item);
            } else {
                past.add(item);
            }
        }

        // Sắp xếp: upcoming theo hạn nộp gần nhất trước (hoặc null ở cuối)
        upcoming.sort((a, b) -> {
            if (a.dueAt() == null && b.dueAt() == null) return 0;
            if (a.dueAt() == null) return 1;
            if (b.dueAt() == null) return -1;
            return a.dueAt().compareTo(b.dueAt());
        });

        // past: theo hạn nộp mới nhất trước
        past.sort((a, b) -> {
            if (a.dueAt() == null && b.dueAt() == null) return 0;
            if (a.dueAt() == null) return 1;
            if (b.dueAt() == null) return -1;
            return b.dueAt().compareTo(a.dueAt());
        });

        return new ScheduleView(upcoming, past);
    }
}
