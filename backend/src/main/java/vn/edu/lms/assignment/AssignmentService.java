package vn.edu.lms.assignment;

import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.lms.assignment.AssignmentDtos.*;
import vn.edu.lms.common.ApiException;
import vn.edu.lms.course.Course;
import vn.edu.lms.course.CourseRepository;
import vn.edu.lms.course.CourseStatus;
import vn.edu.lms.enrollment.Enrollment;
import vn.edu.lms.enrollment.EnrollmentRepository;
import vn.edu.lms.user.Role;
import vn.edu.lms.user.UserAccount;
import vn.edu.lms.user.UserRepository;

@Service
@Transactional(readOnly = true)
public class AssignmentService {
    private final AssignmentRepository assignments;
    private final QuizQuestionRepository questions;
    private final QuizOptionRepository options;
    private final AssignmentSubmissionRepository submissions;
    private final QuizAnswerRepository answers;
    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;

    public AssignmentService(
            AssignmentRepository assignments,
            QuizQuestionRepository questions,
            QuizOptionRepository options,
            AssignmentSubmissionRepository submissions,
            QuizAnswerRepository answers,
            CourseRepository courses,
            EnrollmentRepository enrollments,
            UserRepository users
    ) {
        this.assignments = assignments;
        this.questions = questions;
        this.options = options;
        this.submissions = submissions;
        this.answers = answers;
        this.courses = courses;
        this.enrollments = enrollments;
        this.users = users;
    }

    public List<AssignmentView> listAssignments(Long courseId, UserAccount user) {
        Course course = getCourseOrThrow(courseId);
        boolean isOwner = isCourseOwner(course, user);
        boolean isEnrolled = isStudentEnrolled(courseId, user);

        if (!isOwner && !isEnrolled) {
            throw forbidden();
        }

        List<Assignment> list;
        if (isOwner) {
            list = assignments.findByCourseIdOrderByIdDesc(courseId);
        } else {
            list = assignments.findByCourseIdAndStatusOrderByIdDesc(courseId, AssignmentStatus.PUBLISHED);
        }

        List<AssignmentSubmission> userSubmissions = isEnrolled
                ? submissions.findByAssignmentIdInAndStudentId(list.stream().map(Assignment::getId).toList(), user.getId())
                : List.of();
        Map<Long, AssignmentSubmission> subByAssignment = new HashMap<>();
        userSubmissions.forEach(s -> subByAssignment.put(s.getAssignmentId(), s));

        List<AssignmentSubmission> allSubmissions = isOwner
                ? submissions.findByAssignmentIdIn(list.stream().map(Assignment::getId).toList())
                : List.of();
        Map<Long, Integer> countByAssignment = new HashMap<>();
        allSubmissions.forEach(s -> countByAssignment.merge(s.getAssignmentId(), 1, Integer::sum));

        return list.stream().map(a -> {
            Integer count = isOwner ? countByAssignment.getOrDefault(a.getId(), 0) : null;
            AssignmentSubmission sub = subByAssignment.get(a.getId());
            Boolean mySubmitted = isEnrolled ? (sub != null) : null;
            Double myScore = sub != null ? sub.getScore() : null;
            SubmissionStatus myStatus = sub != null ? sub.getStatus() : null;
            return AssignmentView.from(a, count, mySubmitted, myScore, myStatus);
        }).toList();
    }

    public AssignmentView getAssignment(Long assignmentId, UserAccount user) {
        Assignment a = getAssignmentOrThrow(assignmentId);
        Course course = getCourseOrThrow(a.getCourseId());
        boolean isOwner = isCourseOwner(course, user);
        boolean isEnrolled = isStudentEnrolled(a.getCourseId(), user);

        if (!isOwner && !isEnrolled) {
            throw forbidden();
        }
        if (!isOwner && a.getStatus() != AssignmentStatus.PUBLISHED) {
            throw forbidden();
        }

        Optional<AssignmentSubmission> sub = submissions.findByAssignmentIdAndStudentId(assignmentId, user.getId());
        List<AssignmentSubmission> allSubs = isOwner ? submissions.findByAssignmentIdOrderBySubmittedAtDesc(assignmentId) : List.of();

        return AssignmentView.from(
                a,
                isOwner ? allSubs.size() : null,
                sub.isPresent(),
                sub.map(AssignmentSubmission::getScore).orElse(null),
                sub.map(AssignmentSubmission::getStatus).orElse(null)
        );
    }

