package com.example.springonsk8s;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloWorldController {

	@GetMapping("/hello")
	public ResponseEntity<Map<String, String>> helloWorld() {
		Map<String, String> response = new HashMap<>();
		response.put("hello", "world");
		return ResponseEntity.ok(response);
	}

	@GetMapping("/")
	public ResponseEntity<String> index() {
		return ResponseEntity.ok("{}");
	}

}
