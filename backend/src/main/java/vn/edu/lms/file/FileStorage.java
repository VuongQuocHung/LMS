package vn.edu.lms.file;

import java.io.IOException;
import java.nio.file.Path;

/** Có thể thay bằng object storage mà không thay đổi quyền truy cập ở service. */
public interface FileStorage {
    String write(byte[] bytes) throws IOException;
    Path path(String key);
    void delete(String key) throws IOException;
}
