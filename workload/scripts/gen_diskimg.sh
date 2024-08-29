#!/bin/bash

# usage: gen_diskimg <path_image> <image_size_MB> <dir_disk>

image=$1
size=$2
dir_disk=$3

rm -f $image
dd if=/dev/zero of=$image bs=1024 count=`expr $size \* 1024`
mkfs.ext4 -d $dir_disk $image
