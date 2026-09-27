#!/usr/bin/env bash
# Companion installer endpoint:
# https://botpager-api.reostack.com/cli/install.sh
# Install the public npm package; publication is required before this can succeed.
set -euo pipefail

main() {
  local package_name='@reostack/botpager'
  local prefix executable

  case "${1:-}" in
    --help|-h)
      printf '%s\n' 'Install the BotPager companion CLI using your existing Node.js and npm.' \
        'Usage: bash install.sh' 'Requires: macOS or Linux, Bash, Node.js and npm.' \
        'Does not install Node.js, change shell profiles, elevate privileges, or pair a computer.'
      return 0
      ;;
    '') ;;
    *) printf 'Unknown argument: %s\nUse --help for usage.\n' "$1" >&2; return 2 ;;
  esac

  case "$(uname -s)" in
    Darwin|Linux) ;;
    *) printf '%s\n' 'This Bash installer supports macOS and Linux. Use npm installation on other systems.' >&2; return 1 ;;
  esac

  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    printf '%s\n' 'Node.js and npm are required. Install them first, then rerun this installer.' >&2
    return 1
  fi

  printf 'Installing %s…\n' "$package_name"
  # Honor the published package's engines requirement instead of guessing a Node.js minimum.
  if ! npm install --global --engine-strict "$package_name"; then
    printf '%s\n' 'Installation failed. The companion package may not be published yet.' \
      'Review the npm error above for network, runtime, or permissions problems.' \
      'For permissions errors, use a user-owned npm installation; this script never invokes sudo.' >&2
    return 1
  fi

  prefix="$(npm prefix --global)" || return 1
  executable="$prefix/bin/botpager"
  if [[ ! -x "$executable" ]]; then
    printf 'npm completed, but the expected executable is missing: %s\n' "$executable" >&2
    printf '%s\n' 'The package must expose a botpager executable through its package.json bin field.' >&2
    return 1
  fi

  printf '\nBotPager companion installed at %s\n' "$executable"
  if ! command -v botpager >/dev/null 2>&1; then
    printf 'Add %s to your PATH or run the installed executable directly.\n' "$prefix/bin"
  fi
  printf '\nNext: run botpager pair, then scan the QR code in the mobile app.\n'
}

# A piped download cannot begin installation until this function definition has been received.
main "$@"
