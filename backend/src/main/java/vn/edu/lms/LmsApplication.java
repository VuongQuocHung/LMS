package vn.edu.lms;

import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class LmsApplication {
    static {
        // Tránh lỗi FATAL: invalid value for parameter "TimeZone": "Asia/Saigon"
        // trên Windows ở Việt Nam khi kết nối tới PostgreSQL.
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
    }

    /** Khởi động API, kết nối database và chạy migration trước khi nhận request. */
    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SpringApplication.run(LmsApplication.class, args);
    }
}