    @Transactional
    public AssignmentView createAssignment(Long courseId, CreateAssignment request, UserAccount teacher) {
        Course course = getCourseOrThrow(courseId);
        requireCourseOwner(course, teacher);

        Double maxScore = request.maxScore() != null && request.maxScore() > 0 ? request.maxScore() : 10.0;
        AssignmentStatus status = request.status() != null ? request.status() : AssignmentStatus.DRAFT;

        Assignment a = new Assignment(
                courseId,
                request.title().trim(),
                request.description().trim(),
                request.type(),
                request.openAt(),
                request.dueAt(),
                maxScore,
                status
        );
        Assignment saved = assignments.save(a);
        return AssignmentView.from(saved, 0, false, null, null);
    }

    @Transactional
    public AssignmentView updateAssignment(Long assignmentId, UpdateAssignment request, UserAccount teacher) {
        Assignment a = getAssignmentOrThrow(assignmentId);
        Course course = getCourseOrThrow(a.getCourseId());
        requireCourseOwner(course, teacher);

        a.setTitle(request.title().trim());
        a.setDescription(request.description().trim());
        a.setOpenAt(request.openAt());
        a.setDueAt(request.dueAt());
        if (request.maxScore() != null && request.maxScore() > 0) {
            a.setMaxScore(request.maxScore());
        }
        if (request.status() != null) {
            a.setStatus(request.status());
        }

        int count = submissions.findByAssignmentIdOrderBySubmittedAtDesc(assignmentId).size();
        return AssignmentView.from(a, count, false, null, null);
    }

    @Transactional
    public void deleteAssignment(Long assignmentId, UserAccount teacher) {
        Assignment a = getAssignmentOrThrow(assignmentId);
        Course course = getCourseOrThrow(a.getCourseId());
        requireCourseOwner(course, teacher);

        List<AssignmentSubmission> subs = submissions.findByAssignmentIdOrderBySubmittedAtDesc(assignmentId);
        for (AssignmentSubmission sub : subs) {
            answers.deleteBySubmissionId(sub.getId());
        }
        submissions.deleteByAssignmentId(assignmentId);

        List<QuizQuestion> qList = questions.findByAssignmentIdOrderByPositionAscIdAsc(assignmentId);
        for (QuizQuestion q : qList) {
            options.deleteByQuestionId(q.getId());
        }
        questions.deleteByAssignmentId(assignmentId);

        assignments.delete(a);
    }

    public List<QuizQuestionView> getQuizQuestions(Long assignmentId, UserAccount user) {
        Assignment a = getAssignmentOrThrow(assignmentId);
        Course course = getCourseOrThrow(a.getCourseId());
        boolean isOwner = isCourseOwner(course, user);
        boolean isEnrolled = isStudentEnrolled(a.getCourseId(), user);

        if (!isOwner && !isEnrolled) {
            throw forbidden();
        }
        if (!isOwner && a.getStatus() != AssignmentStatus.PUBLISHED) {
            throw forbidden();
        }

        boolean hasSubmitted = false;
        if (isEnrolled) {
            hasSubmitted = submissions.existsByAssignmentIdAndStudentId(assignmentId, user.getId());
        }

        boolean revealAnswer = isOwner || hasSubmitted;

        List<QuizQuestion> qList = questions.findByAssignmentIdOrderByPositionAscIdAsc(assignmentId);
        List<Long> qIds = qList.stream().map(QuizQuestion::getId).toList();
        List<QuizOption> optList = qIds.isEmpty() ? List.of() : options.findByQuestionIdInOrderByPositionAscIdAsc(qIds);

        Map<Long, List<QuizOption>> optMap = new HashMap<>();
        optList.forEach(o -> optMap.computeIfAbsent(o.getQuestionId(), k -> new ArrayList<>()).add(o));

        return qList.stream()
                .map(q -> QuizQuestionView.from(q, optMap.getOrDefault(q.getId(), List.of()), revealAnswer))
                .toList();
    }

    @Transactional
    public QuizQuestionView addQuizQuestion(Long assignmentId, CreateQuizQuestion request, UserAccount teacher) {
        Assignment a = getAssignmentOrThrow(assignmentId);
        Course course = getCourseOrThrow(a.getCourseId());
        requireCourseOwner(course, teacher);

        if (request.options() == null || request.options().size() < 2) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_OPTIONS", "Câu hỏi trắc nghiệm phải có ít nhất 2 phương án lựa chọn.");
        }
        long correctCount = request.options().stream().filter(CreateQuizOption::isCorrect).count();
        if (correctCount != 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CORRECT_ANSWER", "Phải có đúng một đáp án chính xác.");
        }

