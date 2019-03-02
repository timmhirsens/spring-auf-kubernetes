const { events, Job } = require("brigadier");

events.on("push", function(e, project) {
  console.log("received push for commit " + e.revision.commit)

  const job = new Job("gradle", "openjdk:11.0.2-jdk-slim-stretch");

  job.tasks = [
    "cd src",
    "./gradlew build"
  ]

  job.run();

})