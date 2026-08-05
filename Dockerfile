# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder

WORKDIR /app

# Vite compiles these into the bundle, so the API address has to be known while
# the image is built - not when the container starts. A build for another
# environment needs its own --build-arg.
ARG VITE_API_BASE_URL=http://localhost:8001
ARG VITE_FACEBOOK_PAGE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_FACEBOOK_PAGE_URL=$VITE_FACEBOOK_PAGE_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


# The unprivileged image runs as a non-root user and listens on 8080, matching
# how the API container is run.
FROM nginxinc/nginx-unprivileged:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
