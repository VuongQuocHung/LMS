package vn.edu.lms;

import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import vn.edu.lms.user.UserRepository;
import vn.edu.lms.course.CourseRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BaseIntegrationTest {
    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository users;
    @Autowired private CourseRepository courses;

    /** Mỗi test bắt đầu với sinh viên đang hoạt động; không phụ thuộc thứ tự test. */
    @BeforeEach
    void enableStudent() {
        var student = users.findByEmail("student@lms.local").orElseThrow();
        student.setEnabled(true);
        users.saveAndFlush(student);
    }

    /** Anonymous chỉ được health/CSRF, không được đọc hồ sơ. */
    @Test
    void anonymousCannotReadPrivateData() throws Exception {
        mvc.perform(get("/api/v1/health")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    /** Đăng nhập thật tạo session, hồ sơ không lộ hash, logout hủy session. */
    @Test
    void loginAndLogoutUseRealSession() throws Exception {
        MockHttpSession session = login("student@lms.local");
        mvc.perform(get("/api/v1/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
        Csrf csrf = csrf(session);
        mvc.perform(post("/api/v1/auth/logout").session(session).header(csrf.header(), csrf.token()))
                .andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }

    /** CSRF bảo vệ cả login, không chỉ API nghiệp vụ. */
    @Test
    void loginWithoutCsrfAndWrongPasswordAreRejected() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                .param("email", "student@lms.local").param("password", "Demo@12345"))
                .andExpect(status().isForbidden());
        MockHttpSession session = new MockHttpSession();
        Csrf csrf = csrf(session);
        mvc.perform(post("/api/v1/auth/login").session(session).header(csrf.header(), csrf.token())
                .param("email", "student@lms.local").param("password", "wrong"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("LOGIN_FAILED"));
    }

    /** Ghi danh và trạng thái bài học được kiểm tra phía server. */
    @Test
    void studentSeesOnlyEnrolledCourseAndPublishedLessons() throws Exception {
        MockHttpSession session = login("student@lms.local");
        String body = mvc.perform(get("/api/v1/courses").session(session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(body).get(0).get("id").asLong();
        mvc.perform(get("/api/v1/courses/" + id).session(session))
                .andExpect(status().isOk()).andExpect(jsonPath("$.lessons.length()").value(2));
        mvc.perform(get("/api/v1/courses/" + id).session(login("student2@lms.local")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/courses/" + id).session(login("teacher2@lms.local")))
                .andExpect(status().isForbidden());
    }

    /** Role STUDENT không được mở API admin hay tạo khóa, dù gọi trực tiếp. */
    @Test
    void studentCannotUseAdminOrTeacherOperations() throws Exception {
        MockHttpSession session = login("student@lms.local");
        mvc.perform(get("/api/v1/users").session(session)).andExpect(status().isForbidden());
        Csrf csrf = csrf(session);
        mvc.perform(post("/api/v1/courses").session(session).header(csrf.header(), csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Khóa mới\",\"description\":\"\"}"))
                .andExpect(status().isForbidden());
    }

    /** Form lỗi trả fieldErrors; chủ khóa mới được gán từ session giảng viên. */
    @Test
    void teacherCreatesDraftWithValidationAndCsrf() throws Exception {
        MockHttpSession session = login("teacher@lms.local");
        mvc.perform(post("/api/v1/courses").session(session)
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Khóa mới\",\"description\":\"\"}"))
                .andExpect(status().isForbidden());
        Csrf csrf = csrf(session);
        mvc.perform(post("/api/v1/courses").session(session).header(csrf.header(), csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"  \",\"description\":\"\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.title").exists());
        String body = mvc.perform(post("/api/v1/courses").session(session).header(csrf.header(), csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Khóa mới\",\"description\":\"Mô tả\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(body).get("id").asLong();
        assertThat(courses.findById(id).orElseThrow().getTeacherId())
                .isEqualTo(users.findByEmail("teacher@lms.local").orElseThrow().getId());
    }

    /** Khóa tài khoản có hiệu lực với cả hai session đã đăng nhập từ trước. */
    @Test
    void lockingUserInvalidatesExistingSessionsOnNextRequest() throws Exception {
        MockHttpSession studentSession = login("student@lms.local");
        MockHttpSession secondSession = login("student@lms.local");
        MockHttpSession adminSession = login("admin@lms.local");
        long studentId = users.findByEmail("student@lms.local").orElseThrow().getId();
        Csrf csrf = csrf(adminSession);
        mvc.perform(patch("/api/v1/users/" + studentId).session(adminSession).header(csrf.header(), csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.enabled").value(false));
        for (MockHttpSession session : new MockHttpSession[]{studentSession, secondSession}) {
            mvc.perform(get("/api/v1/auth/me").session(session))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACCOUNT_DISABLED"));
            assertThat(session.isInvalid()).isTrue();
        }
        MockHttpSession newSession = new MockHttpSession();
        Csrf newCsrf = csrf(newSession);
        mvc.perform(post("/api/v1/auth/login").session(newSession).header(newCsrf.header(), newCsrf.token())
                .param("email", "student@lms.local").param("password", "Demo@12345"))
                .andExpect(status().isUnauthorized());
    }

    /** Admin không thể vô tình khóa chính tài khoản đang quản trị. */
    @Test
    void adminCannotLockSelf() throws Exception {
        MockHttpSession session = login("admin@lms.local");
        long adminId = users.findByEmail("admin@lms.local").orElseThrow().getId();
        Csrf csrf = csrf(session);
        mvc.perform(patch("/api/v1/users/" + adminId).session(session).header(csrf.header(), csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SELF_LOCK_NOT_ALLOWED"));
    }

    /** Admin có thể tạo và cập nhật tài khoản; kiểm tra email trùng lặp và phân quyền. */
    @Test
    void adminCanCreateAndUpdateUser() throws Exception {
        MockHttpSession adminSession = login("admin@lms.local");
        Csrf csrf = csrf(adminSession);

        // Tạo tài khoản mới thành công
        String createJson = """
                {
                    "email": "newstudent@lms.local",
                    "password": "Password@123",
                    "fullName": "Trần Văn Mới",
                    "studentCode": "SV099",
                    "role": "STUDENT"
                }
                """;
        String response = mvc.perform(post("/api/v1/users").session(adminSession).header(csrf.header(), csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(createJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("newstudent@lms.local"))
                .andExpect(jsonPath("$.studentCode").value("SV099"))
                .andReturn().getResponse().getContentAsString();
        long newUserId = mapper.readTree(response).get("id").asLong();

        // Tạo trùng email bị 409
        mvc.perform(post("/api/v1/users").session(adminSession).header(csrf.header(), csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(createJson))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"));

        // Cập nhật thông tin tài khoản
        String updateJson = """
                {
                    "fullName": "Trần Văn Mới Đã Sửa",
                    "studentCode": "SV099",
                    "role": "STUDENT",
                    "enabled": true
                }
                """;
        mvc.perform(put("/api/v1/users/" + newUserId).session(adminSession).header(csrf.header(), csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Trần Văn Mới Đã Sửa"));

        // Sinh viên không được phép gọi POST /users
        MockHttpSession studentSession = login("student@lms.local");
        Csrf studentCsrf = csrf(studentSession);
        mvc.perform(post("/api/v1/users").session(studentSession).header(studentCsrf.header(), studentCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(createJson))
                .andExpect(status().isForbidden());
    }

    /** Chủ khóa có thể cập nhật thông tin và trạng thái khóa học; giảng viên khác bị chặn. */
    @Test
    void courseOwnerCanUpdateAndChangeStatus() throws Exception {
        MockHttpSession teacherSession = login("teacher@lms.local");
        Csrf csrf = csrf(teacherSession);

        // Tạo khóa nháp
        String createJson = "{\"title\":\"Khóa Mạng Nâng Cao\",\"description\":\"Mô tả chi tiết\"}";
        String res = mvc.perform(post("/api/v1/courses").session(teacherSession).header(csrf.header(), csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(createJson))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long courseId = mapper.readTree(res).get("id").asLong();

        // Sửa khóa
        String updateJson = "{\"title\":\"Khóa Mạng Nâng Cao 2026\",\"description\":\"Mô tả mới cập nhật\"}";
        mvc.perform(put("/api/v1/courses/" + courseId).session(teacherSession).header(csrf.header(), csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Khóa Mạng Nâng Cao 2026"));

        // Giảng viên khác không sửa được
        MockHttpSession otherTeacher = login("teacher2@lms.local");
        Csrf otherCsrf = csrf(otherTeacher);
        mvc.perform(put("/api/v1/courses/" + courseId).session(otherTeacher).header(otherCsrf.header(), otherCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(updateJson))
                .andExpect(status().isForbidden());

        // Đổi trạng thái sang PUBLISHED
        mvc.perform(patch("/api/v1/courses/" + courseId + "/status").session(teacherSession).header(csrf.header(), csrf.token())
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
    }

    /** Quản lý bài học: tạo bài, sửa bài, sinh viên không đọc được bài nháp, xóa bài. */
    @Test
    void lessonCrudAndPermissionChecks() throws Exception {
        MockHttpSession teacherSession = login("teacher@lms.local");
        Csrf teacherCsrf = csrf(teacherSession);
        long courseId = courses.findFirstByTitle("Lập trình mạng").orElseThrow().getId();

        // Tạo bài học nháp mới
        String createLessonJson = """
                {
                    "title": "Bài 04: Bảo mật mạng",
                    "content": "Nội dung bảo mật mạng...",
                    "position": 4,
                    "published": false
                }
                """;
        String lessonRes = mvc.perform(post("/api/v1/courses/" + courseId + "/lessons")
                .session(teacherSession).header(teacherCsrf.header(), teacherCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(createLessonJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Bài 04: Bảo mật mạng"))
                .andExpect(jsonPath("$.published").value(false))
                .andReturn().getResponse().getContentAsString();
        long lessonId = mapper.readTree(lessonRes).get("id").asLong();

        // Sinh viên đã ghi danh không được xem bài nháp này
        MockHttpSession studentSession = login("student@lms.local");
        mvc.perform(get("/api/v1/courses/" + courseId + "/lessons/" + lessonId).session(studentSession))
                .andExpect(status().isForbidden());

        // Giảng viên chuyển bài học sang published
        String updateLessonJson = """
                {
                    "title": "Bài 04: Bảo mật mạng (Đã duyệt)",
                    "content": "Nội dung bảo mật mạng cập nhật...",
                    "position": 4,
                    "published": true
                }
                """;
        mvc.perform(put("/api/v1/courses/" + courseId + "/lessons/" + lessonId)
                .session(teacherSession).header(teacherCsrf.header(), teacherCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(updateLessonJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published").value(true));

        // Sinh viên giờ đã xem được bài học này
        mvc.perform(get("/api/v1/courses/" + courseId + "/lessons/" + lessonId).session(studentSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Bài 04: Bảo mật mạng (Đã duyệt)"));

        // Xóa bài học
        mvc.perform(delete("/api/v1/courses/" + courseId + "/lessons/" + lessonId)
                .session(teacherSession).header(teacherCsrf.header(), teacherCsrf.token()))
                .andExpect(status().isNoContent());
    }

    /** Quản lý ghi danh: thêm sinh viên, chặn ghi danh trùng, hủy ghi danh. */
    @Test
    void enrollmentManagementFlow() throws Exception {
        MockHttpSession teacherSession = login("teacher@lms.local");
        Csrf teacherCsrf = csrf(teacherSession);
        long courseId = courses.findFirstByTitle("Lập trình mạng").orElseThrow().getId();
        long student2Id = users.findByEmail("student2@lms.local").orElseThrow().getId();

        // Thêm student2 vào khóa học
        mvc.perform(post("/api/v1/courses/" + courseId + "/enrollments")
                .session(teacherSession).header(teacherCsrf.header(), teacherCsrf.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":" + student2Id + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.studentId").value(student2Id));

        // Ghi danh trùng bị chặn 409 CONFLICT
        mvc.perform(post("/api/v1/courses/" + courseId + "/enrollments")
                .session(teacherSession).header(teacherCsrf.header(), teacherCsrf.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":" + student2Id + "}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_ENROLLED"));

        // Xem danh sách ghi danh
        mvc.perform(get("/api/v1/courses/" + courseId + "/enrollments").session(teacherSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        // Hủy ghi danh student2
        mvc.perform(delete("/api/v1/courses/" + courseId + "/enrollments/" + student2Id)
                .session(teacherSession).header(teacherCsrf.header(), teacherCsrf.token()))
                .andExpect(status().isNoContent());

        // Sau khi hủy, danh sách chỉ còn 1
        mvc.perform(get("/api/v1/courses/" + courseId + "/enrollments").session(teacherSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    /** Luồng trắc nghiệm: Tạo bài, thêm câu hỏi, học viên làm bài, tự chấm điểm và xem kết quả. */
    @Test
    void quizLifecycleAndAutoGrading() throws Exception {
        MockHttpSession teacherSession = login("teacher@lms.local");
        Csrf teacherCsrf = csrf(teacherSession);
        long courseId = courses.findFirstByTitle("Lập trình mạng").orElseThrow().getId();

        // 1. Giảng viên tạo bài tập trắc nghiệm dạng DRAFT
        String createJson = """
            {
                "title": "Trắc nghiệm chương 1: Giao thức mạng",
                "description": "Kiểm tra kiến thức cơ bản về mô hình OSI và TCP/IP",
                "type": "QUIZ",
                "maxScore": 10.0,
                "status": "DRAFT"
            }
            """;
        String assignBody = mvc.perform(post("/api/v1/courses/" + courseId + "/assignments")
                .session(teacherSession).header(teacherCsrf.header(), teacherCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(createJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("QUIZ"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn().getResponse().getContentAsString();
        long assignId = mapper.readTree(assignBody).get("id").asLong();

        // 2. Giảng viên thêm câu hỏi 1 (2 điểm, đáp án đúng là phương án 2)
        String q1Json = """
            {
                "questionText": "Mô hình OSI có bao nhiêu tầng?",
                "points": 2.0,
                "position": 1,
                "options": [
                    { "optionText": "4 tầng", "isCorrect": false, "position": 1 },
                    { "optionText": "7 tầng", "isCorrect": true, "position": 2 },
                    { "optionText": "5 tầng", "isCorrect": false, "position": 3 }
                ]
            }
            """;
        String q1Body = mvc.perform(post("/api/v1/assignments/" + assignId + "/questions")
                .session(teacherSession).header(teacherCsrf.header(), teacherCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(q1Json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long q1Id = mapper.readTree(q1Body).get("id").asLong();
        long q1CorrectOptId = mapper.readTree(q1Body).get("options").get(1).get("id").asLong();

        // 3. Giảng viên thêm câu hỏi 2 (3 điểm, đáp án đúng là phương án 1)
        String q2Json = """
            {
                "questionText": "Giao thức nào hoạt động ở tầng giao vận?",
                "points": 3.0,
                "position": 2,
                "options": [
                    { "optionText": "TCP", "isCorrect": true, "position": 1 },
                    { "optionText": "IP", "isCorrect": false, "position": 2 },
                    { "optionText": "HTTP", "isCorrect": false, "position": 3 }
                ]
            }
            """;
        String q2Body = mvc.perform(post("/api/v1/assignments/" + assignId + "/questions")
                .session(teacherSession).header(teacherCsrf.header(), teacherCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(q2Json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long q2Id = mapper.readTree(q2Body).get("id").asLong();
        long q2WrongOptId = mapper.readTree(q2Body).get("options").get(1).get("id").asLong();

        // 4. Giảng viên công bố bài tập
        String updateJson = """
            {
                "title": "Trắc nghiệm chương 1: Giao thức mạng",
                "description": "Kiểm tra kiến thức cơ bản về mô hình OSI và TCP/IP",
                "maxScore": 10.0,
                "status": "PUBLISHED"
            }
            """;
        mvc.perform(put("/api/v1/assignments/" + assignId)
                .session(teacherSession).header(teacherCsrf.header(), teacherCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        // 5. Sinh viên vào xem đề thi: KHÔNG ĐƯỢC thấy đáp án đúng
        MockHttpSession studentSession = login("student@lms.local");
        Csrf studentCsrf = csrf(studentSession);
        mvc.perform(get("/api/v1/assignments/" + assignId + "/questions").session(studentSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].options[0].isCorrect").doesNotExist())
                .andExpect(jsonPath("$[0].options[1].isCorrect").doesNotExist());

        // 6. Sinh viên nộp bài: đúng câu 1 (2đ), sai câu 2 (0đ). Tổng 2/5 điểm = 4.0/10.0 điểm
        String submitJson = String.format("""
            {
                "answers": {
                    "%d": %d,
                    "%d": %d
                }
            }
            """, q1Id, q1CorrectOptId, q2Id, q2WrongOptId);

        mvc.perform(post("/api/v1/assignments/" + assignId + "/submit-quiz")
                .session(studentSession).header(studentCsrf.header(), studentCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(submitJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(4.0))
                .andExpect(jsonPath("$.status").value("GRADED"));

        // 7. Nộp lại bị chặn 409 CONFLICT
        mvc.perform(post("/api/v1/assignments/" + assignId + "/submit-quiz")
                .session(studentSession).header(studentCsrf.header(), studentCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(submitJson))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_SUBMITTED"));

        // 8. Sinh viên xem lại bài làm đã nộp
        mvc.perform(get("/api/v1/assignments/" + assignId + "/my-submission").session(studentSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(4.0))
                .andExpect(jsonPath("$.quizAnswers.length()").value(2));

        // 9. Giảng viên xem danh sách bài nộp của cả lớp
        mvc.perform(get("/api/v1/assignments/" + assignId + "/submissions").session(teacherSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].score").value(4.0));
    }

    /** Luồng bài viết: Sinh viên nộp bài tự luận, giảng viên chấm điểm và nhận xét. */
    @Test
    void essayAssignmentWorkflowAndManualGrading() throws Exception {
        MockHttpSession teacherSession = login("teacher@lms.local");
        Csrf teacherCsrf = csrf(teacherSession);
        long courseId = courses.findFirstByTitle("Lập trình mạng").orElseThrow().getId();

        // 1. Giảng viên tạo bài viết tự luận đã công bố
        String createJson = """
            {
                "title": "Bài tập tự luận: Phân tích cơ chế bắt tay 3 bước của TCP",
                "description": "Trình bày các gói tin SYN, SYN-ACK, ACK và ý nghĩa của việc đồng bộ Sequence Number.",
                "type": "ESSAY",
                "maxScore": 10.0,
                "status": "PUBLISHED"
            }
            """;
        String assignBody = mvc.perform(post("/api/v1/courses/" + courseId + "/assignments")
                .session(teacherSession).header(teacherCsrf.header(), teacherCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(createJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("ESSAY"))
                .andReturn().getResponse().getContentAsString();
        long assignId = mapper.readTree(assignBody).get("id").asLong();

        // 2. Sinh viên nộp bài tự luận
        MockHttpSession studentSession = login("student@lms.local");
        Csrf studentCsrf = csrf(studentSession);
        String submitJson = """
            {
                "content": "Cơ chế bắt tay ba bước giúp khởi tạo kết nối tin cậy giữa Client và Server..."
            }
            """;
        String subBody = mvc.perform(post("/api/v1/assignments/" + assignId + "/submit-essay")
                .session(studentSession).header(studentCsrf.header(), studentCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(submitJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.score").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        long submissionId = mapper.readTree(subBody).get("id").asLong();

        // 3. Giảng viên chấm điểm 9.0 và ghi nhận xét
        String gradeJson = """
            {
                "score": 9.0,
                "feedback": "Phân tích rõ ràng, giải thích Sequence Number rất chính xác."
            }
            """;
        mvc.perform(put("/api/v1/submissions/" + submissionId + "/grade")
                .session(teacherSession).header(teacherCsrf.header(), teacherCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(gradeJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("GRADED"))
                .andExpect(jsonPath("$.score").value(9.0))
                .andExpect(jsonPath("$.feedback").value("Phân tích rõ ràng, giải thích Sequence Number rất chính xác."));

        // 4. Sinh viên xem lại điểm và nhận xét của giảng viên
        mvc.perform(get("/api/v1/assignments/" + assignId + "/my-submission").session(studentSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("GRADED"))
                .andExpect(jsonPath("$.score").value(9.0))
                .andExpect(jsonPath("$.feedback").exists());

        // 5. Giảng viên khác không thuộc khóa học không thể chấm điểm bài này (403)
        MockHttpSession otherTeacherSession = login("teacher2@lms.local");
        Csrf otherTeacherCsrf = csrf(otherTeacherSession);
        mvc.perform(put("/api/v1/submissions/" + submissionId + "/grade")
                .session(otherTeacherSession).header(otherTeacherCsrf.header(), otherTeacherCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(gradeJson))
                .andExpect(status().isForbidden());
    }

    /** Kiểm tra sổ điểm (Gradebook), lịch học (Schedule), thông báo, thảo luận và tiến độ bài học. */
    @Test
    void gradebookScheduleAnnouncementsDiscussionsAndProgress() throws Exception {
        MockHttpSession teacherSession = login("teacher@lms.local");
        Csrf teacherCsrf = csrf(teacherSession);
        long courseId = courses.findFirstByTitle("Lập trình mạng").orElseThrow().getId();

        // 1. Sổ điểm khóa học (Gradebook)
        mvc.perform(get("/api/v1/courses/" + courseId + "/gradebook").session(teacherSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignments").isArray())
                .andExpect(jsonPath("$.entries").isArray());

        // 2. Lịch học & Hạn nộp (Schedule)
        MockHttpSession studentSession = login("student@lms.local");
        Csrf studentCsrf = csrf(studentSession);
        mvc.perform(get("/api/v1/schedule").session(studentSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.upcoming").isArray())
                .andExpect(jsonPath("$.past").isArray());

        // 3. Thông báo khóa học (Announcements)
        String annJson = """
            {
                "title": "Nhắc nhở kiểm tra giữa kỳ",
                "content": "Các em lưu ý ôn tập chương 1 và chương 2 để làm bài kiểm tra vào tuần sau."
            }
            """;
        mvc.perform(post("/api/v1/courses/" + courseId + "/announcements")
                .session(teacherSession).header(teacherCsrf.header(), teacherCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(annJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Nhắc nhở kiểm tra giữa kỳ"));

        mvc.perform(get("/api/v1/courses/" + courseId + "/announcements").session(studentSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Nhắc nhở kiểm tra giữa kỳ"));

        // 4. Diễn đàn thảo luận (Discussions)
        String topicJson = """
            {
                "title": "Hỏi về cơ chế Sliding Window",
                "content": "Có bạn nào giải thích giúp mình cơ chế điều khiển luồng bằng cửa sổ trượt không?"
            }
            """;
        String topicBody = mvc.perform(post("/api/v1/courses/" + courseId + "/discussions")
                .session(studentSession).header(studentCsrf.header(), studentCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(topicJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Hỏi về cơ chế Sliding Window"))
                .andReturn().getResponse().getContentAsString();
        long topicId = mapper.readTree(topicBody).get("id").asLong();

        // Giảng viên trả lời chủ đề thảo luận
        String replyJson = """
            {
                "content": "Thầy đã giải thích chi tiết trong slide bài 3, em xem kỹ phần Receiver Window nhé."
            }
            """;
        mvc.perform(post("/api/v1/discussions/" + topicId + "/posts")
                .session(teacherSession).header(teacherCsrf.header(), teacherCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content(replyJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").exists());

        // 5. Đánh dấu tiến độ học tập (Progress)
        long lessonId = 1L; // Bài học đầu tiên
        mvc.perform(post("/api/v1/lessons/" + lessonId + "/progress")
                .session(studentSession).header(studentCsrf.header(), studentCsrf.token())
                .contentType(MediaType.APPLICATION_JSON).content("{\"completed\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed").value(true));

        mvc.perform(get("/api/v1/courses/" + courseId + "/progress").session(studentSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalLessons").isNumber())
                .andExpect(jsonPath("$.completedLessons").isNumber());
    }

    /** Lấy token qua endpoint thật, không bỏ qua CSRF bằng test helper. */
    private Csrf csrf(MockHttpSession session) throws Exception {
        String body = mvc.perform(get("/api/v1/auth/csrf").session(session))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode json = mapper.readTree(body);
        return new Csrf(json.get("headerName").asText(), json.get("token").asText());
    }

    /** Đăng nhập bằng filter thật để test luôn session fixation và persistence. */
    private MockHttpSession login(String email) throws Exception {
        MockHttpSession session = new MockHttpSession();
        Csrf csrf = csrf(session);
        MvcResult result = mvc.perform(post("/api/v1/auth/login").session(session)
                .header(csrf.header(), csrf.token()).param("email", email).param("password", "Demo@12345"))
                .andExpect(status().isNoContent()).andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    /** Cặp tên header/token dùng lại trong một phiên test. */
    private record Csrf(String header, String token) {}
}
