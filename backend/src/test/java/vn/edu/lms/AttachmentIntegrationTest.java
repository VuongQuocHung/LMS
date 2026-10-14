package vn.edu.lms;

import com.fasterxml.jackson.databind.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.FileTime;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.*;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import vn.edu.lms.assignment.*;
import vn.edu.lms.course.*;
import vn.edu.lms.enrollment.*;
import vn.edu.lms.file.*;
import vn.edu.lms.user.*;
import vn.edu.lms.common.ApiException;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:files_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE", "logging.level.root=WARN", "logging.level.org.springframework=WARN", "logging.level.org.hibernate=WARN", "debug=false"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AttachmentIntegrationTest {
    static final Path directory;
    static final String pgSchema = "lms_files_test_" + UUID.randomUUID().toString().replace("-", "");
    static Properties pg;
    static { try { directory = Files.createTempDirectory("lms-file-tests-"); } catch (Exception e) { throw new RuntimeException(e); } }
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) throws Exception {
        r.add("app.files.directory", directory::toString);
        if (Boolean.getBoolean("lms.test.postgres")) {
            pg = new Properties();
            try (var reader = Files.newBufferedReader(Path.of(".env"))) { pg.load(reader); }
            r.add("spring.datasource.url", () -> pg.getProperty("DB_URL"));
            r.add("spring.datasource.username", () -> pg.getProperty("DB_USERNAME"));
            r.add("spring.datasource.password", () -> pg.getProperty("DB_PASSWORD"));
            r.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
            r.add("spring.datasource.hikari.schema", () -> pgSchema);
            r.add("spring.flyway.default-schema", () -> pgSchema);
            r.add("spring.flyway.schemas", () -> pgSchema);
            r.add("spring.jpa.properties.hibernate.default_schema", () -> pgSchema);
        }
    }
    @AfterAll static void cleanupTestResources() throws Exception {
        if (pg != null && pgSchema.matches("lms_files_test_[a-f0-9]{32}")) {
            try (var connection = java.sql.DriverManager.getConnection(pg.getProperty("DB_URL"),
                    pg.getProperty("DB_USERNAME"), pg.getProperty("DB_PASSWORD")); var statement = connection.createStatement()) {
                statement.execute("DROP SCHEMA IF EXISTS " + pgSchema + " CASCADE");
            }
        }
        try (var paths = Files.list(directory)) {
            for (Path path : paths.toList()) Files.deleteIfExists(path);
        }
        Files.deleteIfExists(directory);
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository users;
    @Autowired CourseRepository courses;
    @Autowired LessonRepository lessons;
    @Autowired EnrollmentRepository enrollments;
    @Autowired AssignmentRepository assignments;
    @Autowired AssignmentSubmissionRepository submissions;
    @Autowired FileAttachmentRepository files;
    @Autowired AttachmentService service;
    @Autowired AssignmentService assignmentService;
    @Autowired CourseService courseService;
    @Autowired LocalFileStorage storage;
    @Autowired PlatformTransactionManager transactions;
    UserAccount teacher, student, other;
    Course course;
    Lesson lesson;
    Assignment assignment;
    MockHttpSession teacherSession, studentSession;

    @BeforeEach void setup() throws Exception {
        teacher = users.findByEmail("teacher@lms.local").orElseThrow();
        student = users.findByEmail("student@lms.local").orElseThrow();
        other = users.findByEmail("student2@lms.local").orElseThrow();
        course = courses.saveAndFlush(new Course(teacher.getId(), "File test", "Test", CourseStatus.PUBLISHED));
        lesson = lessons.saveAndFlush(new Lesson(course.getId(), "Lesson", "Body", 1, true));
        enrollments.saveAndFlush(new Enrollment(course.getId(), student.getId()));
        assignment = assignments.saveAndFlush(new Assignment(course.getId(), "Essay", "Write", AssignmentType.ESSAY,
                null, null, 10.0, AssignmentStatus.PUBLISHED));
        teacherSession = login(teacher.getEmail()); studentSession = login(student.getEmail());
    }
    MockMultipartFile file(String name) { return new MockMultipartFile("file", name, "application/octet-stream", "hello file".getBytes(StandardCharsets.UTF_8)); }
    MockHttpSession login(String email) throws Exception {
        MockHttpSession session = new MockHttpSession();
        var csrf = token(session);
        return (MockHttpSession) mvc.perform(post("/api/v1/auth/login").session(session)
            .header(csrf.get("headerName").asText(), csrf.get("token").asText()).param("email", email).param("password", "Demo@12345"))
            .andExpect(status().isNoContent()).andReturn().getRequest().getSession(false);
    }
    JsonNode token(MockHttpSession session) throws Exception {
        return mapper.readTree(mvc.perform(get("/api/v1/auth/csrf").session(session)).andReturn().getResponse().getContentAsString());
    }
    long upload(String kind, Long id, MockHttpSession session, MockMultipartFile file) throws Exception {
        var csrf = token(session);
        return mapper.readTree(mvc.perform(multipart("/api/v1/" + kind + "/" + id + "/files").file(file).session(session)
            .header(csrf.get("headerName").asText(), csrf.get("token").asText())).andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString()).get("id").asLong();
    }
    @Test void downloadChecksEnrollmentOwnerPublicationAndCsrf() throws Exception {
        long id = upload("lessons", lesson.getId(), teacherSession, file("bài học.txt"));
        mvc.perform(get("/api/v1/files/" + id + "/download").session(studentSession))
            .andExpect(status().isOk()).andExpect(content().bytes(file("a.txt").getBytes()))
            .andExpect(header().string("Cache-Control", "private, no-store"))
            .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment")));
        mvc.perform(get("/api/v1/files/" + id + "/download")).andExpect(status().isUnauthorized());
        for (String email : List.of(other.getEmail(), "teacher2@lms.local", "admin@lms.local")) {
            mvc.perform(get("/api/v1/files/" + id + "/download").session(login(email))).andExpect(status().isForbidden());
        }
        mvc.perform(multipart("/api/v1/lessons/" + lesson.getId() + "/files").file(file("a.txt")).session(teacherSession))
            .andExpect(status().isForbidden());
        lesson.setPublished(false); lessons.saveAndFlush(lesson);
        mvc.perform(get("/api/v1/files/" + id + "/download").session(studentSession)).andExpect(status().isForbidden());
        lesson.setPublished(true); lessons.saveAndFlush(lesson);
        course.setStatus(CourseStatus.ARCHIVED); courses.saveAndFlush(course);
        mvc.perform(get("/api/v1/files/" + id + "/download").session(studentSession)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/files/" + id + "/download").session(teacherSession)).andExpect(status().isOk());
    }
    @Test void draftIsNotSubmittedAndFileOnlySubmissionIsImmutable() throws Exception {
        service.saveDraft(assignment.getId(), "saved text", student);
        assertThat(service.draft(assignment.getId(), student).content()).isEqualTo("saved text");
        long id = upload("drafts", assignment.getId(), studentSession, file("answer.txt"));
        assertThat(assignmentService.getAssignment(assignment.getId(), student).mySubmitted()).isFalse();
        assertThat(assignmentService.listSubmissions(assignment.getId(), teacher)).isEmpty();
        assertThat(assignmentService.getGradebook(course.getId(), teacher).entries().get(0).scores()).isEmpty();
        mvc.perform(get("/api/v1/files/" + id + "/download").session(teacherSession)).andExpect(status().isForbidden());
        var csrf = token(studentSession);
        String json = mvc.perform(post("/api/v1/assignments/" + assignment.getId() + "/submit-essay").session(studentSession)
            .header(csrf.get("headerName").asText(), csrf.get("token").asText()).contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SUBMITTED")).andReturn().getResponse().getContentAsString();
        long sub = mapper.readTree(json).get("id").asLong();
        assertThat(files.findBySubmissionIdOrderByIdAsc(sub)).hasSize(1);
        mvc.perform(get("/api/v1/files/" + id + "/download").session(teacherSession)).andExpect(status().isOk());
        enrollments.saveAndFlush(new Enrollment(course.getId(), other.getId()));
        mvc.perform(get("/api/v1/files/" + id + "/download").session(login(other.getEmail()))).andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/files/" + id).session(studentSession)
            .header(csrf.get("headerName").asText(), csrf.get("token").asText())).andExpect(status().isForbidden());
        assertThatThrownBy(() -> service.saveDraft(assignment.getId(), "changed", student)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.upload("drafts", assignment.getId(), file("extra.txt"), student)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.submitEssay(assignment.getId(), "twice", student)).isInstanceOf(ApiException.class);
    }
    @Test void invalidEmptyOversizeAndTraversalFilesAreRejected() throws Exception {
        for (MockMultipartFile invalid : List.of(file("fake.pdf"), file("bad.exe"), file("../bad.txt"),
                new MockMultipartFile("file", "empty.txt", "text/plain", new byte[0]),
                new MockMultipartFile("file", "large.txt", "text/plain", new byte[20 * 1024 * 1024 + 1]))) {
            var csrf = token(teacherSession);
            mvc.perform(multipart("/api/v1/assignments/" + assignment.getId() + "/files").file(invalid).session(teacherSession)
                .header(csrf.get("headerName").asText(), csrf.get("token").asText())).andExpect(status().isBadRequest());
        }
        assertThat(files.findByAssignmentIdOrderByIdAsc(assignment.getId())).isEmpty();
        assertThatThrownBy(() -> service.submitEssay(assignment.getId(), "", student)).isInstanceOf(ApiException.class);
    }
    @Test void openTimeAndLateSubmissionAreEnforced() {
        assignment.setOpenAt(Instant.now().plusSeconds(3600)); assignments.saveAndFlush(assignment);
        assertThatThrownBy(() -> service.upload("drafts", assignment.getId(), file("a.txt"), student)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.submitEssay(assignment.getId(), "text", student)).isInstanceOf(ApiException.class);
        assignment.setOpenAt(null); assignment.setDueAt(Instant.now().minusSeconds(60)); assignments.saveAndFlush(assignment);
        assertThat(service.submitEssay(assignment.getId(), "text", student).getStatus()).isEqualTo(SubmissionStatus.LATE);
    }
    @Test void concurrentUploadsCannotExceedFiveFiles() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(6);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Boolean>> results = new ArrayList<>();
            for (int i = 0; i < 6; i++) results.add(pool.submit(() -> {
                start.await();
                try { service.upload("assignments", assignment.getId(), file("same.txt"), teacher); return true; }
                catch (ApiException e) { assertThat(e.getCode()).isEqualTo("FILE_LIMIT"); return false; }
            }));
            start.countDown(); int successes = 0;
            for (var r : results) if (r.get(30, TimeUnit.SECONDS)) successes++;
            assertThat(successes).isEqualTo(5);
            assertThat(files.findByAssignmentIdOrderByIdAsc(assignment.getId())).hasSize(5);
        } finally { pool.shutdownNow(); }
    }
    @Test void uploadRacingWithSubmitCannotChangeFinalFiles() throws Exception {
        service.upload("drafts", assignment.getId(), file("first.txt"), student);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            var upload = pool.submit(() -> {
                start.await();
                try { service.upload("drafts", assignment.getId(), file("second.txt"), student); return true; }
                catch (ApiException e) { assertThat(e.getCode()).isEqualTo("ALREADY_SUBMITTED"); return false; }
            });
            var submit = pool.submit(() -> { start.await(); return service.submitEssay(assignment.getId(), "", student); });
            start.countDown();
            boolean uploaded = upload.get(30, TimeUnit.SECONDS);
            var saved = submit.get(30, TimeUnit.SECONDS);
            assertThat(files.findBySubmissionIdOrderByIdAsc(saved.getId())).hasSize(uploaded ? 2 : 1);
            assertThat(service.draft(assignment.getId(), student).files()).isEmpty();
        } finally { pool.shutdownNow(); }
    }
    @Test void rollbackRemovesBytesAndDeleteRetriesOrphans() throws Exception {
        Set<Path> before;
        try (var paths = Files.list(directory)) { before = new HashSet<>(paths.toList()); }
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            service.upload("lessons", lesson.getId(), file("rollback.txt"), teacher);
            tx.setRollbackOnly();
        });
        try (var paths = Files.list(directory)) { assertThat(paths.toList()).containsExactlyInAnyOrderElementsOf(before); }
        var uploaded = service.upload("lessons", lesson.getId(), file("delete.txt"), teacher);
        String key = files.findById(uploaded.id()).orElseThrow().getStorageKey();
        service.delete(uploaded.id(), teacher);
        assertThat(Files.exists(storage.path(key))).isFalse();
        String orphan = storage.write("orphan".getBytes(StandardCharsets.UTF_8));
        Files.setLastModifiedTime(storage.path(orphan), FileTime.from(Instant.now().minusSeconds(90000)));
        storage.cleanup();
        assertThat(Files.exists(storage.path(orphan))).isFalse();
    }
    @Test void parentDeletionCascadesMetadataAndCleanupKeepsLiveFiles() throws Exception {
        var lessonFile = service.upload("lessons", lesson.getId(), file("lesson.txt"), teacher);
        var assignmentFile = service.upload("assignments", assignment.getId(), file("assignment.txt"), teacher);
        var draftFile = service.upload("drafts", assignment.getId(), file("draft.txt"), student);
        List<String> keys = List.of(lessonFile, assignmentFile, draftFile).stream()
            .map(f -> files.findById(f.id()).orElseThrow().getStorageKey()).toList();
        for (String key : keys) Files.setLastModifiedTime(storage.path(key), FileTime.from(Instant.now().minusSeconds(90000)));
        storage.cleanup();
        for (String key : keys) assertThat(Files.exists(storage.path(key))).isTrue();
        // Một instance storage mới vẫn đọc được nội dung lưu trên ổ đĩa.
        assertThat(Files.readString(new LocalFileStorage(directory.toString(), files).path(keys.get(0)))).isEqualTo("hello file");
        courseService.delete(course.getId(), teacher);
        for (var f : List.of(lessonFile, assignmentFile, draftFile)) assertThat(files.existsById(f.id())).isFalse();
        storage.cleanup();
        for (String key : keys) assertThat(Files.exists(storage.path(key))).isFalse();
    }
}
