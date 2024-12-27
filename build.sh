#!/usr/bin/env bash

checksum() {
  FPATH="$1"
  PARENT="$2"
  EXT="$3"
  DIR=$(dirname "$FPATH")
  FILE=$(basename "$FPATH")
  HASH=$(md5sum "$FPATH" | cut -d " " -f 1)

  NEW_FILE="$(echo "$FILE" | cut -d "." -f 1).$HASH.$EXT"
  mv "$FPATH" "$DIR/$NEW_FILE"
  sed -i "" "s#$FILE#$NEW_FILE#g" "$PARENT"
}

find css -type f -name "_*.css" | while read -r FPATH; do
  checksum "$FPATH" "css/main.css" "css";
done

find css -type f -name "_*.css" | while read -r FPATH; do
  checksum "$FPATH" "css/tutorial.css" "css";
done
