#!/bin/bash
script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
project_dir="${script_dir}/.."

npm ci --ignore-scripts
lerna bootstrap
npm rebuild && npm run prepare --if-present
npm run build
lerna run build
git config --global user.email autobot@aftersignals.com
git config --global user.name "AfterSignals Automation"
npm version patch -m "[skip ci] publish new version"
npm publish