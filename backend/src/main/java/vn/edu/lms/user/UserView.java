package vn.edu.lms.user;

/** DTO an toàn: không bao giờ chứa passwordHash. */
public record UserView(Long id, String email, String fullName, String studentCode, Role role, boolean enabled) {
    /** Chuyển entity sang dữ liệu được phép gửi cho frontend. */
    public static UserView from(UserAccount user) {
        return new UserView(user.getId(), user.getEmail(), user.getFullName(),
                user.getStudentCode(), user.getRole(), user.isEnabled());
    }
}
