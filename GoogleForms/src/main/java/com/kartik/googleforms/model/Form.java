package com.kartik.googleforms.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/*
 * @Entity: Maps this class to a database table.
 * @Table: Sets the table name to forms.
 */
@Entity
@Table(name = "forms")
public class Form {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false, unique = true, length = 36)
    private String publicId;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    /*
     * One form can have multiple questions.
     * Cascade saves/deletes related questions with the form.
     */
    @OneToMany(
            mappedBy = "form",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @OrderBy("position ASC")
    private List<Question> questions = new ArrayList<>();

    public Form() {
    }

    public void addQuestion(Question question) {
        questions.add(question);
        question.setForm(this);
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPublicId() {
        return publicId;
    }

    public void setPublicId(String publicId) {
        this.publicId = publicId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public List<Question> getQuestions() {
        return questions;
    }
}