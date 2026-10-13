package vn.edu.lms.announcement;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class AnnouncementDtos {
    private AnnouncementDtos() {}

    public record AnnouncementView(
            Long id,
            Long courseId,
            Long authorId,
            String authorName,
            String title,
            String content,
            Instant createdAt
    ) {
        public static AnnouncementView from(CourseAnnouncement a, String authorName) {
            return new AnnouncementView(
                    a.getId(),
                    a.getCourseId(),
                    a.getAuthorId(),
                    authorName,
                    a.getTitle(),
                    a.getContent(),
                    a.getCreatedAt()
            );
        }
    }

    public record CreateAnnouncement(
            @NotBlank(message = "Tiêu đề không được để trống.")
            @Size(max = 200, message = "Tiêu đề không quá 200 ký tự.")
            String title,

            @NotBlank(message = "Nội dung không được để trống.")
            String content
    ) {}
}
