#! /usr/bin/env bash
set -e

# Instructions to install npm/nodejs:
# https://nodejs.org/en/download

# install dependencies
npm install

# compile
npm run compile

# build .vsix file
# it can be used to install extension in VSCode/Cursor
# if the following command fails, you need to install vsce:
# npm install -g @vscode/vsce
vsce package
