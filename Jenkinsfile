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
                label 'build'
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

        stage("Deploy") {
            agent {
                label 'deploy'
            }
            stages {
                stage("Deploy to dev") {
                    when {
                        branch 'develop'
                    }
                    steps {
                        sh "echo 'Deploying to dev using ${env.KUBE_API_SERVER}'"
                    } 
                }
                stage("Deploy to staging") {
                    when {
                        branch 'master'
                    }
                    steps {
                        sh "echo 'Deploying to staging using ${env.KUBE_API_SERVER}'"
                    } 
                }                
            }
        }

    }
}
