package vn.edu.lms.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import vn.edu.lms.common.ApiError;

/** Filter chạy trước controller nên phải tự ghi JSON lỗi vào response. */
public final class SecurityJsonWriter {
    private SecurityJsonWriter() {}

    /** Ghi lỗi theo đúng cấu trúc ApiError, không redirect sang trang HTML. */
    public static void error(ObjectMapper mapper, HttpServletResponse response,
                             int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        mapper.writeValue(response.getWriter(), ApiError.of(code, message));
    }
}
