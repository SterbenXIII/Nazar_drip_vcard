FROM ubuntu:22.04@sha256:3ba65aa20f86a0fad9df2b2c259c613df006b2e6d0bfcc8a146afb8c525a9751

LABEL org.opencontainers.image.description="Custom n8n image with pre-installed nodes"

ENV DEBIAN_FRONTEND=noninteractive

# hadolint ignore=DL3008,DL4006
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    gnupg \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g n8n@1.76.3 n8n-nodes-globals@0.2.2 n8n-nodes-text-manipulation@0.3.5 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash node
WORKDIR /home/node

RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node/.n8n

ENV NODE_PATH=/usr/local/lib/node_modules

USER node
EXPOSE 5679

CMD ["n8n"]

