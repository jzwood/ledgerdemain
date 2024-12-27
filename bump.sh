#!/usr/bin/env bash

VERSION=1

PREV_VERSION=$((VERSION - 1))
mv "css/v$PREV_VERSION/" "css/v$VERSION/" 2>/dev/null
mv "js/v$PREV_VERSION/" "js/v$VERSION/" 2>/dev/null

sed -i "" "s/v$PREV_VERSION/v$VERSION/g" index.html
sed -i "" "s/v$PREV_VERSION/v$VERSION/g" tutorial.html
