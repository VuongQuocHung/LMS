package vn.edu.lms.user;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.edu.lms.auth.CurrentUserService;
import vn.edu.lms.common.ApiException;
import vn.edu.lms.user.UserDtos.CreateUserRequest;
import vn.edu.lms.user.UserDtos.UpdateUserRequest;

@RestController
@RequestMapping("/api/v1/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {
    private final UserRepository users;
    private final CurrentUserService currentUser;
    private final PasswordEncoder passwordEncoder;

    /** Nhận repository, service xác định admin hiện tại và bộ mã hóa mật khẩu. */
    public UserController(UserRepository users, CurrentUserService currentUser, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.currentUser = currentUser;
        this.passwordEncoder = passwordEncoder;
    }

    /** Danh sách tài khoản hệ thống dành cho admin. */
    @GetMapping
    public List<UserView> list() {
        return users.findAll().stream().map(UserView::from).toList();
    }

    /** Xem chi tiết một tài khoản theo ID. */
    @GetMapping("/{id}")
    public UserView getById(@PathVariable Long id) {
        UserAccount target = users.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản."));
        return UserView.from(target);
    }

    /** Tạo tài khoản mới có băm mật khẩu và kiểm tra trùng lặp email/mã sinh viên. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public UserView create(@Valid @RequestBody CreateUserRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email này đã được sử dụng.");
        }
        String studentCode = request.studentCode() != null && !request.studentCode().isBlank()
                ? request.studentCode().trim() : null;
        if (studentCode != null && users.existsByStudentCode(studentCode)) {
            throw new ApiException(HttpStatus.CONFLICT, "STUDENT_CODE_ALREADY_EXISTS", "Mã sinh viên này đã tồn tại.");
        }
        String passwordHash = passwordEncoder.encode(request.password());
        UserAccount account = new UserAccount(email, passwordHash, request.fullName().trim(), studentCode, request.role());
        return UserView.from(users.save(account));
    }

    /** Cập nhật thông tin tài khoản (họ tên, mã sinh viên, vai trò, trạng thái, mật khẩu mới nếu có). */
    @PutMapping("/{id}")
    @Transactional
    public UserView update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request,
                           Authentication authentication) {
        UserAccount admin = currentUser.require(authentication);
        UserAccount target = users.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản."));

        if (admin.getId().equals(id)) {
            if (Boolean.FALSE.equals(request.enabled())) {
                throw new ApiException(HttpStatus.CONFLICT, "SELF_LOCK_NOT_ALLOWED", "Không thể tự khóa tài khoản hiện tại.");
            }
            if (request.role() != Role.ADMIN) {
                throw new ApiException(HttpStatus.CONFLICT, "SELF_DEMOTE_NOT_ALLOWED", "Không thể tự hạ vai trò quản trị viên của chính mình.");
            }
        }

        String studentCode = request.studentCode() != null && !request.studentCode().isBlank()
                ? request.studentCode().trim() : null;
        if (studentCode != null) {
            users.findByStudentCode(studentCode).ifPresent(other -> {
                if (!other.getId().equals(id)) {
                    throw new ApiException(HttpStatus.CONFLICT, "STUDENT_CODE_ALREADY_EXISTS", "Mã sinh viên này đã thuộc về tài khoản khác.");
                }
            });
        }

        target.setFullName(request.fullName().trim());
        target.setStudentCode(studentCode);
        target.setRole(request.role());
        target.setEnabled(request.enabled());

        if (request.password() != null && !request.password().isBlank()) {
            target.setPasswordHash(passwordEncoder.encode(request.password()));
        }

        return UserView.from(target);
    }

    /** Khóa/mở tài khoản; không cho admin tự khóa để tránh mất quyền quản trị. */
    @PatchMapping("/{id}")
    @Transactional
    public UserView changeEnabled(@PathVariable Long id, @Valid @RequestBody EnabledRequest request,
                                   Authentication authentication) {
        if (currentUser.require(authentication).getId().equals(id)) {
            throw new ApiException(HttpStatus.CONFLICT, "SELF_LOCK_NOT_ALLOWED", "Không thể tự khóa tài khoản hiện tại.");
        }
        UserAccount target = users.findById(id).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy tài khoản."));
        target.setEnabled(request.enabled());
        return UserView.from(target);
    }

    /** Dùng Boolean để phân biệt false với trường bị thiếu trong JSON. */
    public record EnabledRequest(@NotNull(message = "Cần truyền enabled.") Boolean enabled) {}
}
