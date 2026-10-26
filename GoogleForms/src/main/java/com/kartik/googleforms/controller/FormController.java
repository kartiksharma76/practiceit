package com.kartik.googleforms.controller;

import com.kartik.googleforms.dto.CreateFormRequest;
import com.kartik.googleforms.dto.SubmitResponseRequest;
import com.kartik.googleforms.model.Form;
import com.kartik.googleforms.model.FormResponse;
import com.kartik.googleforms.service.FormService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/*
 * @RestController returns data as JSON.
 * @RequestMapping defines the base URL.
 */
@RestController
@RequestMapping("/api/forms")
@CrossOrigin(origins = "*")
public class FormController {

    private final FormService formService;

    public FormController(FormService formService) {
        this.formService = formService;
    }

    // POST /api/forms
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createForm(
            @Valid @RequestBody CreateFormRequest request) {

        Form form = formService.createForm(request);

        return Map.of(
                "id", form.getId(),
                "title", form.getTitle(),
                "publicId", form.getPublicId(),
                "publicUrl", "/form.html?id=" + form.getPublicId()
        );
    }

    // GET /api/forms
    @GetMapping
    public List<Form> getAllForms() {
        return formService.getAllForms();
    }

    // GET /api/forms/public/{publicId}
    @GetMapping("/public/{publicId}")
    public Form getPublicForm(
            @PathVariable String publicId) {

        return formService.getPublicForm(publicId);
    }

    // POST /api/forms/public/{publicId}/responses
    @PostMapping("/public/{publicId}/responses")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> submitResponse(
            @PathVariable String publicId,
            @RequestBody SubmitResponseRequest request) {

        FormResponse response =
                formService.submitResponse(publicId, request);

        return Map.of(
                "message", "Response submitted successfully",
                "responseId", response.getId()
        );
    }

    // GET /api/forms/{formId}/responses
    @GetMapping("/{formId}/responses")
    public List<Map<String, Object>> getResponses(
            @PathVariable Long formId) {

        return formService.getResponses(formId);
    }
}