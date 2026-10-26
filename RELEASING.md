# Releasing

This document explains the release process, local packaging, and how automated Chrome Web Store publishing is configured.

## Release Types

### 1. Development Builds (`dev`)

Every push or merge to the `main` branch builds the latest extension and updates the rolling [`dev` release tag](https://github.com/lubusIN/frappe-vault-browser-extension/releases/tag/dev) with fresh zip packages (`vault-browser-extension-dev-chrome.zip`, `vault-browser-extension-dev-firefox.zip`, `vault-browser-extension-dev-sources.zip`) and SHA256 checksums.

### 2. Tagged Releases (`v*`)

Official releases are triggered by pushing a version tag (e.g. `v1.0.0`). The workflow:

- Runs ESLint, TypeScript typecheck (`vue-tsc`), and Vitest tests
- Builds production bundles for Chrome (MV3) and Firefox (MV2)
- Generates zip archives and checksums (`SHA256SUMS.txt`)
- Creates a GitHub Release with auto-generated release notes
- Submits the Chrome package to the Chrome Web Store (if secrets are configured)

## How to Cut a Release

1. **Bump version** in `package.json`:

   ```bash
   npm version minor # or patch / major
   ```

2. **Push the commit and tag**:
   ```bash
   git push origin main --tags
   ```

The [Release workflow](.github/workflows/release.yml) will handle building the extension, publishing GitHub Release assets, and submitting to the Chrome Web Store.

## Chrome Web Store Publishing Setup

To enable automated submissions on tagged releases:

1. **Initial Upload**: Upload a built Chrome package (`.output/*-chrome.zip`) manually once via the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/) to establish the extension listing and get an Extension ID.
2. **API Credentials (API v2 - Recommended)**: Run `npx wxt submit init` locally, select **v2 (recommended)**, and provide your Google Cloud Service Account credentials (`.json` key). This creates a local `.env.submit` file.
3. **GitHub Secrets**: Add the generated credentials as repository secrets (**Settings > Secrets and variables > Actions**):
   - `CHROME_EXTENSION_ID`
   - `CHROME_PUBLISHER_ID`
   - `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`
   - `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY`

_(Legacy API v1 with `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, and `CHROME_REFRESH_TOKEN` is also supported)._

When these secrets are set, any `v*` tag push automatically submits the build to the Chrome Web Store.

## Local Packaging

To build and test distribution packages locally:

```bash
# Package Chrome zip (.output/*-chrome.zip)
npm run zip

# Package Firefox zip (.output/*-firefox.zip)
npm run zip:firefox
```

## Pull Request Previews

Every pull request runs CI checks (linting, type-checking, and tests) and builds preview packages. The CI bot comments on the PR with links to download the QA artifacts.
