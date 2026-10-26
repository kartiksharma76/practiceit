package com.kartik.googleforms.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kartik.googleforms.model.Form;

public interface FormRepository extends JpaRepository<Form, Long> {
	 Optional<Form> findByPublicId(String publicId);

}
