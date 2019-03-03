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
            steps {
                container("openjdk-11") {
                    sh "./gradlew build"
                }
            }
        }
    }
}
