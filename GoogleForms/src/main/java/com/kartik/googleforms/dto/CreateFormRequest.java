package com.kartik.googleforms.dto;

import java.util.ArrayList;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

public class CreateFormRequest {

	@NotBlank
	private String title;

	private String description;

	@Valid
	private List<QuestionRequest> questions = new ArrayList<>();

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

	public List<QuestionRequest> getQuestions() {
		return questions;
	}

	public void setQuestions(List<QuestionRequest> questions) {
		this.questions = questions;
	}

}
