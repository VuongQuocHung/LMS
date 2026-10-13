package vn.edu.lms.discussion;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "discussion_posts")
public class DiscussionPost {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "topic_id", nullable = false)
    private Long topicId;

    @Column(name = "author_id", nullable = false)
    private Long authorId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected DiscussionPost() {}

    public DiscussionPost(Long topicId, Long authorId, String content) {
        this.topicId = topicId;
        this.authorId = authorId;
        this.content = content;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getTopicId() { return topicId; }
    public Long getAuthorId() { return authorId; }
    public String getContent() { return content; }
    public Instant getCreatedAt() { return createdAt; }

    public void setContent(String content) { this.content = content; }
}
