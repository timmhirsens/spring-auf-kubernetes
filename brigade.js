const { events, Job, Group } = require("brigadier");

events.on("push", function(e, project) {
  console.log("received push for commit " + e.revision.commit);

  const dockerTag = `fr1zle/spring-auf-kubernetes:${e.revision.commit.substring(
    0,
    8
  )}`;

  const gradleBuild = new Job("gradle", "openjdk:11.0.2-jdk-slim-stretch");
  gradleBuild.tasks = ["cd src", "./gradlew build"];
  gradleBuild.resourceRequests.memory = "512Mi";
  gradleBuild.resourceRequests.cpu = "100m";
  gradleBuild.resourceLimits.memory = "1Gi";
  gradleBuild.resourceLimits.cpu = "1";

  const dockerBuild = new Job("docker", "docker:18.09.3-dind");
  dockerBuild.task = ["cd src", `docker build . -t ${dockerTag}`];
  dockerBuild.resourceRequests.memory = "200Mi";
  dockerBuild.resourceRequests.cpu = "100m";
  dockerBuild.resourceLimits.memory = "400Mi";
  dockerBuild.resourceLimits.cpu = "200m";
  dockerBuild.docker.enabled = true;
  dockerBuild.privileged = true;

  console.log(JSON.stringify(dockerBuild, 2));

  Group.runEach([gradleBuild, dockerBuild]);
});
