#!/bin/bash

cwd=$(cd $(dirname $0); pwd)
dir_project=$(dirname $(dirname $cwd))
dir_kernel=$dir_project/kernel

# init arguments

version=$1
version_default="6.1.25"

if [ -z "$version" ]; then
    echo "usage: get-kernel.sh <version>"
    echo "example: get-kernel.sh $version_default (or get-kernel.sh default)"
    exit 1
fi
if [ "$version" = "default" ]; then
    version=$version_default
    echo "use default kernel version $version_default"
fi

# get kernel tarball

if [ -f "$dir_project/dist/linux-$version.tar.xz" ]; then
    echo "using local kernel tarball..."
else
    echo "downloading kernel tarball..."
    major=${version%%.*}
    wget -P $dir_project/dist https://cdn.kernel.org/pub/linux/kernel/v$major.x/linux-$version.tar.xz
    # # mainline
    # wget -P $dir_project/dist https://git.kernel.org/torvalds/t/linux-$version.tar.gz
fi
cp $dir_project/dist/linux-$version.tar.xz $dir_project

# cleanup

rm -rf $dir_project/linux-$version
rm -rf $dir_kernel

# setup

echo "decompressing kernel tarball..."
tar -xf $dir_project/linux-$version.tar.xz -C $dir_project
rm $dir_project/linux-$version.tar.xz

mv $dir_project/linux-$version $dir_kernel

file_config=$cwd/kernel.config/linux-$version.config
if [ -f "$file_config" ]; then
    echo "use config file $file_config as the default one."
    cp $file_config $dir_kernel/.config
else
    echo "config file not found for linux-$version; please config it manually."
fi
