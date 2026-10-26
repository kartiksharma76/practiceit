package com.kartik.googleforms.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/*
 * Stores one submitted form response.
 */
@Entity
@Table(name = "form_responses")
public class FormResponse {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "form_id", nullable = false)
	private Form form;

	@Column(nullable = false)
	private LocalDateTime submittedAt = LocalDateTime.now();

	@OneToMany(mappedBy = "response", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<ResponseAnswer> answers = new ArrayList<>();

	public FormResponse() {
	}

	public void addAnswer(ResponseAnswer answer) {
		answers.add(answer);
		answer.setResponse(this);
	}

	public Long getId() {
		return id;
	}

	public Form getForm() {
		return form;
	}

	public void setForm(Form form) {
		this.form = form;
	}

	public LocalDateTime getSubmittedAt() {
		return submittedAt;
	}

	public List<ResponseAnswer> getAnswers() {
		return answers;
	}
}