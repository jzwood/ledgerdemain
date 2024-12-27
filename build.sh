#!/usr/bin/env bash

checksum() {
  FPATH="$1"
  EXT="${FPATH##*.}"
  DIR=$(dirname "$FPATH")
  FILE=$(basename "$FPATH")
  HASH=$(md5sum "$FPATH" | cut -d " " -f 1)

  NEW_FILE="$(echo "$FILE" | cut -d "." -f 1).$HASH.$EXT"
  mv "$FPATH" "$DIR/$NEW_FILE"
  echo "s#$FILE#$NEW_FILE#g"
}

find css -type f -name "_*.css" | while read -r FPATH; do
  SED=$(checksum "$FPATH")
  sed -i "" "$SED" "css/main.css"
  sed -i "" "$SED" "css/tutorial.css"
done
