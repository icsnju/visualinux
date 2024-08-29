#!/bin/bash

if [ -z "$dir_project" ]; then
    echo "env var dir_project must be provided"
    exit 1
fi

version_cur="$(node -v)"
version_cur="${version_cur:1}"
version_req="18.0.0"

if [ "$(printf '%s\n' "$version_req" "$version_cur" | sort -V | head -n1)" = "$version_req" ]; then 
    echo "node version check passed: $version_cur > $version_req"
    npm install
    exit 0
fi

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# to use nvm now
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node
nvm install 18
npm install
