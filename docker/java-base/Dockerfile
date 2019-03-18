FROM centos:centos7.6.1810

LABEL maintainer="Timm Hirsens <mail@timmhirsens.de>"

ENV TINI_VERSION v0.18.0

RUN yum install java-11-openjdk-headless-11.0.2.7 java-11-openjdk-devel-11.0.2.7 --setopt=tsflags=nodocs -y \
    && curl -fsSL "https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini" -o tini \
    && chmod a+x tini \
    && rm -rf /var/cache/yum \
    && yum clean all

ENTRYPOINT ["/tini", "--"]
