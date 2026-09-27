---
name: botpager
description: Send task updates to a paired phone using the BotPager CLI. Use when the user asks for mobile notifications about completion, failure, or decisions needed during agent work, or needs help installing and pairing BotPager.
---

# BotPager

Use `botpager` to notify the user's paired phone when they have requested updates. Keep messages short, useful, and free of secrets, tokens, or private logs. A request to install or pair the tool alone does not authorize sending messages.

## Check setup

Run `botpager --version` and `botpager devices --json`. If missing, offer one installation method:

- macOS/Linux, standalone (no Node): `curl -fsSL https://botpager.reostack.com/cli/install.sh | bash`
- Windows PowerShell, standalone: `irm https://botpager.reostack.com/cli/install.ps1 | iex`
- Node.js 20+: `npm install -g @reostack/botpager`

For a new pairing, run `botpager pair --name "My computer"` and keep the process open. The user opens Computers → + in the mobile app, scans or enters the code, and confirms. Wait for successful completion before sending. An already-paired error means use the existing pairing; do not unlink or rotate identity to bypass it.

## Send an update

```sh
botpager send --title "Build complete" --kind success --project api "All checks passed"
botpager send --title "Decision needed" --kind warning "Choose the deployment region to continue."
botpager send --title "Task complete" --kind success
```

Supported kinds: `success`, `error`, `info`, `warning`, `other`. Use `--priority high` only for an urgent update requested by the user; default is normal.

For a specific phone, pass `-d "<exact device ID or name>"`. Check `botpager devices --json` rather than guessing. References match exactly, not fuzzily. Unqualified sends use the configured default (or `BOTPAGER_DEVICE`).

A title-only send does not read stdin. For piped content with a title, explicitly use `-`:
```sh
printf '%s' 'Deployment failed: build checks did not pass.' | botpager send --title "Deployment failed" --kind error -
botpager send -- --option-like-message
```

Use properly quoted arguments or a subprocess argument array for generated content. Do not interpolate untrusted text into shell code. Summarize logs instead of forwarding them wholesale.

## Results and recovery

Use `--json` on send for structured results. Check the exit status and response before reporting success. Server acceptance does not prove the phone displayed a push notification.

On failure, report the error. Do not retry repeatedly or silently change the destination. Use `botpager status --json` for diagnostics. Invalid/revoked pairings require the user's pairing flow.

Configuration defaults to `~/.botpager/config.json`; `BOTPAGER_CONFIG` selects a separate profile. Production API is `https://botpager-api.reostack.com`. Do not change `BOTPAGER_API_URL` on an existing paired profile: credentials belong to their issuing server. Never print config contents or bearer tokens.

Other commands, only when requested:
- `botpager default <ref>`: change default phone.
- `botpager rename <old> <new>`: rename a pairing.
- `botpager unlink <ref>`: revoke a pairing.
- `botpager --help`: inspect the installed version's supported options.
