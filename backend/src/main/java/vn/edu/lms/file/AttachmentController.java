package vn.edu.lms.file;

import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.lms.auth.CurrentUserService;

@RestController
@RequestMapping("/api/v1")
public class AttachmentController {
    private final AttachmentService service;
    private final CurrentUserService users;
    public AttachmentController(AttachmentService service, CurrentUserService users) { this.service = service; this.users = users; }
    @GetMapping("/files/limits")
    public AttachmentService.Limits limits() { return service.limits(); }
    @GetMapping("/{kind:lessons|assignments|drafts|submissions}/{id}/files")
    public List<FileAttachment.View> list(@PathVariable String kind, @PathVariable Long id, Authentication auth) {
        return service.list(kind, id, users.require(auth));
    }
    @PostMapping(value = "/{kind:lessons|assignments|drafts}/{id}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FileAttachment.View upload(@PathVariable String kind, @PathVariable Long id,
            @RequestParam("file") MultipartFile file, Authentication auth) {
        return service.upload(kind, id, file, users.require(auth));
    }
    @GetMapping("/files/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id, Authentication auth) {
        var result = service.download(id, users.require(auth));
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(result.file().contentType()))
                .contentLength(result.file().sizeBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(result.file().originalName(), StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff").body(result.resource());
    }
    @DeleteMapping("/files/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication auth) { service.delete(id, users.require(auth)); }
    public record DraftRequest(String content) {}
    @GetMapping("/assignments/{id}/draft")
    public AttachmentService.DraftView draft(@PathVariable Long id, Authentication auth) {
        return service.draft(id, users.require(auth));
    }
    @PutMapping("/assignments/{id}/draft")
    public AttachmentService.DraftView saveDraft(@PathVariable Long id, @RequestBody DraftRequest request, Authentication auth) {
        return service.saveDraft(id, request.content(), users.require(auth));
    }
}
