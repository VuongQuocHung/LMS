package vn.edu.lms.schedule;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.lms.auth.CurrentUserService;
import vn.edu.lms.schedule.ScheduleDtos.ScheduleView;
import vn.edu.lms.user.UserAccount;

@RestController
@RequestMapping("/api/v1")
public class ScheduleController {
    private final ScheduleService scheduleService;
    private final CurrentUserService currentUserService;

    public ScheduleController(ScheduleService scheduleService, CurrentUserService currentUserService) {
        this.scheduleService = scheduleService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/schedule")
    public ScheduleView getSchedule(Authentication authentication) {
        UserAccount user = currentUserService.require(authentication);
        return scheduleService.getSchedule(user);
    }
}
