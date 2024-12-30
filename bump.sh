#!/usr/bin/env bash

VERSION=2

PREVIOUS="/v$((VERSION - 1))/"
TARGET="/v$VERSION/"

mv "src/$PREVIOUS/" "src/$TARGET/" 2>/dev/null
find . -type f \( -name "*.js" -o -name "*.html" -o -name "*.md" \) -exec sed -i "" "s#$PREVIOUS#$TARGET#g" {} +
