package com.kartik.googleforms.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kartik.googleforms.model.Question;

public interface QuestionRepository extends JpaRepository<Question, Long> {

}
