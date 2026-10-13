package vn.edu.lms.assignment;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.lms.assignment.AssignmentDtos.*;
import vn.edu.lms.auth.CurrentUserService;
import vn.edu.lms.user.UserAccount;

@RestController
@RequestMapping("/api/v1")
public class AssignmentController {
    private final AssignmentService assignmentService;
    private final CurrentUserService currentUserService;

    public AssignmentController(AssignmentService assignmentService, CurrentUserService currentUserService) {
        this.assignmentService = assignmentService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/courses/{courseId}/assignments")
    public List<AssignmentView> listAssignments(@PathVariable Long courseId, Authentication authentication) {
        UserAccount user = currentUserService.require(authentication);
        return assignmentService.listAssignments(courseId, user);
    }

    @PostMapping("/courses/{courseId}/assignments")
    @ResponseStatus(HttpStatus.CREATED)
    public AssignmentView createAssignment(
            @PathVariable Long courseId,
            @Valid @RequestBody CreateAssignment request,
            Authentication authentication
    ) {
        UserAccount teacher = currentUserService.require(authentication);
        return assignmentService.createAssignment(courseId, request, teacher);
    }

    @GetMapping("/assignments/{assignmentId}")
    public AssignmentView getAssignment(@PathVariable Long assignmentId, Authentication authentication) {
        UserAccount user = currentUserService.require(authentication);
        return assignmentService.getAssignment(assignmentId, user);
    }

    @PutMapping("/assignments/{assignmentId}")
    public AssignmentView updateAssignment(
            @PathVariable Long assignmentId,
            @Valid @RequestBody UpdateAssignment request,
            Authentication authentication
    ) {
        UserAccount teacher = currentUserService.require(authentication);
        return assignmentService.updateAssignment(assignmentId, request, teacher);
    }

    @DeleteMapping("/assignments/{assignmentId}")
    public ResponseEntity<Void> deleteAssignment(@PathVariable Long assignmentId, Authentication authentication) {
        UserAccount teacher = currentUserService.require(authentication);
        assignmentService.deleteAssignment(assignmentId, teacher);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/assignments/{assignmentId}/questions")
    public List<QuizQuestionView> getQuizQuestions(@PathVariable Long assignmentId, Authentication authentication) {
        UserAccount user = currentUserService.require(authentication);
        return assignmentService.getQuizQuestions(assignmentId, user);
    }

    @PostMapping("/assignments/{assignmentId}/questions")
    @ResponseStatus(HttpStatus.CREATED)
    public QuizQuestionView addQuizQuestion(
            @PathVariable Long assignmentId,
            @Valid @RequestBody CreateQuizQuestion request,
            Authentication authentication
    ) {
        UserAccount teacher = currentUserService.require(authentication);
        return assignmentService.addQuizQuestion(assignmentId, request, teacher);
    }

    @DeleteMapping("/questions/{questionId}")
    public ResponseEntity<Void> deleteQuizQuestion(@PathVariable Long questionId, Authentication authentication) {
        UserAccount teacher = currentUserService.require(authentication);
        assignmentService.deleteQuizQuestion(questionId, teacher);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/assignments/{assignmentId}/submit-quiz")
    public SubmissionView submitQuiz(
            @PathVariable Long assignmentId,
            @Valid @RequestBody SubmitQuizRequest request,
            Authentication authentication
    ) {
        UserAccount student = currentUserService.require(authentication);
        return assignmentService.submitQuiz(assignmentId, request, student);
    }

    @PostMapping("/assignments/{assignmentId}/submit-essay")
    public SubmissionView submitEssay(
            @PathVariable Long assignmentId,
            @Valid @RequestBody SubmitEssayRequest request,
            Authentication authentication
    ) {
        UserAccount student = currentUserService.require(authentication);
        return assignmentService.submitEssay(assignmentId, request, student);
    }

    @GetMapping("/assignments/{assignmentId}/my-submission")
    public SubmissionView getMySubmission(@PathVariable Long assignmentId, Authentication authentication) {
        UserAccount student = currentUserService.require(authentication);
        return assignmentService.getMySubmission(assignmentId, student);
    }

    @GetMapping("/assignments/{assignmentId}/submissions")
    public List<SubmissionView> listSubmissions(@PathVariable Long assignmentId, Authentication authentication) {
        UserAccount teacher = currentUserService.require(authentication);
        return assignmentService.listSubmissions(assignmentId, teacher);
    }

    @PutMapping("/submissions/{submissionId}/grade")
    public SubmissionView gradeSubmission(
            @PathVariable Long submissionId,
            @Valid @RequestBody GradeSubmissionRequest request,
            Authentication authentication
    ) {
        UserAccount teacher = currentUserService.require(authentication);
        return assignmentService.gradeSubmission(submissionId, request, teacher);
    }

    @GetMapping("/courses/{courseId}/gradebook")
    public GradebookView getGradebook(@PathVariable Long courseId, Authentication authentication) {
        UserAccount user = currentUserService.require(authentication);
        return assignmentService.getGradebook(courseId, user);
    }
}
