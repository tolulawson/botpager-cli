# PagerBot CLI

Send messages from a computer to your paired PagerBot mobile app. Requires Node.js 20 or newer and npm. Bun is only needed to build from source.

## Install and pair

```sh
npm install --global @reostack/pagerbot
pagerbot pair --name "My Mac"
```

In the app, open **Computers → +**, scan the QR code or enter the displayed code, and confirm the computer. Keep the terminal open until pairing completes.

```sh
pagerbot send --title "Build complete" --kind success --project api "All checks passed"
echo "Deployment failed" | pagerbot send --kind error -
pagerbot send --title "Task complete" --kind success
```

The default API is `https://pagerbot.reostack.com`. The server saves messages even if notifications are disabled; open Inbox to fetch them. A successful send is not a physical-device delivery receipt.

## Commands

```text
pagerbot pair [--name <computer-name>]
pagerbot send [-d <ref>] [--title <title>] [--kind success|error|info|warning|other]
             [--project <name>] [--priority high|normal] [--json] [message|-]
pagerbot devices [--json]
pagerbot default <ref>
pagerbot rename <ref> <new-phone-name>
pagerbot unlink <ref>
pagerbot status [--json]
```

Device references match an exact ID or name. `devices` lists locally saved pairings. `rename` renames the phone destination. `unlink` revokes that pairing. The legacy `botpager` binary and `link` command are supported.

## Configuration

Pairing credentials are saved in `~/.botpager/config.json`; do not share this file.

- `PAGERBOT_API_URL`: API origin override.
- `PAGERBOT_DEVICE`: default destination override.
- `PAGERBOT_CONFIG`: alternate configuration file.
- Legacy `BOTPAGER_*` equivalents remain supported.

For a local backend, set `PAGERBOT_API_URL=http://127.0.0.1:8787`. Pair the phone against the same backend. Existing configurations keep their saved API URL; switching servers requires pairing again.

## Updating and removing

```sh
npm install --global @reostack/pagerbot@latest
npm uninstall --global @reostack/pagerbot
```

Uninstalling the executable does not revoke pairings. Run `pagerbot unlink <ref>` first if you also want to revoke access.

## Development

This public repository owns the CLI, npm package, installer, and CLI release workflow.
The API and Expo mobile app are maintained separately. Neither source tree is required to build this package.

```sh
git clone https://github.com/tolulawson/pagerbot-cli.git
cd pagerbot-cli
bun install --frozen-lockfile
bun run check
bun run build
node dist/index.js --help
```

Use Bun 1.4.2 for development. CI installs and exercises the packaged executable on Node 20 and 24.
See [RELEASE.md](RELEASE.md) for bootstrap publication and subsequent trusted releases.

## License

[MIT](LICENSE).
