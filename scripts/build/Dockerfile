FROM ubuntu:22.04

RUN apt-get update
RUN apt-get install -y gcc g++ make
RUN apt-get install -y gcc-multilib g++-multilib
RUN apt-get install -y qemu-system-x86

RUN apt-get install -y flex bc bison
RUN apt-get install -y libelf-dev
RUN apt-get install -y xz-utils

ADD . /kernel/

FROM {kernel}:env
WORKDIR /kernel/

RUN make -j4
