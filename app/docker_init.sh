#!/bin/bash

touch ~/.bashrc
echo "alias ll='ls -ltra'" > ~/.bashrc

#curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
#. ~/.nvm/nvm.sh
#. ~/.bashrc
#nvm install node
#
#printf "\n---------------\n"

#node -e "console.log('Running Node.js ' + process.version)"
#npm install nodemon -g
npm install
npm run-script startdev

