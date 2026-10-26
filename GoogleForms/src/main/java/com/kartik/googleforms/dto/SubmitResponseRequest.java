package com.kartik.googleforms.dto;

import java.util.Map;
/*
 * The map key is the question ID.
 * The map value is the submitted answer.
 */

public class SubmitResponseRequest {

	private Map<Long, String> answers;
	
    public Map<Long, String> getAnswers() {
        return answers;
    }
    
    public void setAnswers(Map<Long, String> answers) {
        this.answers = answers;
    }
}
