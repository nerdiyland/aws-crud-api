#!/bin/bash
script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
project_dir="${script_dir}/.."

npm ci --ignore-scripts
lerna bootstrap
npm rebuild && npm run prepare --if-present
npm run build
lerna run build
npm version patch -s -m "chore: publish new version [skip ci]"
# npm publish
