package vn.edu.lms.progress;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.lms.common.ApiException;
import vn.edu.lms.course.Course;
import vn.edu.lms.course.CourseRepository;
import vn.edu.lms.course.Lesson;
import vn.edu.lms.course.LessonRepository;
import vn.edu.lms.enrollment.EnrollmentRepository;
import vn.edu.lms.progress.ProgressDtos.*;
import vn.edu.lms.user.Role;
import vn.edu.lms.user.UserAccount;

@Service
@Transactional(readOnly = true)
public class ProgressService {
    private final LessonProgressRepository progressRepo;
    private final LessonRepository lessons;
    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;

    public ProgressService(
            LessonProgressRepository progressRepo,
            LessonRepository lessons,
            CourseRepository courses,
            EnrollmentRepository enrollments
    ) {
        this.progressRepo = progressRepo;
        this.lessons = lessons;
        this.courses = courses;
        this.enrollments = enrollments;
    }

    public CourseProgressView getCourseProgress(Long courseId, UserAccount user) {
        Course course = courses.findById(courseId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học."));

        boolean isOwner = user.getRole() == Role.TEACHER && course.getTeacherId().equals(user.getId());
        boolean isEnrolled = user.getRole() == Role.STUDENT && enrollments.existsByCourseIdAndStudentId(courseId, user.getId());
        if (!isOwner && !isEnrolled) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền truy cập khóa học này.");
        }

        List<Lesson> lessonList = lessons.findByCourseIdOrderByPositionAscIdAsc(courseId);
        if (!isOwner) {
            lessonList = lessonList.stream().filter(Lesson::isPublished).toList();
        }

        List<Long> lessonIds = lessonList.stream().map(Lesson::getId).toList();
        List<LessonProgress> progressList = isEnrolled && !lessonIds.isEmpty()
                ? progressRepo.findByStudentIdAndLessonIdIn(user.getId(), lessonIds)
                : List.of();

        Map<Long, LessonProgress> progressMap = progressList.stream()
                .collect(Collectors.toMap(LessonProgress::getLessonId, p -> p, (a, b) -> a));

        List<LessonProgressView> progressViews = lessonList.stream().map(l -> {
            LessonProgress p = progressMap.get(l.getId());
            boolean completed = p != null && p.isCompleted();
            Instant at = p != null ? p.getCompletedAt() : null;
            return new LessonProgressView(l.getId(), completed, at);
        }).toList();

        int total = lessonList.size();
        int completedCount = (int) progressViews.stream().filter(LessonProgressView::completed).count();
        double pct = total > 0 ? Math.round(((double) completedCount / total) * 1000.0) / 10.0 : 0.0;

        return new CourseProgressView(courseId, total, completedCount, pct, progressViews);
    }

    @Transactional
    public LessonProgressView toggleLessonProgress(Long lessonId, ToggleProgressRequest request, UserAccount student) {
        Lesson lesson = lessons.findById(lessonId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Không tìm thấy bài học."));

        if (!enrollments.existsByCourseIdAndStudentId(lesson.getCourseId(), student.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn chưa ghi danh vào khóa học này.");
        }

        LessonProgress progress = progressRepo.findByLessonIdAndStudentId(lessonId, student.getId())
                .orElseGet(() -> new LessonProgress(lessonId, student.getId(), request.completed()));

        progress.setCompleted(request.completed());
        LessonProgress saved = progressRepo.save(progress);

        return new LessonProgressView(saved.getLessonId(), saved.isCompleted(), saved.getCompletedAt());
    }
}
