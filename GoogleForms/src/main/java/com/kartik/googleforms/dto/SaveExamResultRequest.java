package com.kartik.googleforms.dto;

import jakarta.validation.constraints.NotNull;

public class SaveExamResultRequest {

    @NotNull
    private int score;

    @NotNull
    private int totalQuestions;

    @NotNull
    private int correctCount;

    @NotNull
    private int wrongCount;

    @NotNull
    private int accuracyPercentage;

    private String section;

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
}
