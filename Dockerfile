# syntax=docker/dockerfile:1

# ---------- build ----------
FROM node:24-alpine AS build

WORKDIR /app

ENV CI=true \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# pnpm version comes from the "packageManager" field in package.json.
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# .git is not in the build context, so the commit hash has to be passed in.
ARG COMMIT_HASH=unknown
ENV COMMIT_HASH=${COMMIT_HASH}

RUN pnpm build

# ---------- runtime ----------
FROM nginx:1.30-alpine AS runtime

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Unprivileged user shipped with the nginx image; port 8080 needs no capabilities.
USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
