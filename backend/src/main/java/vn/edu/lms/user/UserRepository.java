package vn.edu.lms.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data tự tạo câu SQL từ tên hàm; không cần viết implementation. */
public interface UserRepository extends JpaRepository<UserAccount, Long> {
    /** Tìm tài khoản lúc đăng nhập và khi kiểm tra session hiện tại. */
    Optional<UserAccount> findByEmail(String email);
}
