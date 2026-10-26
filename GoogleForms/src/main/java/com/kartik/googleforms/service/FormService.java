package com.kartik.googleforms.service;


import java.util.*;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.kartik.googleforms.dto.CreateFormRequest;
import com.kartik.googleforms.dto.QuestionRequest;
import com.kartik.googleforms.dto.SubmitResponseRequest;
import com.kartik.googleforms.model.Form;
import com.kartik.googleforms.model.FormResponse;
import com.kartik.googleforms.model.Question;
import com.kartik.googleforms.model.QuestionType;
import com.kartik.googleforms.model.ResponseAnswer;
import com.kartik.googleforms.repository.FormRepository;
import com.kartik.googleforms.repository.FormResponseRepository;
import com.kartik.googleforms.repository.QuestionRepository;

/*
 * @Service identifies this class as a Spring service component.
 * @Transactional manages database transaction boundaries.
 */
@Service
public class FormService {

	private final FormRepository formRepository;
	private final QuestionRepository questionRepository;
	private final FormResponseRepository responseRepository;

	// Constructor injection: Spring supplies the repository objects.
	public FormService(FormRepository formRepository, QuestionRepository questionRepository,
			FormResponseRepository responseRepository) {

		this.formRepository = formRepository;
		this.questionRepository = questionRepository;
		this.responseRepository = responseRepository;
	}

	// Create a form with its questions.
	@Transactional
	public Form createForm(CreateFormRequest request) {

		Form form = new Form();

		form.setTitle(request.getTitle().trim());

		form.setDescription(request.getDescription() == null ? "" : request.getDescription().trim());

		// UUID generates a unique ID for the public form link.
		form.setPublicId(UUID.randomUUID().toString());

		int position = 0;

		List<QuestionRequest> requests = request.getQuestions() == null ? Collections.emptyList()
				: request.getQuestions();

		for (QuestionRequest q : requests) {

			if (q.getQuestionText() == null || q.getQuestionText().isBlank()) {

				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question text cannot be blank");
			}

			if (q.getType() == null) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question type is required");
			}

			Question question = new Question();

			question.setQuestionText(q.getQuestionText().trim());
			question.setType(q.getType());
			question.setRequired(q.isRequired());

			question.setPosition(q.getPosition() >= 0 ? q.getPosition() : position);

			List<String> options = Optional.ofNullable(q.getOptions()).orElse(Collections.emptyList()).stream()
					.map(String::trim).filter(s -> !s.isBlank()).toList();

			if (needsOptions(q.getType()) && options.isEmpty()) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
						"Choice questions require at least one option");
			}

			// Options are stored one per line.
			question.setOptionsText(String.join("\n", options));

			// Establishes the relationship between form and question.
			form.addQuestion(question);

			position++;
		}

		return formRepository.save(form);
	}

	// Find a form using its public ID.
	@Transactional(readOnly = true)
	public Form getPublicForm(String publicId) {

		return formRepository.findByPublicId(publicId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form not found"));
	}

	// Return all forms for the dashboard.
	@Transactional(readOnly = true)
	public List<Form> getAllForms() {
		return formRepository.findAll();
	}

	// Validate and save a submitted form response.
	@Transactional
	public FormResponse submitResponse(String publicId, SubmitResponseRequest request) {

		Form form = formRepository.findByPublicId(publicId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form not found"));

		Map<Long, String> answers = request.getAnswers() == null ? Collections.emptyMap() : request.getAnswers();

		Map<Long, Question> questionsById = form.getQuestions().stream()
				.collect(Collectors.toMap(Question::getId, question -> question));

		// Prevent submissions containing IDs from another form.
		for (Long questionId : answers.keySet()) {

			if (!questionsById.containsKey(questionId)) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question does not belong to this form");
			}
		}

		// Validate required answers and available choice options.
		for (Question question : form.getQuestions()) {

			String answer = answers.get(question.getId());

			if (question.isRequired() && (answer == null || answer.isBlank())) {

				throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
						"Please answer: " + question.getQuestionText());
			}

			if (answer != null && !answer.isBlank() && needsOptions(question.getType())) {

				List<String> allowedOptions = Arrays
						.asList(Optional.ofNullable(question.getOptionsText()).orElse("").split("\\R"));

				List<String> submittedOptions;

				if (question.getType() == QuestionType.CHECKBOXES) {

					submittedOptions = Arrays.stream(answer.split(",")).map(String::trim).toList();

				} else {
					submittedOptions = List.of(answer.trim());
				}

				if (!allowedOptions.containsAll(submittedOptions)) {
					throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
							"Invalid option for: " + question.getQuestionText());
				}
			}
		}

		FormResponse response = new FormResponse();
		response.setForm(form);

		for (Question question : form.getQuestions()) {

			ResponseAnswer responseAnswer = new ResponseAnswer();

			responseAnswer.setQuestion(question);

			String answerText = answers.get(question.getId());

			responseAnswer.setAnswerText(answerText == null ? "" : answerText);

			response.addAnswer(responseAnswer);
		}

		return responseRepository.save(response);
	}

	// Fetch all submitted responses for a particular form.
	@Transactional(readOnly = true)
	public List<Map<String, Object>> getResponses(Long formId) {

		Form form = formRepository.findById(formId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form not found"));

		List<FormResponse> responses = responseRepository.findByFormIdOrderBySubmittedAtDesc(form.getId());

		List<Map<String, Object>> output = new ArrayList<>();

		for (FormResponse response : responses) {

			Map<String, Object> row = new LinkedHashMap<>();

			row.put("responseId", response.getId());
			row.put("submittedAt", response.getSubmittedAt());

			Map<String, String> answerMap = new LinkedHashMap<>();

			for (ResponseAnswer answer : response.getAnswers()) {

				answerMap.put(answer.getQuestion().getQuestionText(), answer.getAnswerText());
			}

			row.put("answers", answerMap);

			output.add(row);
		}

		return output;
	}

	// Determines which question types require options.
	private boolean needsOptions(QuestionType type) {

		return type == QuestionType.MULTIPLE_CHOICE || type == QuestionType.CHECKBOXES || type == QuestionType.DROPDOWN;
	}
}