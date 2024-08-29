#!/bin/bash

export dir_scripts=$(cd $(dirname $0); pwd)
export dir_project=$(dirname $dir_scripts)
export dir_kernel="$dir_project/kernel"

# init arguments

version=$1

if [ -z "$version" ]; then
    echo "usage: initenv.sh <version>"
    echo "example: initenv.sh 6.1.25 (or initenv.sh default)"
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

echo "+ prepare vscode environment..."
cp -r $dir_scripts/dev/kernel.vscode $dir_kernel/.vscode

echo "+ install vscode extensions..."
for extension in $(cat $dir_scripts/dev/vscode-recommendations.txt); do
    code --install-extension $extension
done

echo "+ build and install the vscode extension of VKern language..."
(cd $dir_scripts/dev/vkern-lang-extension && npm install && npx vsce package --allow-missing-repository && code --install-extension vkern-lang-extension-1.0.0.vsix)

echo "+ build kgdb auxi tool..."
make -C $dir_scripts/kgdb/agent-proxy/
