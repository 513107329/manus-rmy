FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV UV_PROJECT_ENVIRONMENT="/venv"
ENV UV_LINK_MODE=copy

RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    wget \
    git \
    ca-certificates \
    openssh-server \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir /var/run/sshd

RUN echo "root:root" | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /workspace

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen

EXPOSE 22 8000

CMD ["/usr/sbin/sshd", "-D"]