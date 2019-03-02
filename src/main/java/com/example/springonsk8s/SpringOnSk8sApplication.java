package com.example.springonsk8s;

import org.springframework.boot.autoconfigure.SpringBootApplication;

import ch.sbb.esta.openshift.gracefullshutdown.GracefulshutdownSpringApplication;

@SpringBootApplication
public class SpringOnSk8sApplication {

	public static void main(String[] args) {
		GracefulshutdownSpringApplication.run(SpringOnSk8sApplication.class, args);
	}

}
