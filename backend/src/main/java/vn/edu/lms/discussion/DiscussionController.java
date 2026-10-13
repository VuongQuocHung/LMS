package vn.edu.lms.discussion;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.lms.auth.CurrentUserService;
import vn.edu.lms.discussion.DiscussionDtos.*;
import vn.edu.lms.user.UserAccount;

@RestController
@RequestMapping("/api/v1")
public class DiscussionController {
    private final DiscussionService discussionService;
    private final CurrentUserService currentUserService;

    public DiscussionController(DiscussionService discussionService, CurrentUserService currentUserService) {
        this.discussionService = discussionService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/courses/{courseId}/discussions")
    public List<TopicView> listTopics(@PathVariable Long courseId, Authentication authentication) {
        UserAccount user = currentUserService.require(authentication);
        return discussionService.listTopics(courseId, user);
    }

    @PostMapping("/courses/{courseId}/discussions")
    @ResponseStatus(HttpStatus.CREATED)
    public TopicView createTopic(
            @PathVariable Long courseId,
            @Valid @RequestBody CreateTopic request,
            Authentication authentication
    ) {
        UserAccount user = currentUserService.require(authentication);
        return discussionService.createTopic(courseId, request, user);
    }

    @GetMapping("/discussions/{topicId}")
    public TopicDetailView getTopic(@PathVariable Long topicId, Authentication authentication) {
        UserAccount user = currentUserService.require(authentication);
        return discussionService.getTopic(topicId, user);
    }

    @PostMapping("/discussions/{topicId}/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public PostView createPost(
            @PathVariable Long topicId,
            @Valid @RequestBody CreatePost request,
            Authentication authentication
    ) {
        UserAccount user = currentUserService.require(authentication);
        return discussionService.createPost(topicId, request, user);
    }

    @DeleteMapping("/discussions/{topicId}")
    public ResponseEntity<Void> deleteTopic(@PathVariable Long topicId, Authentication authentication) {
        UserAccount user = currentUserService.require(authentication);
        discussionService.deleteTopic(topicId, user);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<Void> deletePost(@PathVariable Long postId, Authentication authentication) {
        UserAccount user = currentUserService.require(authentication);
        discussionService.deletePost(postId, user);
        return ResponseEntity.noContent().build();
    }
}
