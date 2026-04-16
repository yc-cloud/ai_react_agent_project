# ── 第一阶段：Node 构建 ──────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json .
RUN npm ci

COPY . .

# 在 Docker 中 API 由 nginx 代理，使用相对路径 /api
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── 第二阶段：Nginx 托管静态文件 ─────────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
