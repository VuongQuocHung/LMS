package vn.edu.lms.file;

import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
public class LocalFileStorage implements FileStorage {
    private final Path root;
    private final FileAttachmentRepository files;
    public LocalFileStorage(@Value("${app.files.directory:./uploads}") String directory,
                            FileAttachmentRepository files) throws IOException {
        root = Path.of(directory).toAbsolutePath().normalize();
        Files.createDirectories(root);
        this.files = files;
    }
    public Path path(String key) {
        if (!key.matches("[a-f0-9-]{36}")) throw new IllegalArgumentException("Invalid storage key");
        return root.resolve(key);
    }
    public String write(byte[] bytes) throws IOException {
        String key = UUID.randomUUID().toString();
        try {
            Files.write(path(key), bytes, StandardOpenOption.CREATE_NEW);
        } catch (IOException e) {
            Files.deleteIfExists(path(key));
            throw e;
        }
        return key;
    }
    public void delete(String key) throws IOException { Files.deleteIfExists(path(key)); }

    /** Retry sau lỗi xóa/crash và thu gom file khi FK cascade xóa đối tượng cha.
     * Chỉ xét file UUID cũ hơn 24 giờ, không chạm vào file upload đang giao dịch. */
    @Scheduled(fixedDelayString = "${app.files.cleanup-delay-ms:3600000}")
    public void cleanup() {
        try (var paths = Files.list(root)) {
            paths.filter(p -> p.getFileName().toString().matches("[a-f0-9-]{36}")).forEach(p -> {
                try {
                    if (Files.isRegularFile(p, LinkOption.NOFOLLOW_LINKS)
                            && Files.getLastModifiedTime(p).toInstant().isBefore(Instant.now().minusSeconds(86400))
                            && !files.existsByStorageKey(p.getFileName().toString())) {
                        Files.deleteIfExists(p);
                    }
                } catch (Exception e) {
                    LoggerFactory.getLogger(getClass()).warn("Không dọn được file mồ côi; sẽ thử lại", e);
                }
            });
        } catch (IOException e) {
            LoggerFactory.getLogger(getClass()).warn("Không đọc được thư mục upload", e);
        }
    }
}
