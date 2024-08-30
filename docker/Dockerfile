FROM ubuntu:22.04

ARG NVM_VERSION v0.39.3
ARG NODE_VERSION 20.17.0
ARG USE_MIRROR fasle

# Set proxy
# ENV HTTP_PROXY http://172.12.0.1:7890
# ENV HTTPS_PROXY http://172.12.0.1:7890
# ENV NO_PROXY localhost,

RUN USE_MIRROR=${USE_MIRROR:-false} && \
    if [ "${USE_MIRROR}"x = "true"x ]; then \
        sed -i 's|archive.ubuntu.com/ubuntu|mirrors.tuna.tsinghua.edu.cn/ubuntu|g' /etc/apt/sources.list && \
        sed -i 's|security.ubuntu.com/ubuntu/|mirrors.tuna.tsinghua.edu.cn/ubuntu|g' /etc/apt/sources.list; \   
    fi 

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y python3 python3-pip wget git tmux ttyd && \
    apt-get install -y gcc g++ make gcc-multilib g++-multilib qemu-system-x86 && \
    apt-get install -y flex bc bison libelf-dev xz-utils libssl-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install nvm and install node 18.0.0
ENV NVM_DIR "/root/.nvm"
ENV NVM_NODEJS_ORG_MIRROR ""

RUN USE_MIRROR=${USE_MIRROR:-false} && \
    if [ "$USE_MIRROR"x = "true"x ]; then \
        export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node; \
    fi && \
    NVM_VERSION=${NVM_VERSION:-"v0.39.3"} && \
    NODE_VERSION=${NODE_VERSION:-"20.17.0"} && \
    wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash && \
    . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm alias default $NODE_VERSION && \
    nvm use default && \
    if [ "${USE_MIRROR}"x = "true"x ]; then npm config set registry https://registry.npmmirror.com/; fi

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/v$NODE_VERSION/bin:$PATH

# Update pip and set break-system-packages = true
RUN USE_MIRROR=${USE_MIRROR:-false} && \
    mkdir -p /root/.config/pip/ && \
    echo "[global]" >> /root/.config/pip/pip.conf && \
    echo "break-system-packages = true" >> /root/.config/pip/pip.conf && \
    if [ "${USE_MIRROR}"x = "true"x ]; then pip3 config set global.index-url https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple; fi && \
    python3 -m pip install --upgrade pip
    
WORKDIR /app

# docker build --build-arg USE_MIRROR=true -t visualinux:1.0 .