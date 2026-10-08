package vn.edu.lms.user;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.edu.lms.auth.CurrentUserService;
import vn.edu.lms.common.ApiException;

@RestController
@RequestMapping("/api/v1/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {
    private final UserRepository users;
    private final CurrentUserService currentUser;

    /** Nhận repository và service xác định admin hiện tại. */
    public UserController(UserRepository users, CurrentUserService currentUser) {
        this.users = users;
        this.currentUser = currentUser;
    }

    /** Danh sách tối thiểu phục vụ demo; phân trang sẽ bổ sung khi làm quản trị đầy đủ. */
    @GetMapping
    public List<UserView> list() {
        return users.findAll().stream().map(UserView::from).toList();
    }

    /** Khóa/mở tài khoản; không cho admin tự khóa để tránh mất đường quản trị demo. */
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
