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
