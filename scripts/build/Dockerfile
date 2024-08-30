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