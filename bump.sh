#!/usr/bin/env bash

VERSION=1

PREV_VERSION=$((VERSION - 1))
mv "src/v$PREV_VERSION/" "src/v$VERSION/" 2>/dev/null

sed -i "" "s/v$PREV_VERSION/v$VERSION/g" index.html
sed -i "" "s/v$PREV_VERSION/v$VERSION/g" tutorial.html
sed -i "" "s/v$PREV_VERSION/v$VERSION/g" walkthrough.html
