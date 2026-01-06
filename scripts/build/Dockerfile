FROM ubuntu:22.04

ARG NVM_VERSION=0.40.1
ARG NODE_VERSION=20
ARG USE_MIRROR=fasle
ARG proxy=none

RUN USE_MIRROR=${USE_MIRROR:-false} && \
    if [ "${USE_MIRROR}"x = "true"x ]; then \
    sed -i 's|archive.ubuntu.com/ubuntu|mirrors.tuna.tsinghua.edu.cn/ubuntu|g' /etc/apt/sources.list && \
    sed -i 's|security.ubuntu.com/ubuntu/|mirrors.tuna.tsinghua.edu.cn/ubuntu|g' /etc/apt/sources.list; \   
    fi 

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y \
    python3 \
    python3-pip \
    wget \
    git \
    tmux \
    fish \
    ttyd \
    curl \
    gcc \
    g++ \
    make \
    gcc-multilib\
    g++-multilib \
    qemu-system-x86 \
    gdb-multiarch \
    flex \
    bc \
    bison \
    libelf-dev \
    xz-utils \
    libssl-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install nvm and install node 20.17.0 (20 LTS)
ENV NVM_DIR="/root/.nvm"
ENV NVM_NODEJS_ORG_MIRROR=""

RUN if [ "$USE_MIRROR"x = "true"x ]; then \
    export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node; \
    fi && \
    if [ "$proxy"x = "none"x ]; then \
    curl https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VERSION}/install.sh | bash ; \
    else \
    http_proxy=$proxy \
    https_proxy=$proxy \
    curl https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VERSION}/install.sh | bash ;\
    fi

RUN if [ "$USE_MIRROR"x = "true"x ]; then \
    export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node ; \
    fi && \
    if [ "$proxy"x = "none"x ]; then \
    bash -c 'source $NVM_DIR/nvm.sh && \
    nvm alias default $NODE_VERSION && \
    nvm install $NODE_VERSION && \
    nvm use default && \
    if [ "${USE_MIRROR}"x = "true"x ]; then \
    npm config set registry https://registry.npmmirror.com/ ; \
    fi' ; \
    else \
    http_proxy=$proxy \
    https_proxy=$proxy \
    bash -c 'source $NVM_DIR/nvm.sh && \
    nvm alias default $NODE_VERSION && \
    nvm install $NODE_VERSION && \
    nvm use default && \
    if [ "${USE_MIRROR}"x = "true"x ]; then \
    npm config set registry https://registry.npmmirror.com/ ; \
    fi' ; \
    fi


ENV NODE_PATH=$NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH=$NVM_DIR/v$NODE_VERSION/bin:$PATH

# Update pip and set break-system-packages = true
RUN USE_MIRROR=${USE_MIRROR:-false} && \
    mkdir -p /root/.config/pip/ && \
    echo "[global]" >> /root/.config/pip/pip.conf && \
    echo "break-system-packages = true" >> /root/.config/pip/pip.conf && \
    if [ "${USE_MIRROR}"x = "true"x ]; then pip3 config set global.index-url https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple; fi && \
    python3 -m pip install --upgrade pip

WORKDIR /app

# For build this image use 
# docker build -t visualinux:1.0 .
# or 
# docker build --build-arg USE_MIRROR=true --build-arg proxy=<your proxy address with port> -t visualinux:1.0 .

# Recommand docker version:
# Client: Docker Engine - Community
#  Version:           27.1.1
#  API version:       1.46
#  Go version:        go1.21.12
#  Git commit:        6312585
#  Built:             Tue Jul 23 19:57:01 2024
#  OS/Arch:           linux/amd64
#  Context:           default

# Server: Docker Engine - Community
#  Engine:
#   Version:          27.1.1
#   API version:      1.46 (minimum version 1.24)
#   Go version:       go1.21.12
#   Git commit:       cc13f95
#   Built:            Tue Jul 23 19:57:01 2024
#   OS/Arch:          linux/amd64
#   Experimental:     false
#  containerd:
#   Version:          1.7.19
#   GitCommit:        2bf793ef6dc9a18e00cb12efb64355c2c9d5eb41
#  runc:
#   Version:          1.7.19
#   GitCommit:        v1.1.13-0-g58aa920
#  docker-init:
#   Version:          0.19.0
#   GitCommit:        de40ad0
