#!/bin/sh

echo -e "\nFinal initialization.\n"

# init system fs

mkdir -p /dev
# mknod -m 0600 /dev/console c 5 1
# mknod -m 0644 /dev/loop0   b 7 0
# mknod -m 0666 /dev/null    c 1 3
# mknod -m 0666 /dev/zero    c 1 5
# mknod -m 0660 /dev/tty   c 5 0
# mknod -m 0660 /dev/ttyS0 c 4 64

mkdir -p /etc
mkdir -p /tmp
# mkdir -m 0700 /root

mkdir -p /proc
mkdir -p /sys
mount -t proc none /proc
mount -t sysfs none /sys
mount -t devtmpfs none /dev
mount -t tmpfs none /tmp
mount -t debugfs none /sys/kernel/debug
mount -t tracefs nodev /sys/kernel/tracing

# init network

ip link set eth0 up
udhcpc -i eth0 -s /etc/udhcp/simple.script

ifconfig lo 127.0.0.1 netmask 255.255.255.0
ifconfig eth0 10.0.2.15 netmask 255.255.255.0
route add default gw 10.0.2.2
echo "nameserver 8.8.8.8" > /etc/resolv.conf

# init ftrace

# echo function_graph > /sys/kernel/tracing/current_tracer
# echo schedule > /sys/kernel/tracing/set_graph_function
# echo 'syscalls:*' > /sys/kernel/tracing/set_event
# echo 'raw_syscalls:sys_enter' > /sys/kernel/tracing/set_event

echo -e "\nBoot took $(cut -d' ' -f1 /proc/uptime) seconds\n"

# prepare swaparea for visualinux evaluation

SWAP_FILE=/workload/swapfile
dd if=/dev/zero of=$SWAP_FILE bs=1024 count=16
mkswap $SWAP_FILE
chmod 600 $SWAP_FILE
swapon $SWAP_FILE

# workload entry

./workload/test/summation

DIRTY_PIPE_TESTFILE=./workload/dirty-pipe/test.txt
yes 'a' | head -n 10000 > $DIRTY_PIPE_TESTFILE
# ./workload/dirty-pipe/exploit $DIRTY_PIPE_TESTFILE 3 xxyyyzz

# ./workload/exp/exploit

# mkdir -p /exp
# mount -t 9p exp /exp
# cp /workload/exp/exploit /exp/
# ./exp/exploit

sh
