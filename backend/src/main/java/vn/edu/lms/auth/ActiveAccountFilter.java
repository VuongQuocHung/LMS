package vn.edu.lms.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.edu.lms.user.UserRepository;

/** Kiểm tra database trên từng request, tránh tiếp tục dùng quyền từ session đã bị khóa. */
public class ActiveAccountFilter extends OncePerRequestFilter {
    private final UserRepository users;
    private final ObjectMapper mapper;

    /** Nhận dependency trực tiếp; không đăng ký thành servlet filter lần thứ hai. */
    public ActiveAccountFilter(UserRepository users, ObjectMapper mapper) {
        this.users = users;
        this.mapper = mapper;
    }

    /** Từ chối tài khoản bị khóa/xóa và hủy session của request hiện tại. */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean signedIn = authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
        if (signedIn) {
            boolean enabled = users.findByEmail(authentication.getName())
                    .map(user -> user.isEnabled()).orElse(false);
            if (!enabled) {
                new SecurityContextLogoutHandler().logout(request, response, authentication);
                SecurityJsonWriter.error(mapper, response, 403, "ACCOUNT_DISABLED", "Tài khoản đã bị khóa.");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
