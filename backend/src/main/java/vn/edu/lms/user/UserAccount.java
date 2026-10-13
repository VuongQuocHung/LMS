package vn.edu.lms.user;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class UserAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 180)
    private String email;

    // Chỉ lưu mật khẩu đã băm BCrypt; không trả trường này qua API.
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(name = "student_code", unique = true, length = 30)
    private String studentCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    // Được đọc lại trên từng request để khóa tài khoản có hiệu lực với session cũ.
    @Column(nullable = false)
    private boolean enabled = true;

    /** JPA cần constructor không tham số để đọc bản ghi từ database. */
    protected UserAccount() {}

    /** Tạo tài khoản; passwordHash phải được băm trước khi truyền vào. */
    public UserAccount(String email, String passwordHash, String fullName, String studentCode, Role role) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.studentCode = studentCode;
        this.role = role;
    }

    /** Lấy ID dùng để liên kết khóa học và ghi danh. */
    public Long getId() { return id; }
    /** Lấy email dùng làm tên đăng nhập. */
    public String getEmail() { return email; }
    /** Chỉ tầng xác thực được dùng hash để đối chiếu mật khẩu. */
    public String getPasswordHash() { return passwordHash; }
    /** Lấy tên hiển thị trên giao diện. */
    public String getFullName() { return fullName; }
    /** Lấy mã sinh viên; admin/giảng viên có thể không có. */
    public String getStudentCode() { return studentCode; }
    /** Lấy vai trò để kiểm tra quyền. */
    public Role getRole() { return role; }
    /** Kiểm tra tài khoản còn được phép sử dụng hay không. */
    public boolean isEnabled() { return enabled; }
    /** Admin dùng hàm này để khóa hoặc mở khóa tài khoản. */
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    /** Cập nhật họ tên người dùng. */
    public void setFullName(String fullName) { this.fullName = fullName; }
    /** Cập nhật mã sinh viên. */
    public void setStudentCode(String studentCode) { this.studentCode = studentCode; }
    /** Cập nhật vai trò tài khoản. */
    public void setRole(Role role) { this.role = role; }
    /** Cập nhật mật khẩu đã băm. */
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
}
