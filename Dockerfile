# Stage 1: Build React SPA production bundle
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY index.html vite.config.js ./
COPY src ./src

RUN npm run build

# Stage 2: Hardened rootless NGINX runtime (UID 101)
FROM nginxinc/nginx-unprivileged:1.27-alpine-slim

USER root
RUN apk upgrade --no-cache

COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=101:101 /app/build /usr/share/nginx/html

USER 101:101

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
