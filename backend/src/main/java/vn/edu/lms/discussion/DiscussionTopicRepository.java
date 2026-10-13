package vn.edu.lms.discussion;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiscussionTopicRepository extends JpaRepository<DiscussionTopic, Long> {
    List<DiscussionTopic> findByCourseIdOrderByCreatedAtDesc(Long courseId);
    void deleteByCourseId(Long courseId);
}
