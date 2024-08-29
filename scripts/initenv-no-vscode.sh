#!/bin/bash

export dir_scripts=$(cd $(dirname $0); pwd)
export dir_project=$(dirname $dir_scripts)
export dir_kernel="$dir_project/kernel"

# init arguments

version=$1

if [ -z "$version" ]; then
    echo "usage: initenv-no-vscode.sh <version>"
    echo "example: initenv-no-vscode.sh 6.1.25 (or initenv.sh default)"
    exit 1
fi

# install requirements

echo "+ start initenv.sh"

echo "+ install python requirements..."
pip3 install --timeout=60 -r $dir_scripts/build/py-requirements.txt

echo "+ install node.js and npm packages..."
(cd $dir_project/visualizer && bash $dir_scripts/build/node_install.sh)

echo "+ fetch busybox and linux kernel source..."
bash $dir_scripts/build/get-busybox.sh
bash $dir_scripts/build/get-kernel.sh $version

echo "+ build kgdb auxi tool..."
make -C $dir_scripts/kgdb/agent-proxy/
