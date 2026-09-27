# CLI releases

Package: `@reostack/botpager` · repository: `tolulawson/botpager-cli` · tags: `vX.Y.Z`.
Standalone binaries and npm are published together by `cli-release.yml`. Seven platform archives are exercised by `binaries.yml`; installers require no Node or Bun. The production API remains `https://botpager-api.reostack.com`.

## First publication

The package has not yet been bootstrapped on npm. Do not dispatch the release workflow until the trusted publisher below is configured.

1. Run checks and inspect the tarball from the reviewed `main` commit:

   ```sh
   bun install --frozen-lockfile
   bun run check
   mkdir -p artifacts
   npm pack . --pack-destination artifacts
   bash scripts/smoke-cli-package.sh "$PWD/artifacts/reostack-botpager-0.1.0.tgz"
   npm publish artifacts/reostack-botpager-0.1.0.tgz --access public
   ```

   Complete npm's interactive authentication/2FA. Do not store an OTP or a long-lived publishing token in GitHub.

2. In the package's npm settings, configure trusted publishing with these exact values:

   | Field | Value |
   | --- | --- |
   | GitHub owner | `tolulawson` |
   | Repository | `botpager-cli` |
   | Workflow filename | `cli-release.yml` |
   | Environment | `npm-production` |
   | Allowed action | Direct `npm publish` |

3. Run the release workflow for `0.1.0` from the same commit to finish the GitHub release. It verifies identical registry bytes before resuming. If the source or build dependencies changed after bootstrap, do not overwrite the version or tag; prepare a new version.

## Subsequent releases

1. Bump `package.json` and refresh `bun.lock` in a PR; merge after both CLI checks pass.
2. Dispatch from `main`:

   ```sh
   gh workflow run cli-release.yml --repo tolulawson/botpager-cli --ref main -f version=0.1.0
   ```

3. Approve the `npm-production` environment deployment. It permits only `main` and requires the repository owner's approval. GitHub approval is not a fresh MFA challenge for each run.
4. The workflow validates the version/ref, runs tests, checks API health, packs and installs the artifact on Node 20, publishes with npm OIDC on Node 24, verifies registry integrity, then creates `vX.Y.Z` and a GitHub release with the tarball and SHA256 checksums. Tags are never moved; a rerun accepts only an identical published artifact.

No npm token secret is needed after trusted publishing is configured. Public-repository trusted publishing also provides npm provenance. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [provenance requirements](https://docs.npmjs.com/generating-provenance-statements/).

## Hosted installer

`install.sh` is the canonical installer. The private API repository serves a reviewed copy at `/cli/install.sh`; its `workers/api/assets/cli/source.json` records this repository's commit and the installer's SHA256. When changing the installer, update that copy and provenance metadata in a separate API PR. Deploying the API neither publishes the CLI nor implicitly downloads a moving branch.

## Release gates and assets

The approved release job runs `scripts/e2e-api.mjs` against production for both the installed npm package and the Linux executable. It pairs an ephemeral device without push registration, sends and reads messages, verifies server duplicate handling, deletes messages, and revokes the pairing. This is not proof of push delivery to a physical phone.

GitHub Actions retains redacted JSON reports even on failure. Platform jobs exercise installation without Node/Bun, repeated installation, paths containing spaces, checksum rejection and preservation of an existing install. musl binaries run in Alpine; other binaries run on matching OS/architecture runners.

The job creates a draft GitHub Release with archives, `SHA256SUMS`, and `release.json` (source revision). It publishes npm only after all gates pass, then publishes the draft. No release asset is overwritten. Retries restore staged archives before testing; a different source revision at the same version is rejected. npm and GitHub are separate services, so a partial publication remains possible and must be resumed at the same commit/version.

To repeat the live check without publishing:

```sh
node scripts/e2e-api.mjs /absolute/path/to/botpager https://botpager-api.reostack.com artifacts/e2e.json
```

For localhost Worker verification, substitute its origin. No customer credentials or push tokens are used. Run only against an authorized backend; the check creates and revokes test pairings. Server tombstones follow its retention policy.

The API repository must deploy the reviewed `install.sh` and `install.ps1` copies before app users see the new installer behavior. Binary artifacts remain hosted at `https://github.com/tolulawson/botpager-cli/releases/download/vVERSION/`. The installer pins all downloads to one resolved stable release.
