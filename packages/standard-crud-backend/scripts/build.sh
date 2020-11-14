#!/bin/bash
script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
project_dir="${script_dir}/.."

echo "INFO: Preparing system"
cd $project_dir
echo "INFO: Building"
npm run build
echo "INFO: Copying outputs"
cd dist/
cp ../package.json ./
npm i --only=prod
echo "INFO: Done"