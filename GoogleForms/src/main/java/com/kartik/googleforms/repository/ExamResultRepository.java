package com.kartik.googleforms.repository;

import com.kartik.googleforms.model.ExamResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExamResultRepository extends JpaRepository<ExamResult, Long> {
    List<ExamResult> findByUserIdOrderBySubmittedAtDesc(Long userId);
    List<ExamResult> findAllByOrderBySubmittedAtDesc();
}
