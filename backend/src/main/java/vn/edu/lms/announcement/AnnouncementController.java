package vn.edu.lms.announcement;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.lms.announcement.AnnouncementDtos.*;
import vn.edu.lms.auth.CurrentUserService;
import vn.edu.lms.user.UserAccount;

@RestController
@RequestMapping("/api/v1")
public class AnnouncementController {
    private final AnnouncementService announcementService;
    private final CurrentUserService currentUserService;

    public AnnouncementController(AnnouncementService announcementService, CurrentUserService currentUserService) {
        this.announcementService = announcementService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/courses/{courseId}/announcements")
    public List<AnnouncementView> list(@PathVariable Long courseId, Authentication authentication) {
        UserAccount user = currentUserService.require(authentication);
        return announcementService.list(courseId, user);
    }

    @PostMapping("/courses/{courseId}/announcements")
    @ResponseStatus(HttpStatus.CREATED)
    public AnnouncementView create(
            @PathVariable Long courseId,
            @Valid @RequestBody CreateAnnouncement request,
            Authentication authentication
    ) {
        UserAccount teacher = currentUserService.require(authentication);
        return announcementService.create(courseId, request, teacher);
    }

    @DeleteMapping("/announcements/{announcementId}")
    public ResponseEntity<Void> delete(@PathVariable Long announcementId, Authentication authentication) {
        UserAccount teacher = currentUserService.require(authentication);
        announcementService.delete(announcementId, teacher);
        return ResponseEntity.noContent().build();
    }
}
