package vn.edu.lms.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import vn.edu.lms.common.ApiException;
import vn.edu.lms.user.*;

@Service
public class CurrentUserService {
    private final UserRepository users;

    /** Nhận repository để lấy tài khoản thật từ database. */
    public CurrentUserService(UserRepository users) { this.users = users; }

    /** Lấy người gọi từ session; tuyệt đối không nhận userId tùy ý từ frontend. */
    public UserAccount require(Authentication authentication) {
        if (authentication == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
        }
        return users.findByEmail(authentication.getName())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Phiên không còn hợp lệ."));
    }
}
