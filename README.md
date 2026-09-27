# BotPager CLI

Send messages from a computer to your paired BotPager mobile app. Standalone installers require neither Node.js nor Bun. The npm installation requires Node.js 20 or newer. Bun is only needed to build from source.

## Install and pair

### Standalone (no Node)

macOS and Linux:

```sh
curl -fsSL https://botpager.reostack.com/cli/install.sh | bash
```

Windows x64 (PowerShell):

```powershell
irm https://botpager.reostack.com/cli/install.ps1 | iex
```

Installers verify SHA256 checksums, install into a user-owned directory, and leave shell profiles unchanged. Follow the printed PATH instructions if needed. Set `BOTPAGER_VERSION=0.1.0` to pin a release and `BOTPAGER_INSTALL_DIR` to change the destination. Supported standalone builds: macOS ARM64/x64, Linux ARM64/x64 (glibc and musl), Windows x64. Alpine requires its standard `libstdc++` package; installers also require curl, tar/gzip and a SHA256 utility. OS/runtime minimums still apply; unsupported architectures are rejected.

### npm

```sh
npm install --global @reostack/botpager
botpager pair --name "My Mac"
```

In the app, open **Computers → +**, scan the QR code or enter the displayed code, and confirm the computer. Keep the terminal open until pairing completes.

```sh
botpager send --title "Build complete" --kind success --project api "All checks passed"
echo "Deployment failed" | botpager send --kind error -
botpager send --title "Task complete" --kind success
```

The default API is `https://botpager-api.reostack.com`. The server saves messages even if notifications are disabled; open Inbox to fetch them. A successful send is not a physical-device delivery receipt.

## Commands

```text
botpager pair [--name <computer-name>]
botpager send [-d <ref>] [--title <title>] [--kind success|error|info|warning|other]
             [--project <name>] [--priority high|normal] [--json] [message|-]
botpager devices [--json]
botpager default <ref>
botpager rename <ref> <new-phone-name>
botpager unlink <ref>
botpager status [--json]
```

Device references match an exact ID or name. `devices` lists locally saved pairings. `rename` renames the phone destination. `unlink` revokes that pairing. The command is `botpager pair`; no legacy command aliases are provided.

### Message input

A send with `--title` and no message arguments sends immediately without reading stdin. Use `-` explicitly to include piped input with a title: `printf "Details" | botpager send --title "Complete" -`. Without a title or positional message, non-interactive stdin is consumed automatically. UTF-8 input is decoded across stream chunks.

Use `--` to send option-like text literally: `botpager send -- --deployment-failed`, `botpager send -- --help`, or `botpager send -- --json`.

## Configuration

Pairing credentials are saved in `~/.botpager/config.json`; do not share this file.

- `BOTPAGER_API_URL`: API origin override.
- `BOTPAGER_DEVICE`: default destination override.
- `BOTPAGER_CONFIG`: alternate configuration file.

For a local backend, set `BOTPAGER_API_URL=http://127.0.0.1:8787`. Pair the phone against the same backend. Each configuration file belongs to one API server. To use another server, select a separate profile before pairing; BotPager rejects cross-origin overrides when the selected profile already contains pairings. This prevents sending credentials to the wrong server.

```sh
export BOTPAGER_CONFIG="$HOME/.botpager/local.json"
export BOTPAGER_API_URL="http://127.0.0.1:8787"
botpager pair
botpager send "Testing the local backend"
```

To return to the default profile, unset both variables. The profiles retain independent devices and defaults.

## Updating and removing

### Standalone (no Node)

macOS and Linux:

```sh
curl -fsSL https://botpager.reostack.com/cli/install.sh | bash
```

Windows x64 (PowerShell):

```powershell
irm https://botpager.reostack.com/cli/install.ps1 | iex
```

Installers verify SHA256 checksums, install into a user-owned directory, and leave shell profiles unchanged. Follow the printed PATH instructions if needed. Set `BOTPAGER_VERSION=0.1.0` to pin a release and `BOTPAGER_INSTALL_DIR` to change the destination. Supported standalone builds: macOS ARM64/x64, Linux ARM64/x64 (glibc and musl), Windows x64. Alpine requires its standard `libstdc++` package; installers also require curl, tar/gzip and a SHA256 utility. OS/runtime minimums still apply; unsupported architectures are rejected.

### npm

```sh
npm install --global @reostack/botpager@latest
npm uninstall --global @reostack/botpager
```

Uninstalling the executable does not revoke pairings. Run `botpager unlink <ref>` first if you also want to revoke access.

## Development

This public repository owns the CLI, npm package, installer, and CLI release workflow.
The API and Expo mobile app are maintained separately. Neither source tree is required to build this package.

```sh
git clone https://github.com/tolulawson/botpager-cli.git
cd botpager-cli
bun install --frozen-lockfile
bun run check
bun run build
node dist/index.js --help
```

Use Bun 1.4.2 for development. CI installs and exercises the packaged executable on Node 20 and 24.
See [RELEASE.md](RELEASE.md) for bootstrap publication and subsequent trusted releases.

## License

[MIT](LICENSE).

### Computer identity

Pairing uses a persistent, randomly generated computer ID in `~/.botpager/computer-id`.
It is shared across CLI profiles for your OS user and stays the same when you rename
this computer. Keep this file when moving configuration. Deleting it creates a new
installation identity. The mobile app supplies its own persistent phone ID; the API
rejects a second pairing of the same computer and phone with `ALREADY_PAIRED`.
Pairing with a different phone is allowed. Remove an existing pairing before pairing
that phone again. This requires the matching updated BotPager backend and mobile app.