        Double points = request.points() != null && request.points() > 0 ? request.points() : 1.0;
        Integer pos = request.position() != null ? request.position() : (questions.findByAssignmentIdOrderByPositionAscIdAsc(assignmentId).size() + 1);

        QuizQuestion q = new QuizQuestion(assignmentId, request.questionText().trim(), points, pos);
        QuizQuestion savedQ = questions.save(q);

        List<QuizOption> savedOptions = new ArrayList<>();
        int optPos = 1;
        for (CreateQuizOption opt : request.options()) {
            QuizOption o = new QuizOption(savedQ.getId(), opt.optionText().trim(), opt.isCorrect(), optPos++);
            savedOptions.add(options.save(o));
        }

        return QuizQuestionView.from(savedQ, savedOptions, true);
    }

    @Transactional
    public void deleteQuizQuestion(Long questionId, UserAccount teacher) {
        QuizQuestion q = questions.findById(questionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "QUESTION_NOT_FOUND", "Không tìm thấy câu hỏi."));
        Assignment a = getAssignmentOrThrow(q.getAssignmentId());
        Course course = getCourseOrThrow(a.getCourseId());
        requireCourseOwner(course, teacher);

        options.deleteByQuestionId(questionId);
        questions.delete(q);
    }

    @Transactional
    public SubmissionView submitQuiz(Long assignmentId, SubmitQuizRequest request, UserAccount student) {
        Assignment a = getAssignmentOrThrow(assignmentId);
        Course course = getCourseOrThrow(a.getCourseId());

        if (a.getType() != AssignmentType.QUIZ) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "WRONG_TYPE", "Bài tập này không phải là trắc nghiệm.");
        }
        if (a.getStatus() != AssignmentStatus.PUBLISHED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_PUBLISHED", "Bài tập chưa được công bố.");
        }
        if (!isStudentEnrolled(a.getCourseId(), student)) {
            throw forbidden();
        }
        if (submissions.existsByAssignmentIdAndStudentId(assignmentId, student.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_SUBMITTED", "Bạn đã nộp bài tập này rồi.");
        }

        List<QuizQuestion> qList = questions.findByAssignmentIdOrderByPositionAscIdAsc(assignmentId);
        if (qList.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMPTY_QUIZ", "Bài trắc nghiệm chưa có câu hỏi nào.");
        }

        List<Long> qIds = qList.stream().map(QuizQuestion::getId).toList();
        List<QuizOption> optList = options.findByQuestionIdInOrderByPositionAscIdAsc(qIds);
        Map<Long, List<QuizOption>> optMap = new HashMap<>();
        optList.forEach(o -> optMap.computeIfAbsent(o.getQuestionId(), k -> new ArrayList<>()).add(o));

        double totalQuestionPoints = 0.0;
        double earnedPoints = 0.0;

        for (QuizQuestion q : qList) {
            totalQuestionPoints += q.getPoints();
            Long selectedOptId = request.answers() != null ? request.answers().get(q.getId()) : null;
            if (selectedOptId != null) {
                List<QuizOption> qOpts = optMap.getOrDefault(q.getId(), List.of());
                boolean correct = qOpts.stream().anyMatch(o -> o.getId().equals(selectedOptId) && o.isCorrect());
                if (correct) {
                    earnedPoints += q.getPoints();
                }
            }
        }

        double finalScore = totalQuestionPoints > 0
                ? (earnedPoints / totalQuestionPoints) * a.getMaxScore()
                : a.getMaxScore();
        finalScore = Math.round(finalScore * 100.0) / 100.0;

        SubmissionStatus status = SubmissionStatus.GRADED;
        if (a.getDueAt() != null && Instant.now().isAfter(a.getDueAt())) {
            status = SubmissionStatus.LATE;
        }

        AssignmentSubmission sub = new AssignmentSubmission(assignmentId, student.getId(), "Quiz completed", status);
        sub.setScore(finalScore);
        sub.setGradedAt(Instant.now());
        sub.setFeedback(String.format("Tự động chấm: %s/%s câu đúng (%.2f điểm)",
                (int) earnedPoints, (int) totalQuestionPoints, finalScore));
        AssignmentSubmission savedSub = submissions.save(sub);

        if (request.answers() != null) {
            for (Map.Entry<Long, Long> entry : request.answers().entrySet()) {
                answers.save(new QuizAnswer(savedSub.getId(), entry.getKey(), entry.getValue()));
            }
        }

        return buildSubmissionView(savedSub, a, student);
    }

    @Transactional
    public SubmissionView submitEssay(Long assignmentId, SubmitEssayRequest request, UserAccount student) {
        Assignment a = getAssignmentOrThrow(assignmentId);
        Course course = getCourseOrThrow(a.getCourseId());

        if (a.getType() != AssignmentType.ESSAY) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "WRONG_TYPE", "Bài tập này không phải là bài viết tự luận.");
        }
        if (a.getStatus() != AssignmentStatus.PUBLISHED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "NOT_PUBLISHED", "Bài tập chưa được công bố.");
        }
        if (!isStudentEnrolled(a.getCourseId(), student)) {
            throw forbidden();
        }
        if (submissions.existsByAssignmentIdAndStudentId(assignmentId, student.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_SUBMITTED", "Bạn đã nộp bài viết này rồi.");
        }

        SubmissionStatus status = (a.getDueAt() != null && Instant.now().isAfter(a.getDueAt()))
                ? SubmissionStatus.LATE
                : SubmissionStatus.SUBMITTED;

        AssignmentSubmission sub = new AssignmentSubmission(assignmentId, student.getId(), request.content().trim(), status);
        AssignmentSubmission saved = submissions.save(sub);
        return buildSubmissionView(saved, a, student);
    }

    @Transactional
    public SubmissionView gradeSubmission(Long submissionId, GradeSubmissionRequest request, UserAccount teacher) {
        AssignmentSubmission sub = submissions.findById(submissionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SUBMISSION_NOT_FOUND", "Không tìm thấy bài nộp."));
        Assignment a = getAssignmentOrThrow(sub.getAssignmentId());
        Course course = getCourseOrThrow(a.getCourseId());
        requireCourseOwner(course, teacher);

        if (request.score() < 0 || request.score() > a.getMaxScore()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SCORE",
                    String.format("Điểm phải nằm trong khoảng từ 0 đến %.1f.", a.getMaxScore()));
        }

        sub.setScore(request.score());
        sub.setFeedback(request.feedback() != null ? request.feedback().trim() : null);
        sub.setStatus(SubmissionStatus.GRADED);
        sub.setGradedAt(Instant.now());
        sub.setGradedBy(teacher.getId());

        UserAccount student = users.findById(sub.getStudentId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy sinh viên."));
        return buildSubmissionView(sub, a, student);
    }

    public List<SubmissionView> listSubmissions(Long assignmentId, UserAccount teacher) {
        Assignment a = getAssignmentOrThrow(assignmentId);
        Course course = getCourseOrThrow(a.getCourseId());
        requireCourseOwner(course, teacher);

        List<AssignmentSubmission> subs = submissions.findByAssignmentIdOrderBySubmittedAtDesc(assignmentId);
        Map<Long, UserAccount> studentMap = new HashMap<>();
        List<Long> sIds = subs.stream().map(AssignmentSubmission::getStudentId).distinct().toList();
        if (!sIds.isEmpty()) {
            users.findAllById(sIds).forEach(u -> studentMap.put(u.getId(), u));
        }

        return subs.stream().map(s -> {
            UserAccount student = studentMap.get(s.getStudentId());
            return buildSubmissionView(s, a, student);
        }).toList();
    }

    public SubmissionView getMySubmission(Long assignmentId, UserAccount student) {
        Assignment a = getAssignmentOrThrow(assignmentId);
        AssignmentSubmission sub = submissions.findByAssignmentIdAndStudentId(assignmentId, student.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "SUBMISSION_NOT_FOUND", "Bạn chưa nộp bài tập này."));
        return buildSubmissionView(sub, a, student);
    }

    public GradebookView getGradebook(Long courseId, UserAccount user) {
        Course course = getCourseOrThrow(courseId);
        boolean isOwner = isCourseOwner(course, user);
        boolean isEnrolled = isStudentEnrolled(courseId, user);

        if (!isOwner && !isEnrolled) {
            throw forbidden();
        }

        List<Assignment> courseAssignments = isOwner
                ? assignments.findByCourseIdOrderByIdDesc(courseId)
                : assignments.findByCourseIdAndStatusOrderByIdDesc(courseId, AssignmentStatus.PUBLISHED);

        List<AssignmentView> assignmentViews = courseAssignments.stream()
                .map(a -> AssignmentView.from(a, null, null, null, null))
                .toList();

        List<UserAccount> studentList;
        if (isOwner) {
            List<Enrollment> enrolledList = enrollments.findByCourseId(courseId);
            List<Long> studentIds = enrolledList.stream().map(Enrollment::getStudentId).toList();
            studentList = studentIds.isEmpty() ? List.of() : users.findAllById(studentIds);
        } else {
            studentList = List.of(user);
        }

        List<Long> assignIds = courseAssignments.stream().map(Assignment::getId).toList();
        List<AssignmentSubmission> allSubs = assignIds.isEmpty() ? List.of() : submissions.findByAssignmentIdIn(assignIds);

        Map<String, AssignmentSubmission> subMatrix = new HashMap<>();
        for (AssignmentSubmission s : allSubs) {
            subMatrix.put(s.getStudentId() + "_" + s.getAssignmentId(), s);
        }

        List<GradebookEntry> entries = new ArrayList<>();
        for (UserAccount s : studentList) {
            Map<Long, SubmissionScoreView> scores = new HashMap<>();
            for (Assignment a : courseAssignments) {
                AssignmentSubmission sub = subMatrix.get(s.getId() + "_" + a.getId());
                if (sub != null) {
                    scores.put(a.getId(), new SubmissionScoreView(
                            sub.getId(),
                            sub.getScore(),
                            a.getMaxScore(),
                            sub.getStatus(),
                            sub.getSubmittedAt()
                    ));
                }
            }
            entries.add(new GradebookEntry(
                    s.getId(),
                    s.getFullName(),
                    s.getEmail(),
                    s.getStudentCode(),
                    scores
            ));
        }

        return new GradebookView(courseId, assignmentViews, entries);
    }

    private SubmissionView buildSubmissionView(AssignmentSubmission sub, Assignment a, UserAccount student) {
        List<QuizAnswerDetailView> quizAnswers = null;
        if (a.getType() == AssignmentType.QUIZ) {
            List<QuizAnswer> userAnswers = answers.findBySubmissionId(sub.getId());
            Map<Long, Long> ansMap = new HashMap<>();
            userAnswers.forEach(ans -> ansMap.put(ans.getQuestionId(), ans.getSelectedOptionId()));

            List<QuizQuestion> qList = questions.findByAssignmentIdOrderByPositionAscIdAsc(a.getId());
            List<Long> qIds = qList.stream().map(QuizQuestion::getId).toList();
            List<QuizOption> optList = qIds.isEmpty() ? List.of() : options.findByQuestionIdInOrderByPositionAscIdAsc(qIds);
            Map<Long, List<QuizOption>> optMap = new HashMap<>();
            optList.forEach(o -> optMap.computeIfAbsent(o.getQuestionId(), k -> new ArrayList<>()).add(o));

            quizAnswers = qList.stream().map(q -> {
                Long selectedId = ansMap.get(q.getId());
                List<QuizOption> qOpts = optMap.getOrDefault(q.getId(), List.of());
                QuizOption selectedOpt = qOpts.stream().filter(o -> o.getId().equals(selectedId)).findFirst().orElse(null);
                QuizOption correctOpt = qOpts.stream().filter(QuizOption::isCorrect).findFirst().orElse(null);
                boolean isCorrect = selectedOpt != null && selectedOpt.isCorrect();

                return new QuizAnswerDetailView(
                        q.getId(),
                        q.getQuestionText(),
                        q.getPoints(),
                        selectedId,
                        selectedOpt != null ? selectedOpt.getOptionText() : null,
                        correctOpt != null ? correctOpt.getId() : null,
                        correctOpt != null ? correctOpt.getOptionText() : null,
                        isCorrect
                );
            }).toList();
        }

        return new SubmissionView(
                sub.getId(),
                sub.getAssignmentId(),
                sub.getStudentId(),
                student != null ? student.getFullName() : "Sinh viên",
                student != null ? student.getEmail() : null,
                student != null ? student.getStudentCode() : null,
                sub.getContent(),
                sub.getScore(),
                a.getMaxScore(),
                sub.getFeedback(),
                sub.getStatus(),
                sub.getSubmittedAt(),
                sub.getGradedAt(),
                quizAnswers
        );
    }

    private Course getCourseOrThrow(Long id) {
        return courses.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học."));
    }

    private Assignment getAssignmentOrThrow(Long id) {
        return assignments.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ASSIGNMENT_NOT_FOUND", "Không tìm thấy bài tập."));
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
