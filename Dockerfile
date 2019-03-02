FROM fr1zle/openjdk:11.0.1.13-1

RUN /usr/bin/java -Xshare:dump

ENV SPRING_CONFIG_LOCALTION="classpath:/application.properties"
ENV SPRING_PROFILES_ACTIVE="default"

VOLUME /tmp

EXPOSE 8080
EXPOSE 1099

ARG DEPENDENCY=build/dependency
COPY ${DEPENDENCY}/BOOT-INF/lib /app/lib
COPY ${DEPENDENCY}/org /app/org
COPY ${DEPENDENCY}/META-INF /app/META-INF
COPY ${DEPENDENCY}/BOOT-INF/classes /app
