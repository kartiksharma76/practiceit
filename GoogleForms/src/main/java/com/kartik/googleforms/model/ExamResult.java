package com.kartik.googleforms.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "exam_results")
public class ExamResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private int score;

    @Column(nullable = false)
    private int totalQuestions;

    @Column(nullable = false)
    private int correctCount;

    @Column(nullable = false)
    private int wrongCount;

    @Column(nullable = false)
    private int accuracyPercentage;

    @Column(length = 80)
    private String section;

    @Column(nullable = false)
    private LocalDateTime submittedAt = LocalDateTime.now();

    public ExamResult() {
    }

    public ExamResult(User user, int score, int totalQuestions, int correctCount, int wrongCount, int accuracyPercentage, String section) {
        this.user = user;
        this.score = score;
        this.totalQuestions = totalQuestions;
        this.correctCount = correctCount;
        this.wrongCount = wrongCount;
        this.accuracyPercentage = accuracyPercentage;
        this.section = section != null ? section : "All Topics";
        this.submittedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public int getTotalQuestions() {
        return totalQuestions;
    }

    public void setTotalQuestions(int totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public int getCorrectCount() {
        return correctCount;
    }

    public void setCorrectCount(int correctCount) {
        this.correctCount = correctCount;
    }

    public int getWrongCount() {
        return wrongCount;
    }

    public void setWrongCount(int wrongCount) {
        this.wrongCount = wrongCount;
    }

    public int getAccuracyPercentage() {
        return accuracyPercentage;
    }

    public void setAccuracyPercentage(int accuracyPercentage) {
        this.accuracyPercentage = accuracyPercentage;
    }

    public String getSection() {
        return section;
    }

    public void setSection(String section) {
        this.section = section;
    }

    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }
}
