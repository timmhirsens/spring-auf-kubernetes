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

### Deployment

Die Datei `deployment.yaml` beschreibt wie unsere "containerisierte" Spring Boot Anwendung von Kubernetes deployed werden soll.

Unter dem Schlüssel `spec` wird das Deployment an sich konfiguriert:

#### Replicas

```yaml
replicas: 2
selector:
  matchLabels:
    app: spring-auf-kubernetes
```
Hier bestimmen wir vor allem die Anzahl der Pods (`replicas`) und über welchen selector das Deployment seine Pods erkennen soll. In diesem Beispiel soll dies anhand des Labels `app: spring-auf-kubernetes` passieren.

#### Container Konfiguration

Unter dem Punkt `template` definieren wir ein Pod-Template, beschreiben also, wie die zu diesem Deployment gehörigen und vom ReplicaSet erstellten Pods aussehen sollen.
Neben den Metadaten und der Konfiguration für Prometheus (Metriken) werden hier vorallem die Container des Pods konfiguriert. In unserem Fall haben wir einen einzigen Container, der unsere Spring Boot Anwendung enthält.

Da wir in unserem `Dockerfile` Tini als `ENTRYPOINT` definiert haben konfigurieren wir im Pod selber nur noch die `args` (entspricht in etwa dem Docker `CMD`).

```yaml
          args: [
            "/usr/bin/java",
            "-Djava.awt.headless=true",
            "-Duser.home=/tmp",
            "-Dfile.encoding=UTF-8",
            "-Dsun.jnu.encoding=UTF-8",
            "-Djava.security.egd=file:/dev/./urandom",
            "-Dcom.sun.management.jmxremote",
            "-Dcom.sun.management.jmxremote.authenticate=false",
            "-Dcom.sun.management.jmxremote.ssl=false",
            "-Dcom.sun.management.jmxremote.local.only=false",
            "-Dcom.sun.management.jmxremote.port=1099",
            "-Dcom.sun.management.jmxremote.rmi.port=1099",
            "-Djava.rmi.server.hostname=127.0.0.1",
            "-noverify",
            "-cp",
            "app:app/lib/*",
            "org.springframework.boot.loader.JarLauncher"
          ]
```

Neben dem JMX Zugriff wird hier das Encoding und der Classpath unserer Anwendung konfiguriert. Letzteres müssen wir hier selber machen, da wir ja das FatJar wieder entpackt haben.

#### Kubernetes Probes

Eine weitere wichtigere Konfiguration unseres Pods sind die Kubernetes Probes:

```yaml
readinessProbe:
    httpGet:
        path: /actuator/health
        port: 8080
    initialDelaySeconds: 30
    periodSeconds: 10
    timeoutSeconds: 3
livenessProbe:
    httpGet:
        path: /actuator/info
        port: 8080
    initialDelaySeconds: 30
    periodSeconds: 10
    timeoutSeconds: 3
```

Die ReadinessProbe bestimmt, ob ein jeweiliger Pod Traffic durch den Service enthält. Liefert dieser Fehler wird der entsprechende Pod aus dem Loadbalancing des Services enfernt. Der Pod selber bleibt allerdings bestehen und wir **nicht** neugestartet.

Anders ist dies bei der LivenessProbe. Diese überprüft ob unsere Anwendung überhaupt auf Anfragen reagiert. Gibt es hier Fehler, so wird der Pod gelöscht und das ReplicaSet stellt einen neuen zur Verfügung.

Aufgrund dieser unterschiedlichen Funktionsweise der beiden Probes ist es in den meisten Fällen ratsam **unterschiedliche** Endpunkte zu wählen.

Für die *ReadinessProbe* eignet sich der Health Endpunkt der Spring Boot Actuators. Wenn hier definierte HealthChecks fehlschlagen, ist es sinnvoll, dass unsere Anwendung keinen weiteren Traffic erhält.

Die *LivenessProbe* hingegen kann eigentlich jeder Endpunkt sein, der immer eine statische (Http Status 2xx) Antwort liefert. Der Info Endpunkt aus den Actuators bietet sich an, es könnte aber auch eine Login-Seite oder ähnliches sein.

#### Resourcen

Um Ordnung in unserem Cluster zu halten ist es sinnvoll die Resourcen einer jeden Anwendung zu beschränken. So hat das Fehlverhalten einer Anwendung (CPU-Auslastung, Memory Leaks, ...) keinen / kaum Einfluss auf die anderen Anwendungen in unserem Cluster.

Auch die Resourcen werden in unserem Deployment konfiguriert:

```yaml
resources:
    requests:
        cpu: 100m
        memory: 500Mi
    limits:
        cpu: 2
        memory: 800Mi
```
In Kubernetes gibt es zwei verschieden Arten von Resourcen-Konfiguration, *Requests* und *Limits*. 

Mit *Requests* geben wir an, welche Resourcen unsere Anwendung mindest benötigt. Vom Cluster erhalten wir die Garantie mindestens diese Resourcen zu bekommen.

*Limits* hingegen definieren wie viele Resourcen unsere Anwendung **maximal** verwenden darf. Wird mehr CPU genutzt, drosselt Kubernetes unsere Anwendung. Wird mehr Arbeitsspeicher verbaucht wird unsere Anwendung beendet (OOMKill).

Für einen Spring Boot Microservice mit wenigen Requests pro Sekunde (<100) reichen 100m (also quasi 1/10) CPU für gewöhnlich aus. Beim Start einer Spring Anwendung passiert allerdings einiges, insbesondere wenn Spring Data und Hibernate im Spiel sind. Daher geben wir unserer Anwendung etwas Luft und lassen sie bis zu 2 CPUs verwenden. So können wir einen (halbwegs) schnellen Start garantieren.

Wie viel Arbeitsspeicher benötigt wird ist natürlich auch stark von der Anwendung abhängig. Für unser einfaches *Hello World* Beispiel reichen 500MB aber locker. Da wir eine aktuelle Java Version verwenden orientiert sich die JVM an diesen 500MB für die Konfiguration des Heaps. Bei den Limits geben wir daher auch nur noch 300MB zusätzlich für Off-Heap-Memory. 

### Service

Die Konfiguration des Services ist relativ unspektakulär. 

```yaml
kind: Service
apiVersion: v1
metadata:
  name: spring-auf-kubernetes
spec:
  selector:
    app: spring-auf-kubernetes
  ports:
    - protocol: TCP
      port: 8080
      name: http
```

Wir selektieren die Pods, die der Service loadbalancen soll anhand des Labels `app`. Zusätzlich geben wir noch an, dass der Service auf Port 8080 lauschen soll. Unsere Pods lauschen ebenfalls auf 8080.

### Ingress

Ob und wie man einen Ingress konfiguriert ist von Cluster zu Cluster immer etwas unterschiedlich. In meinem Testcluster verwende ich den [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/). Zusätzlich verwende ich den cert-manager, welcher automatisch Let`s Encrypt SSL Zertifikate für meine Hosts besorgt.

```yaml
spec:
  rules:
  - host: spring-auf-kubernetes.staging.br0tbox.de
    http:
      paths:
      - backend:
          serviceName: spring-auf-kubernetes
          servicePort: 8080
        path: /
```

Das wichtigste sind die Rules im Ingress, hier definieren wie einen Host und einen Pfad unter dem unsere Anwendung aus dem Internet heraus erreichbar sein soll.

## Build Pipeline (`Jenkinsfile`)