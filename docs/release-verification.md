# Release failure model (defined before implementation)

All release tests operate on installed artifacts / subprocesses, not imported CLI functions.

- Wrong OS/architecture/libc: test every advertised executable on its matching runner/container; reject unsupported targets.
- Runtime accidentally required: install and execute binaries with Node/Bun absent from PATH.
- Truncated downloads, bad checksums, absent assets: installation must fail and preserve an existing executable.
- Paths containing spaces and repeated installs: both must succeed without sudo or shell-profile changes.
- Version mismatch: installed --version must equal release manifest and package version.
- API mismatch: pair a real CLI, claim through the phone API with no push registration, send exact payloads, retrieve them, test server duplicate handling, delete and unlink.
- Stale KV reads: bounded polling for propagation; never accept a missing assertion as a pass.
- Pipe hangs / corrupted Unicode / option-like text: invoke the installed artifact with real stdin and deadlines.
- Test interruption: finally revoke the isolated pairing; reports exclude tokens, pairing codes and response payloads. Deleted records expire according to server retention; no physical push is claimed.
- Partial release: stage immutable assets first; refuse a different artifact at an existing version; npm and GitHub retries resume only identical bytes.
- Installer points at incomplete release: installers only resolve published non-prerelease releases, then use that fixed tag for every asset.
- Production unavailable: release must stop before publication. PR tests exercise installers and packaged runtime on the OS matrix. The live API E2E runs only in the approved release workflow and can also be invoked explicitly against a local or deployed Worker.

Artifacts: JSON E2E and installer reports, package/binary archives, SHA256SUMS, and release source manifest. CI uploads reports even on failure.

## Review regression scenarios (before fixes)

1. Draft B differs from rebuilt A. Only a release-only preparation job with write access may discover/download B; read-only platform jobs must select B from its workflow artifact before tests. Publication must verify each platform's recorded SHA256 against the final archives.
2. Missing prepared manifest, wrong source revision, altered prepared bytes, missing platform report, or replacement after platform testing must stop publication. A first release with no draft may use fresh builds. A partial draft may supply a subset, but every selected archive still runs its platform tests.
3. A duplicate response that says `duplicate` but changes title, body, kind, project, device ID, computer name, or receivedAt must fail the live E2E gate. A correct duplicate preserving these fields must pass.

Regression verification runs complete scripts as subprocesses with a permission-aware GitHub fixture and an HTTP backend fixture. It does not establish real GitHub authorization; workflow permissions and data flow are also checked explicitly. Reports are retained as CI artifacts.

Run the review regression scenarios with an installed CLI:

```sh
node scripts/test-release-gates.mjs /absolute/path/to/botpager
```

The repeatable result is `artifacts/release-gate-regressions.json`, also uploaded by both Node CI jobs. Its GitHub permissions and HTTP responses are fixtures; platform CI and the production API E2E remain separate gates.
