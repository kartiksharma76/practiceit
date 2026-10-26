package com.kartik.googleforms.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

/*
 * Stores an answer to an individual question.
 */
@Entity
@Table(name = "response_answers")
public class ResponseAnswer {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "response_id", nullable = false)
	@JsonIgnore
	private FormResponse response;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "question_id", nullable = false)
	private Question question;

	@Column(columnDefinition = "TEXT")
	private String answerText;

	public ResponseAnswer() {
	}

	public Long getId() {
		return id;
	}

	public FormResponse getResponse() {
		return response;
	}

	public void setResponse(FormResponse response) {
		this.response = response;
	}

	public Question getQuestion() {
		return question;
	}

	public void setQuestion(Question question) {
		this.question = question;
	}

	public String getAnswerText() {
		return answerText;
	}

	public void setAnswerText(String answerText) {
		this.answerText = answerText;
	}
}