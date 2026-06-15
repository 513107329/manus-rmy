FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV HOSTNAME=sandbox

# apt 下载重试与超时（大包如字体容易因网络抖动失败）
RUN printf '%s\n' \
    'Acquire::Retries "5";' \
    'Acquire::http::Timeout "120";' \
    'Acquire::https::Timeout "120";' \
    > /etc/apt/apt.conf.d/80-retries

# 写入清华 apt 源（http，避免 ca-certificates 未安装时 https 校验失败）
RUN set -eux; \
    printf '%s\n' \
        'deb http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy main restricted universe multiverse' \
        'deb http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-updates main restricted universe multiverse' \
        'deb http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-backports main restricted universe multiverse' \
        'deb http://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-security main restricted universe multiverse' \
        > /etc/apt/sources.list

# 基础依赖；字体用体积更小的 wqy-zenhei 替代 noto-cjk
RUN set -eux; \
    for i in 1 2 3; do \
        apt-get update && \
        apt-get install -y --no-install-recommends \
            sudo bc curl wget ca-certificates gnupg xz-utils \
            supervisor xterm socat xvfb x11vnc websockify \
            locales language-pack-zh-hans fonts-wqy-zenhei && \
        break || { echo "apt install retry $i/3"; sleep 10; }; \
    done; \
    locale-gen zh_CN.UTF-8 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -d /home/ubuntu -s /bin/bash ubuntu && \
    echo "ubuntu ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/ubuntu

# Node.js 22 从 npmmirror 安装，避免 nodesource 国外源
ENV NODE_VERSION=22.14.0
RUN set -eux; \
    ARCH="$(dpkg --print-architecture)"; \
    case "$ARCH" in \
        amd64) NODE_ARCH=linux-x64 ;; \
        arm64) NODE_ARCH=linux-arm64 ;; \
        *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;; \
    esac; \
    NODE_TAR="node-v${NODE_VERSION}-${NODE_ARCH}.tar.xz"; \
    for i in 1 2 3; do \
        curl -fsSL "https://npmmirror.com/mirrors/node/v${NODE_VERSION}/${NODE_TAR}" -o "/tmp/${NODE_TAR}" && break || \
        { echo "node download retry $i/3"; sleep 5; }; \
    done; \
    tar -xJf "/tmp/${NODE_TAR}" -C /usr/local --strip-components=1; \
    rm "/tmp/${NODE_TAR}"; \
    node -v && npm -v

RUN npm config set registry https://registry.npmmirror.com/

# Ubuntu 22.04 的 chromium-browser 只是 snap 占位包，Docker 内无法运行
# 从 npmmirror 下载 Chrome for Testing 独立二进制
RUN set -eux; \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        unzip \
        fonts-liberation libasound2 libatk-bridge2.0-0 \
        libatk1.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 \
        libnspr4 libnss3 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 xdg-utils && \
    ARCH="$(dpkg --print-architecture)"; \
    case "$ARCH" in \
        amd64) CHROME_PLATFORM=linux64; CHROME_DIR=chrome-linux64 ;; \
        arm64) CHROME_PLATFORM=linux-arm64; CHROME_DIR=chrome-linux-arm64 ;; \
        *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;; \
    esac; \
    CHROME_VERSION="$(curl -fsSL https://cdn.npmmirror.com/binaries/chrome-for-testing/last-known-good-versions.json \
        | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).channels.Stable.version));")"; \
    CHROME_ZIP="${CHROME_DIR}.zip"; \
    for i in 1 2 3; do \
        curl -fsSL "https://cdn.npmmirror.com/binaries/chrome-for-testing/${CHROME_VERSION}/${CHROME_PLATFORM}/${CHROME_ZIP}" \
            -o "/tmp/${CHROME_ZIP}" && break || \
        curl -fsSL "https://registry.npmmirror.com/-/binary/chrome-for-testing/${CHROME_VERSION}/${CHROME_PLATFORM}/${CHROME_ZIP}" \
            -o "/tmp/${CHROME_ZIP}" && break || \
        curl -fsSL "https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSION}/${CHROME_PLATFORM}/${CHROME_ZIP}" \
            -o "/tmp/${CHROME_ZIP}" && break || \
        { echo "chrome download retry $i/3"; sleep 5; }; \
    done; \
    unzip -q "/tmp/${CHROME_ZIP}" -d /opt; \
    rm "/tmp/${CHROME_ZIP}"; \
    ln -sf "/opt/${CHROME_DIR}/chrome" /usr/bin/chromium; \
    ln -sf /usr/bin/chromium /usr/bin/google-chrome-stable; \
    chromium --version; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*

ENV LANG=zh_CN.UTF-8
ENV LANGUAGE=zh_CN:zh
ENV LC_ALL=zh_CN.UTF-8
ENV CHROME_ARGS=""

WORKDIR /sandbox-node

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000 9222 5900 5901

CMD ["supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
