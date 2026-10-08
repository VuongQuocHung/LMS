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
