#!/usr/bin/env bash
set -euo pipefail
package_path="${1:?Usage: smoke-cli-package.sh <tarball>}"
check_dir="$(mktemp -d)"
trap 'rm -rf "$check_dir"' EXIT
npm install --prefix "$check_dir" --engine-strict --ignore-scripts "$package_path"
"$check_dir/node_modules/.bin/pagerbot" --help > "$check_dir/help.txt"
"$check_dir/node_modules/.bin/botpager" --help > "$check_dir/legacy-help.txt"
cmp "$check_dir/help.txt" "$check_dir/legacy-help.txt"
PAGERBOT_CONFIG="$check_dir/config.json" "$check_dir/node_modules/.bin/pagerbot" devices --json > "$check_dir/devices.json"
node -e 'const data = require(process.argv[1]); if (data.devices.length !== 0) process.exit(1)' "$check_dir/devices.json"
echo 'Packaged Node CLI and both executable names passed.'
