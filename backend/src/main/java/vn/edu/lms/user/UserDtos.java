package vn.edu.lms.user;

import jakarta.validation.constraints.*;

/** DTO phục vụ tạo và cập nhật tài khoản quản trị. */
public final class UserDtos {
    private UserDtos() {}

    /** Thông tin tạo tài khoản mới. */
    public record CreateUserRequest(
            @NotBlank(message = "Email không được để trống.")
            @Email(message = "Email không đúng định dạng.")
            @Size(max = 180, message = "Email tối đa 180 ký tự.")
            String email,

            @NotBlank(message = "Mật khẩu không được để trống.")
            @Size(min = 6, max = 100, message = "Mật khẩu từ 6 đến 100 ký tự.")
            String password,

            @NotBlank(message = "Họ tên không được để trống.")
            @Size(max = 120, message = "Họ tên tối đa 120 ký tự.")
            String fullName,

            @Size(max = 30, message = "Mã sinh viên tối đa 30 ký tự.")
            String studentCode,

            @NotNull(message = "Vai trò không được để trống.")
            Role role
    ) {}

    /** Thông tin cập nhật tài khoản. */
    public record UpdateUserRequest(
            @NotBlank(message = "Họ tên không được để trống.")
            @Size(max = 120, message = "Họ tên tối đa 120 ký tự.")
            String fullName,

            @Size(max = 30, message = "Mã sinh viên tối đa 30 ký tự.")
            String studentCode,

            @NotNull(message = "Vai trò không được để trống.")
            Role role,

            @NotNull(message = "Trạng thái hoạt động không được để trống.")
            Boolean enabled,

            @Size(min = 6, max = 100, message = "Mật khẩu mới từ 6 đến 100 ký tự.")
            String password
    ) {}
}
