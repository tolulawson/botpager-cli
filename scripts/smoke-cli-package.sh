#!/usr/bin/env bash
set -euo pipefail
package_path="${1:?Usage: smoke-cli-package.sh <tarball>}"
check_dir="$(mktemp -d)"
trap 'rm -rf "$check_dir"' EXIT
npm install --prefix "$check_dir" --engine-strict --ignore-scripts "$package_path"
"$check_dir/node_modules/.bin/botpager" --help > "$check_dir/help.txt"
BOTPAGER_CONFIG="$check_dir/config.json" "$check_dir/node_modules/.bin/botpager" devices --json > "$check_dir/devices.json"
node -e 'const data = require(process.argv[1]); if (data.devices.length !== 0) process.exit(1)' "$check_dir/devices.json"
node "$(dirname "$0")/test-cli-runtime.mjs" "$check_dir/node_modules/.bin/botpager"
echo 'Packaged BotPager CLI passed.'
