package vn.edu.lms;

import org.springframework.boot.SpringApplication;

/** Chỉ dùng xem thử base khi chưa có PostgreSQL; không nằm trong JAR production. */
public class TestLmsApplication {
    /** Chạy API thật với database H2 trong RAM; mất dữ liệu khi dừng tiến trình. */
    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(LmsApplication.class);
        application.setAdditionalProfiles("test");
        application.run(args);
    }
}
