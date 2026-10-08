package vn.edu.lms.common;

import java.util.Map;

/** Một cấu trúc lỗi chung cho controller và cả Spring Security filter. */
public record ApiError(String code, String message, Map<String, String> fieldErrors) {
    /** Tạo lỗi không gắn với riêng một ô nhập liệu. */
    public static ApiError of(String code, String message) {
        return new ApiError(code, message, Map.of());
    }
}
