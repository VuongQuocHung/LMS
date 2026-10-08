package vn.edu.lms.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.*;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import vn.edu.lms.user.UserRepository;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    /** BCrypt tự sinh salt; cùng mật khẩu vẫn có thể tạo hai hash khác nhau. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** Spring Security dùng hàm này để tìm tài khoản khi POST login. */
    @Bean
    public UserDetailsService userDetailsService(UserRepository users) {
        return email -> {
            var account = users.findByEmail(email)
                    .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy tài khoản."));
            return User.withUsername(account.getEmail())
                    .password(account.getPasswordHash())
                    .roles(account.getRole().name())
                    .disabled(!account.isEnabled())
                    .build();
        };
    }

    /** Cấu hình session, CSRF và phản hồi JSON cho toàn bộ API. */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, UserRepository users,
                                                   ObjectMapper mapper) throws Exception {
        // Token được lưu trong session và lấy qua GET /auth/csrf, không qua cookie JS.
        var csrfHandler = new CsrfTokenRequestAttributeHandler();
        http.csrf(csrf -> csrf.csrfTokenRequestHandler(csrfHandler));
        http.requestCache(cache -> cache.disable());

        http.authorizeHttpRequests(rules -> rules
                .requestMatchers("/api/v1/health", "/api/v1/auth/csrf", "/api/v1/auth/login").permitAll()
                .anyRequest().authenticated());

        // Dùng filter login có sẵn để Spring xử lý đổi session ID và lưu authentication.
        http.formLogin(login -> login
                .loginProcessingUrl("/api/v1/auth/login")
                .usernameParameter("email")
                .successHandler((request, response, authentication) -> response.setStatus(204))
                .failureHandler((request, response, exception) ->
                        SecurityJsonWriter.error(mapper, response, 401, "LOGIN_FAILED",
                                "Email hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa.")));
        http.logout(logout -> logout
                .logoutUrl("/api/v1/auth/logout")
                .deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)));
        http.exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, exception) ->
                        SecurityJsonWriter.error(mapper, response, 401, "UNAUTHENTICATED", "Vui lòng đăng nhập."))
                .accessDeniedHandler((request, response, exception) ->
                        SecurityJsonWriter.error(mapper, response, 403, "ACCESS_DENIED",
                                "Bạn không có quyền hoặc CSRF token không hợp lệ.")));

        // Chạy sau khi đã đọc session nhưng trước khi quyết định quyền truy cập API.
        http.addFilterBefore(new ActiveAccountFilter(users, mapper), AuthorizationFilter.class);
        return http.build();
    }
}
