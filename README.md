#  Mit Spring, Docker & Kubernetes nach Produktion schippern

In diesem Projekt sind die Beispielsourcen für meinen JavaLand 2019 Talk
[Mit Spring, Docker & Kubernetes nach Produktion schippern](https://programm.javaland.eu/2019/#/scheduledEvent/569781).

## Getting Started

Für ein Deployment solltet ihr entweder Minikube installiert haben oder einen "echten" Kubernetes Cluster zur Verfügung haben.
Bei [DigitalOcean](https://m.do.co/c/3f3d6697260e) gibt es diesen schon für den schmalen Geldbeutel. Bei der Anmeldung über meinen [Referal-Link](https://m.do.co/c/3f3d6697260e) gibt es für euch
außerdem 100$ in Credits dazu (für mich dann 25$, sobald ihr selber etwas _investiert_).

## Gradle Abhängigkeiten

Um mit unserem Beispielprojekt nach Produktion schippern zu können müssen wir ein paar Abhängigkeiten in der Datei `build.gradle`
definieren:

`implementation 'org.springframework.boot:spring-boot-starter-actuator'`

Die Actuator benötigen wir für unsere `livenessProbe` und `readynessProbe`. Diese verwenden die entsprechenden Spring Actuator
Endpunkte `actuator/info` und `actuator/health`.

`implementation 'ch.sbb:springboot-graceful-shutdown:2.0.1'`

Diese Bibliothek der Schweizerische Bundesbahnen ermöglicht es uns unsere Container von Kubernetes kontrolliert herunterfahren zu
lassen, ohne das aktive Requests verloren gehen. Damit das funktioniert muss unsere `main`-Methode entsprechend angepasst werden:

```java
public static void main(String[] args) {
    GracefulshutdownSpringApplication.run(SpringOnSk8sApplication.class, args);
}
```

Da wir uns das Docker overlay-Dateisystem zu nutzen machen wollen, entpacken wir am Ende des Builds das Spring Boot Fat-Jar wieder.

```groovy
task unpack(type: Copy) {
    dependsOn bootJar
    from(zipTree(tasks.bootJar.outputs.files.singleFile))
    into("build/dependency")
}

build.dependsOn unpack
```

## Docker Images

In dem Verzeichnis `docker` befinden sich die `Dockerfiles` die für den Betrieb der Beispielanwendung benötigt werden:

### `java-base/Dockerfile`

Hierbei handelt es sich um ein Basis-Image für Container die eine JVM (um genau zu sein ein JDK) benötigen. Wir verwendenden
ein JDK anstelle einer JRE um vollen Zugriff auf die Java-eigenen Debug-Tools im Container zu haben. Benötigt man diese nicht
kann man auch nur ein JRE installieren.

Neben dem JDK ist auch [tini](https://github.com/krallin/tini) installiert. `tini` ist ein minimales Init-System, welches uns dabei hilft das [PID-1 Problem](https://github.com/krallin/tini/issues/8) zu umgehen.

**Bitte verwendet dieses Basis-Image nicht für eure produktiven Services. Das Image dient lediglich als Beispiel und ich kann euch keine Garantien geben!**

## Kubernetes Konfiguration

Die Konfigurationsdatein für Kubernetes befinden sich im Ordner `k8s`.

Die Datei `deployment.yaml` beschreibt wie unsere "containerisierte" Spring Boot Anwendung von Kubernetes deployed werden soll.


