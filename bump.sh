#!/usr/bin/env bash

VERSION=1

PREV_VERSION="v$((VERSION - 1))"
mv "css/$PREV_VERSION/" "css/v$VERSION/" 2>/dev/null
mv "js/$PREV_VERSION/" "js/v$VERSION/" 2>/dev/null

sed -i "" "s/$PREV_VERSION/$VERSION/g" index.html
