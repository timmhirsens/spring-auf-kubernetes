#!/usr/bin/env groovy

//noinspection GroovyAssignabilityCheck
pipeline {
    agent none

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    stages {
        stage("Build") {
            agent {
                label 'java'
            }
            stages {
                stage("Gradle Build") {
                    steps {
                        container("openjdk-11") {
                            sh "./gradlew build"
                        }
                    }                   
                }
                stage("Docker build") {
                    steps {
                        container("docker") {
                            script {
                                shortCommit = env.GIT_COMMIT.take(8)
                            }
                            sh "docker build . -t fr1zle/spring-on-sk8s:$shortCommit"
                        }
                    }
                }
            }
        }
    }
}
