package vn.edu.lms.discussion;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiscussionPostRepository extends JpaRepository<DiscussionPost, Long> {
    List<DiscussionPost> findByTopicIdOrderByCreatedAtAsc(Long topicId);
    void deleteByTopicId(Long topicId);
    void deleteByTopicIdIn(Collection<Long> topicIds);
}
