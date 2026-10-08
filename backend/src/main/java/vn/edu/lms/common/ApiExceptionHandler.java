package vn.edu.lms.common;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.security.access.AccessDeniedException;

@RestControllerAdvice
public class ApiExceptionHandler {
    // Stack trace chỉ nằm trong log backend, không được gửi về trình duyệt.
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    /** Chuyển lỗi nghiệp vụ sang JSON và HTTP status tương ứng. */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleBusiness(ApiException exception) {
        return ResponseEntity.status(exception.getStatus())
                .body(ApiError.of(exception.getCode(), exception.getMessage()));
    }

    /** Gom lỗi @Valid theo tên ô nhập liệu để giao diện hiển thị dễ hiểu. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> errors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.badRequest().body(new ApiError("VALIDATION_ERROR", "Vui lòng kiểm tra dữ liệu.", errors));
    }

    /** Trả 400 cho JSON hỏng hoặc ID không đúng kiểu số. */
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiError> handleBadRequest(Exception exception) {
        return ResponseEntity.badRequest().body(ApiError.of("BAD_REQUEST", "Dữ liệu gửi lên không hợp lệ."));
    }

    /** Xử lý lỗi quyền từ @PreAuthorize tại controller/service. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleForbidden(AccessDeniedException exception) {
        return ResponseEntity.status(403).body(ApiError.of("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này."));
    }

    /** Che thông tin nội bộ khi có lỗi chưa dự kiến. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception exception) {
        log.error("Lỗi xử lý request", exception);
        return ResponseEntity.internalServerError().body(ApiError.of("INTERNAL_ERROR", "Server gặp lỗi. Vui lòng thử lại."));
    }
}
