package vn.edu.lms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class LmsApplication {
    /** Khởi động API, kết nối database và chạy migration trước khi nhận request. */
    public static void main(String[] args) {
        SpringApplication.run(LmsApplication.class, args);
    }
}
