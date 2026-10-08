package vn.edu.lms.common;

import org.springframework.http.HttpStatus;

/** Lỗi nghiệp vụ đã biết, có HTTP status và mã ổn định để frontend xử lý. */
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    /** Khởi tạo lỗi; message là nội dung an toàn để hiển thị cho người dùng. */
    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    /** Lấy HTTP status của lỗi. */
    public HttpStatus getStatus() { return status; }
    /** Lấy mã lỗi dùng trong API contract. */
    public String getCode() { return code; }
}
