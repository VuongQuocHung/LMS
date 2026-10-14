package vn.edu.lms.file;

import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.*;
import java.util.*;
import java.util.zip.ZipInputStream;
import org.springframework.http.HttpStatus;
import vn.edu.lms.common.ApiException;

final class FileValidation {
    private FileValidation() {}
    static String name(String name) {
        if (name == null || name.isBlank() || name.length() > 255 || name.contains("/")
                || name.contains("\\") || name.chars().anyMatch(c -> c < 32 || c == 127)) throw invalid();
        return name.trim();
    }
    static String type(String name, byte[] bytes) throws IOException {
        String ext = name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        if (ext.equals("pdf") && new String(bytes, 0, Math.min(bytes.length, 5), StandardCharsets.US_ASCII).equals("%PDF-"))
            return "application/pdf";
        if (ext.equals("txt")) {
            try {
                String text = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                        .decode(ByteBuffer.wrap(bytes)).toString();
                if (text.chars().anyMatch(c -> c < 32 && c != 9 && c != 10 && c != 13)) throw invalid();
                return "text/plain";
            } catch (CharacterCodingException e) { throw invalid(); }
        }
        if (Set.of("zip", "docx", "pptx", "xlsx").contains(ext) && bytes.length >= 4
                && bytes[0] == 'P' && bytes[1] == 'K') {
            boolean contentTypes = false, document = false;
            String part = switch (ext) { case "docx" -> "word/document.xml"; case "pptx" -> "ppt/presentation.xml";
                case "xlsx" -> "xl/workbook.xml"; default -> ""; };
            // Duyệt có giới hạn để tránh zip bomb; tuyệt đối không giải nén lên ổ đĩa.
            try (var zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
                long total = 0; int entries = 0; byte[] buffer = new byte[8192];
                for (var entry = zip.getNextEntry(); entry != null; entry = zip.getNextEntry()) {
                    if (++entries > 5000) throw invalid();
                    contentTypes |= entry.getName().equals("[Content_Types].xml");
                    document |= entry.getName().equals(part);
                    int n;
                    while ((n = zip.read(buffer)) != -1) {
                        total += n;
                        if (total > 100L * 1024 * 1024) throw invalid();
                    }
                }
                if (entries == 0) throw invalid();
            } catch (IOException e) { throw invalid(); }
            if (ext.equals("zip")) return "application/zip";
            if (!contentTypes || !document) throw invalid();
            return "application/vnd.openxmlformats-officedocument." + switch (ext) {
                case "docx" -> "wordprocessingml.document";
                case "pptx" -> "presentationml.presentation";
                default -> "spreadsheetml.sheet";
            };
        }
        throw invalid();
    }
    static ApiException invalid() {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "File không hợp lệ. Chỉ nhận PDF, DOCX, PPTX, XLSX, TXT (UTF-8), ZIP.");
    }
}
