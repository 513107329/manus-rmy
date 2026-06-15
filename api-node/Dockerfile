FROM node:22-bookworm

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com/

# 来自 .env 的运行时配置（构建时 COPY .env 后也会写入 process.env）
ENV ENV=develop
ENV LOG_LEVEL=info
ENV LOG_FILE=logs/app.log
ENV PORT=8080
ENV DATABASE_URL=postgresql://postgres:postgres@manus-db-dev:5432/manus?schema=public
ENV REDIS_HOST=manus-redis-dev
ENV REDIS_PORT=6379
ENV REDIS_PASSWORD=
ENV REDIS_DB=0
ENV TOS_ENDPOINT=tos-cn-shanghai.volces.com
ENV TOS_REGION=cn-shanghai
ENV TOS_BUCKET=soon-web
ENV SANDBOX_ADDRESS=
ENV SANDBOX_IMAGE=sandbox-node-dev
ENV SANDBOX_NAME_PREFIX=sandbox-node-dev
ENV SANDBOX_TTL_MINUTES=60
ENV SANDBOX_NETWORK=manus-network-dev
ENV SANDBOX_CHROME_ARGS=
ENV SANDBOX_HTTPS_PROXY=
ENV SANDBOX_HTTP_PROXY=
ENV SANDBOX_NO_PROXY=
ENV APP_CONFIG_FILEPATH=app_config.yaml
ENV STORAGE_MODE=local

# 使用国内 apt 镜像，避免 deb.debian.org 502/网络不可达
RUN set -eux; \
    printf '%s\n' \
        'Acquire::Retries "5";' \
        'Acquire::http::Timeout "120";' \
        > /etc/apt/apt.conf.d/80-retries; \
    for f in /etc/apt/sources.list /etc/apt/sources.list.d/debian.sources; do \
        [ -f "$f" ] && sed -i \
            -e 's|deb.debian.org|mirrors.aliyun.com|g' \
            -e 's|security.debian.org|mirrors.aliyun.com/debian-security|g' \
            "$f" || true; \
    done; \
    apt-get update && apt-get install -y --no-install-recommends curl libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install

COPY tsconfig.json ./
COPY app_config.yaml ./
COPY .env .env
COPY src ./src

# 构建阶段加载 .env（供 prisma generate 等使用）
RUN set -a && . ./.env && set +a && npx prisma generate && npm run build

EXPOSE 8080
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
