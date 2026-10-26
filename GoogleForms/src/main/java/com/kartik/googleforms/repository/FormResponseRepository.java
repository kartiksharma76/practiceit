package com.kartik.googleforms.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kartik.googleforms.model.FormResponse;

public interface FormResponseRepository extends JpaRepository<FormResponse, Long> {
	List<FormResponse> findByFormIdOrderBySubmittedAtDesc(Long formId);

}
