#!/usr/bin/env bash
# Download a standalone BotPager executable. Node and Bun are not required.
set -euo pipefail
main() {
  case "${1:-}" in
    --help|-h) printf '%s\n' 'Install BotPager for macOS/Linux without Node.' 'BOTPAGER_VERSION pins a version; BOTPAGER_INSTALL_DIR defaults to ~/.local/bin.'; return ;;
    '') ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; return 2 ;;
  esac
  local os arch variant='' version base asset dest temp expected actual
  case "$(uname -s)" in Darwin) os=darwin ;; Linux) os=linux ;; *) echo 'Unsupported OS. Windows users: use install.ps1.' >&2; return 1 ;; esac
  case "$(uname -m)" in arm64|aarch64) arch=arm64 ;; x86_64|amd64) arch=x64 ;; *) echo 'Unsupported CPU architecture' >&2; return 1 ;; esac
  if [[ "$os" == linux ]]; then
    for loader in /lib/ld-musl-*.so.1; do [[ ! -e "$loader" ]] || variant='-musl'; done
  fi
  version="${BOTPAGER_VERSION:-}"
  if [[ -z "$version" ]]; then
    # Resolve once, then all downloads use this immutable tag.
    version="$(curl -fsSL --retry 3 https://api.github.com/repos/tolulawson/botpager-cli/releases/latest | awk -F '"' '/"tag_name"[[:space:]]*:/ {print $4; exit}')"
    version="${version#v}"
  fi
  if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then echo 'No valid stable release found' >&2; return 1; fi
  base="${BOTPAGER_DOWNLOAD_BASE:-https://github.com/tolulawson/botpager-cli/releases/download/v$version}"
  asset="botpager-$version-$os-$arch$variant.tar.gz"
  dest="${BOTPAGER_INSTALL_DIR:-$HOME/.local/bin}"
  mkdir -p "$dest"
  temp="$(mktemp -d "$dest/.botpager-install.XXXXXX")"
  trap "rm -rf -- $(printf '%q' "$temp")" EXIT
  curl -fsSL --retry 3 "$base/$asset" -o "$temp/archive.tar.gz"
  curl -fsSL --retry 3 "$base/SHA256SUMS" -o "$temp/checksums"
  expected="$(awk -v file="$asset" '$2 == file {print $1}' "$temp/checksums")"
  [[ "$expected" =~ ^[a-f0-9]{64}$ ]] || { echo 'Missing/invalid checksum' >&2; return 1; }
  if command -v sha256sum >/dev/null 2>&1; then actual="$(sha256sum "$temp/archive.tar.gz" | awk '{print $1}')";
  else actual="$(shasum -a 256 "$temp/archive.tar.gz" | awk '{print $1}')"; fi
  [[ "$actual" == "$expected" ]] || { echo 'Checksum mismatch; existing installation preserved' >&2; return 1; }
  tar -xzf "$temp/archive.tar.gz" -C "$temp" botpager
  chmod 755 "$temp/botpager"
  [[ "$("$temp/botpager" --version)" == "$version" ]] || { echo 'Binary cannot run or version mismatch. On Alpine, install the libstdc++ package first.' >&2; return 1; }
  mv -f "$temp/botpager" "$dest/botpager"
  rm -rf "$temp"
  trap - EXIT
  printf 'Installed BotPager %s at %s/botpager\n' "$version" "$dest"
  case ":$PATH:" in *":$dest:"*) ;; *) printf 'Add this directory to PATH: %s\n' "$dest" ;; esac
  printf 'Next: run botpager pair and scan the QR code in the app.\n'
}
main "$@"
