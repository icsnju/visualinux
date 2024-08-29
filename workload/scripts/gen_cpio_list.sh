#!/bin/bash

# usage: gen_cpio_list <path_out> <dir_bin>

out=$1

echo "file /init ./init.sh 0755 0 0" > $out

echo "dir /etc 0755 0 0" >> $out
echo "dir /etc/udhcp 0755 0 0" >> $out
echo "file /etc/udhcp/simple.script ./busybox/examples/udhcp/simple.script 0755 0 0" >> $out
# echo "dir /etc/network 0755 0 0" >> $out
# echo "file /etc/network/interface ./network-itfc 0755 0 0" >> $out

dir_bin=$2
ents=`find $dir_bin/*`

echo "dir /workload 0755 0 0" >> $out
for ent in $ents; do
    target=`realpath --relative-to="_bin" "$ent"`
    if [ -d $ent ]; then
        echo - $ent - $target
        echo "dir /workload/$target 0755 0 0" >> $out
    else
        echo + $ent + $target
        echo "file /workload/$target $ent 0755 0 0" >> $out
    fi
done
