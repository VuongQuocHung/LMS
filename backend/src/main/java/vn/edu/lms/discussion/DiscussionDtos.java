package vn.edu.lms.discussion;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class DiscussionDtos {
    private DiscussionDtos() {}

    public record PostView(
            Long id,
            Long topicId,
            Long authorId,
            String authorName,
            String content,
            Instant createdAt
    ) {}

    public record TopicView(
            Long id,
            Long courseId,
            Long authorId,
            String authorName,
            String title,
            String content,
            Instant createdAt,
            Integer replyCount
    ) {}

    public record TopicDetailView(
            Long id,
            Long courseId,
            Long authorId,
            String authorName,
            String title,
            String content,
            Instant createdAt,
            List<PostView> posts
    ) {}

    public record CreateTopic(
            @NotBlank(message = "Tiêu đề không được để trống.")
            @Size(max = 200, message = "Tiêu đề không quá 200 ký tự.")
            String title,

            @NotBlank(message = "Nội dung thảo luận không được để trống.")
            String content
    ) {}

    public record CreatePost(
            @NotBlank(message = "Nội dung bình luận không được để trống.")
            String content
    ) {}
}
