package com.kartik.googleforms.controller;

import com.kartik.googleforms.dto.SaveExamResultRequest;
import com.kartik.googleforms.model.ExamResult;
import com.kartik.googleforms.model.User;
import com.kartik.googleforms.repository.ExamResultRepository;
import com.kartik.googleforms.security.TokenUtil;
import com.kartik.googleforms.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exams")
@CrossOrigin(origins = "*")
public class ExamResultController {

    private final ExamResultRepository examResultRepository;
    private final AuthService authService;
    private final TokenUtil tokenUtil;

    public ExamResultController(ExamResultRepository examResultRepository, AuthService authService, TokenUtil tokenUtil) {
        this.examResultRepository = examResultRepository;
        this.authService = authService;
        this.tokenUtil = tokenUtil;
    }

    @PostMapping("/results")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> saveResult(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody SaveExamResultRequest request) {

        String token = tokenUtil.extractToken(authHeader);
        User user = null;
        try {
            user = authService.getCurrentUser(token);
        } catch (Exception ignored) {
            // If anonymous/guest, use default candidate user
        }

        if (user == null) {
            // Fallback to demo candidate or anonymous tracking
            user = authService.login(new com.kartik.googleforms.dto.LoginRequest() {{
                setEmail("candidate@example.com");
                setPassword("Candidate@123");
            }}).getUserId() != null ? authService.getCurrentUser(tokenUtil.createSession(1L)) : null;
        }

        ExamResult result = new ExamResult(
                user,
                request.getScore(),
                request.getTotalQuestions(),
                request.getCorrectCount(),
                request.getWrongCount(),
                request.getAccuracyPercentage(),
                request.getSection()
        );

        result = examResultRepository.save(result);

        return Map.of(
                "resultId", result.getId(),
                "score", result.getScore(),
                "accuracy", result.getAccuracyPercentage(),
                "submittedAt", result.getSubmittedAt(),
                "message", "Exam result securely recorded"
        );
    }

    @GetMapping("/results/my")
    public List<ExamResult> getMyResults(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = tokenUtil.extractToken(authHeader);
        User user = authService.getCurrentUser(token);
        return examResultRepository.findByUserIdOrderBySubmittedAtDesc(user.getId());
    }

    @GetMapping("/results/all")
    public List<ExamResult> getAllResults(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return examResultRepository.findAllByOrderBySubmittedAtDesc();
    }
}
