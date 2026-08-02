# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Voucher System — client (React + Vite) production image.
#
# Builds the SPA to static files, then serves them with nginx (SPA fallback +
# /api proxy to the `server` container). Build context MUST be the repo root.
#
# `VITE_API_BASE_URL` is baked at build time; default keeps API calls same-origin
# (/api/v1) so nginx can proxy them. Override with --build-arg for other setups.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-bookworm-slim AS build
WORKDIR /app
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci

COPY tsconfig.json ./
COPY shared ./shared
COPY client ./client
RUN npm run build:client

# ── Runtime: nginx static server ─────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
