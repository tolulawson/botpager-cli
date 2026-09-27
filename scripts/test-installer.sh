#!/usr/bin/env bash
set -euo pipefail
# Run only with a freshly built host binary. No Node/Bun is made available to installer.
artifacts="$(cd "${1:?artifacts directory}" && pwd)"
root="$(mktemp -d)"
trap 'rm -rf "$root"' EXIT
mkdir -p "$root/tools" "$root/downloads"
for tool in bash uname mktemp mkdir rm cp mv chmod tar curl shasum sha256sum awk grep cut tr cat head; do
  path="$(command -v "$tool" || true)"
  if [[ -n "$path" ]]; then ln -s "$path" "$root/tools/$tool"; fi
done
version="$(cat VERSION)"
# The test uses the same download and checksum path as a release, through file:// assets.
cp "$artifacts"/* "$root/downloads/"
PATH="$root/tools" BOTPAGER_INSTALL_DIR="$root/install space" BOTPAGER_VERSION="$version" BOTPAGER_DOWNLOAD_BASE="file://$root/downloads" bash install.sh
[[ "$(PATH="$root/tools" "$root/install space/botpager" --version)" == "$version" ]]
PATH="$root/tools" BOTPAGER_INSTALL_DIR="$root/install space" BOTPAGER_VERSION="$version" BOTPAGER_DOWNLOAD_BASE="file://$root/downloads" bash install.sh
before="$(shasum -a 256 "$root/install space/botpager")"
printf 'corruption' >> "$(find "$root/downloads" -name '*.tar.gz' -print -quit)"
if PATH="$root/tools" BOTPAGER_INSTALL_DIR="$root/install space" BOTPAGER_VERSION="$version" BOTPAGER_DOWNLOAD_BASE="file://$root/downloads" bash install.sh; then
 echo 'Corrupt archive accepted' >&2; exit 1
fi
[[ "$before" == "$(shasum -a 256 "$root/install space/botpager")" ]]
printf '{"passed":true,"nodeRequired":false,"checks":["space in path","repeat install","version","corruption rejected","existing binary preserved"]}\n' > "$artifacts/installer-report.json"
