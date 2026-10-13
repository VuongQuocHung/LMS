package vn.edu.lms.discussion;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.lms.common.ApiException;
import vn.edu.lms.course.Course;
import vn.edu.lms.course.CourseRepository;
import vn.edu.lms.discussion.DiscussionDtos.*;
import vn.edu.lms.enrollment.EnrollmentRepository;
import vn.edu.lms.user.Role;
import vn.edu.lms.user.UserAccount;
import vn.edu.lms.user.UserRepository;

@Service
@Transactional(readOnly = true)
public class DiscussionService {
    private final DiscussionTopicRepository topics;
    private final DiscussionPostRepository posts;
    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;

    public DiscussionService(
            DiscussionTopicRepository topics,
            DiscussionPostRepository posts,
            CourseRepository courses,
            EnrollmentRepository enrollments,
            UserRepository users
    ) {
        this.topics = topics;
        this.posts = posts;
        this.courses = courses;
        this.enrollments = enrollments;
        this.users = users;
    }

    public List<TopicView> listTopics(Long courseId, UserAccount user) {
        Course course = getCourseOrThrow(courseId);
        requireCourseAccess(course, user);

        List<DiscussionTopic> topicList = topics.findByCourseIdOrderByCreatedAtDesc(courseId);
        List<Long> authorIds = topicList.stream().map(DiscussionTopic::getAuthorId).distinct().toList();
        Map<Long, String> authorMap = getAuthorNames(authorIds);

        return topicList.stream().map(t -> {
            int replyCount = posts.findByTopicIdOrderByCreatedAtAsc(t.getId()).size();
            return new TopicView(
                    t.getId(),
                    t.getCourseId(),
                    t.getAuthorId(),
                    authorMap.getOrDefault(t.getAuthorId(), "Người dùng"),
                    t.getTitle(),
                    t.getContent(),
                    t.getCreatedAt(),
                    replyCount
            );
        }).toList();
    }

    public TopicDetailView getTopic(Long topicId, UserAccount user) {
        DiscussionTopic topic = getTopicOrThrow(topicId);
        Course course = getCourseOrThrow(topic.getCourseId());
        requireCourseAccess(course, user);

        List<DiscussionPost> postList = posts.findByTopicIdOrderByCreatedAtAsc(topicId);
        Set<Long> authorIds = new HashSet<>();
        authorIds.add(topic.getAuthorId());
        postList.forEach(p -> authorIds.add(p.getAuthorId()));
        Map<Long, String> authorMap = getAuthorNames(new ArrayList<>(authorIds));

        List<PostView> postViews = postList.stream().map(p -> new PostView(
                p.getId(),
                p.getTopicId(),
                p.getAuthorId(),
                authorMap.getOrDefault(p.getAuthorId(), "Người dùng"),
                p.getContent(),
                p.getCreatedAt()
        )).toList();

        return new TopicDetailView(
                topic.getId(),
                topic.getCourseId(),
                topic.getAuthorId(),
                authorMap.getOrDefault(topic.getAuthorId(), "Người dùng"),
                topic.getTitle(),
                topic.getContent(),
                topic.getCreatedAt(),
                postViews
        );
    }

    @Transactional
    public TopicView createTopic(Long courseId, CreateTopic request, UserAccount user) {
        Course course = getCourseOrThrow(courseId);
        requireCourseAccess(course, user);

        DiscussionTopic topic = new DiscussionTopic(
                courseId,
                user.getId(),
                request.title().trim(),
                request.content().trim()
        );
        DiscussionTopic saved = topics.save(topic);
        return new TopicView(
                saved.getId(),
                saved.getCourseId(),
                saved.getAuthorId(),
                user.getFullName(),
                saved.getTitle(),
                saved.getContent(),
                saved.getCreatedAt(),
                0
        );
    }

    @Transactional
    public PostView createPost(Long topicId, CreatePost request, UserAccount user) {
        DiscussionTopic topic = getTopicOrThrow(topicId);
        Course course = getCourseOrThrow(topic.getCourseId());
        requireCourseAccess(course, user);

        DiscussionPost post = new DiscussionPost(topicId, user.getId(), request.content().trim());
        DiscussionPost saved = posts.save(post);
        return new PostView(
                saved.getId(),
                saved.getTopicId(),
                saved.getAuthorId(),
                user.getFullName(),
                saved.getContent(),
                saved.getCreatedAt()
        );
    }

    @Transactional
    public void deleteTopic(Long topicId, UserAccount user) {
        DiscussionTopic topic = getTopicOrThrow(topicId);
        Course course = getCourseOrThrow(topic.getCourseId());

        boolean isTopicAuthor = topic.getAuthorId().equals(user.getId());
        boolean isCourseOwner = isCourseOwner(course, user);
        if (!isTopicAuthor && !isCourseOwner) {
            throw forbidden();
        }

        posts.deleteByTopicId(topicId);
        topics.delete(topic);
    }

    @Transactional
    public void deletePost(Long postId, UserAccount user) {
        DiscussionPost post = posts.findById(postId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "POST_NOT_FOUND", "Không tìm thấy phản hồi."));
        DiscussionTopic topic = getTopicOrThrow(post.getTopicId());
        Course course = getCourseOrThrow(topic.getCourseId());

        boolean isPostAuthor = post.getAuthorId().equals(user.getId());
        boolean isCourseOwner = isCourseOwner(course, user);
        if (!isPostAuthor && !isCourseOwner) {
            throw forbidden();
        }

        posts.delete(post);
    }

    private Map<Long, String> getAuthorNames(List<Long> authorIds) {
        Map<Long, String> map = new HashMap<>();
        if (!authorIds.isEmpty()) {
            users.findAllById(authorIds).forEach(u -> map.put(u.getId(), u.getFullName()));
        }
        return map;
    }

    private Course getCourseOrThrow(Long id) {
        return courses.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học."));
    }

    private DiscussionTopic getTopicOrThrow(Long id) {
        return topics.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TOPIC_NOT_FOUND", "Không tìm thấy chủ đề thảo luận."));
    }

    private boolean isCourseOwner(Course course, UserAccount user) {
        return user.getRole() == Role.TEACHER && course.getTeacherId().equals(user.getId());
    }

    private void requireCourseAccess(Course course, UserAccount user) {
        boolean isOwner = isCourseOwner(course, user);
        boolean isEnrolled = user.getRole() == Role.STUDENT && enrollments.existsByCourseIdAndStudentId(course.getId(), user.getId());
        if (!isOwner && !isEnrolled) {
            throw forbidden();
        }
    }

    private ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
    }
}
