package vn.edu.lms.common;

import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class HealthController {
    /** Kiểm tra API còn chạy; không thay thế kiểm tra database hay readiness. */
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "application", "lms-backend");
    }
}
