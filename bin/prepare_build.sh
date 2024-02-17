#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR/.."

BROWSER_TYPE="$1"

if [ "$BROWSER_TYPE" != "chrome" ] && [ "$BROWSER_TYPE" != "firefox" ]; then
  echo "Invalid browser type: ${BROWSER_TYPE}"
  exit 1
fi

MANIFEST_FILE="${BROWSER_TYPE}_manifest.json"

# Clean up previous build
rm -rf build
mkdir -p build

cp -r src/* build/
cp "$MANIFEST_FILE" build/manifest.json
