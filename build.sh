#!/usr/bin/env bash

tag=fr1zle/spring-on-sk8s:$(date +"%Y%m%d%H%M%S")

./gradlew build \
&& docker build . -t $tag

sed -i.bak "s#fr1zle/spring-on-sk8s:.*#$tag#" k8s/deployment.yaml