# CLI releases

Package: `@reostack/pagerbot` · repository: `tolulawson/pagerbot-cli` · tags: `vX.Y.Z`.
The production API remains `https://pagerbot.reostack.com`.

## First publication

The package has not yet been bootstrapped on npm. Do not dispatch the release workflow until the trusted publisher below is configured.

1. Run checks and inspect the tarball from the reviewed `main` commit:

   ```sh
   bun install --frozen-lockfile
   bun run check
   mkdir -p artifacts
   npm pack . --pack-destination artifacts
   bash scripts/smoke-cli-package.sh "$PWD/artifacts/reostack-pagerbot-0.1.0.tgz"
   npm publish artifacts/reostack-pagerbot-0.1.0.tgz --access public
   ```

   Complete npm's interactive authentication/2FA. Do not store an OTP or a long-lived publishing token in GitHub.

2. In the package's npm settings, configure trusted publishing with these exact values:

   | Field | Value |
   | --- | --- |
   | GitHub owner | `tolulawson` |
   | Repository | `pagerbot-cli` |
   | Workflow filename | `cli-release.yml` |
   | Environment | `npm-production` |
   | Allowed action | Direct `npm publish` |

3. Run the release workflow for `0.1.0` from the same commit to finish the GitHub release. It verifies identical registry bytes before resuming. If the source or build dependencies changed after bootstrap, do not overwrite the version or tag; prepare a new version.

## Subsequent releases

1. Bump `package.json` and refresh `bun.lock` in a PR; merge after both CLI checks pass.
2. Dispatch from `main`:

   ```sh
   gh workflow run cli-release.yml --repo tolulawson/pagerbot-cli --ref main -f version=0.1.0
   ```

3. Approve the `npm-production` environment deployment. It permits only `main` and requires the repository owner's approval. GitHub approval is not a fresh MFA challenge for each run.
4. The workflow validates the version/ref, runs tests, checks API health, packs and installs the artifact on Node 20, publishes with npm OIDC on Node 24, verifies registry integrity, then creates `vX.Y.Z` and a GitHub release with the tarball and SHA256 checksums. Tags are never moved; a rerun accepts only an identical published artifact.

No npm token secret is needed after trusted publishing is configured. Public-repository trusted publishing also provides npm provenance. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [provenance requirements](https://docs.npmjs.com/generating-provenance-statements/).

## Hosted installer

`install.sh` is the canonical installer. The private API repository serves a reviewed copy at `/cli/install.sh`; its `workers/api/assets/cli/source.json` records this repository's commit and the installer's SHA256. When changing the installer, update that copy and provenance metadata in a separate API PR. Deploying the API neither publishes the CLI nor implicitly downloads a moving branch.
