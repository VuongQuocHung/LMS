package vn.edu.lms.progress;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.lms.auth.CurrentUserService;
import vn.edu.lms.progress.ProgressDtos.*;
import vn.edu.lms.user.UserAccount;

@RestController
@RequestMapping("/api/v1")
public class ProgressController {
    private final ProgressService progressService;
    private final CurrentUserService currentUserService;

    public ProgressController(ProgressService progressService, CurrentUserService currentUserService) {
        this.progressService = progressService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/courses/{courseId}/progress")
    public CourseProgressView getCourseProgress(@PathVariable Long courseId, Authentication authentication) {
        UserAccount user = currentUserService.require(authentication);
        return progressService.getCourseProgress(courseId, user);
    }

    @PostMapping("/lessons/{lessonId}/progress")
    public LessonProgressView toggleLessonProgress(
            @PathVariable Long lessonId,
            @Valid @RequestBody ToggleProgressRequest request,
            Authentication authentication
    ) {
        UserAccount student = currentUserService.require(authentication);
        return progressService.toggleLessonProgress(lessonId, request, student);
    }
}
