package vn.edu.lms.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import vn.edu.lms.user.UserView;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final CurrentUserService currentUser;

    /** Nhận service đọc tài khoản đang đăng nhập. */
    public AuthController(CurrentUserService currentUser) { this.currentUser = currentUser; }

    /** Cấp token trước login và cấp lại sau login/logout vì token cũ bị xóa. */
    @GetMapping("/csrf")
    public CsrfView csrf(CsrfToken token) {
        return new CsrfView(token.getHeaderName(), token.getToken());
    }

    /** Trả hồ sơ an toàn để frontend hiển thị và chọn màn hình theo vai trò. */
    @GetMapping("/me")
    public UserView me(Authentication authentication) {
        return UserView.from(currentUser.require(authentication));
    }

    /** headerName giúp frontend không phải đoán tên header CSRF. */
    public record CsrfView(String headerName, String token) {
        /** Không để log DEBUG của framework in token khi gọi toString trên DTO. */
        @Override
        public String toString() { return "CsrfView[headerName=" + headerName + ", token=REDACTED]"; }
    }
}
