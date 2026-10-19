# Frappe Vault Browser Extension

Browser extension for [Frappe Vault](https://github.com/lubusIN/frappe-vault) built with [WXT](https://wxt.dev/), Vue 3, and [frappe-ui](https://github.com/frappe/frappe-ui). Connects to a self-hosted or cloud Frappe Vault instance to search, view, autofill, and manage credentials directly from the browser.

## Features

- **Instance Connection**: Authenticate using standard Frappe credentials (username/password session) or API tokens (`api_key` & `api_secret`).
- **Domain Matching**: Detects the active tab's domain to surface relevant credentials instantly.
- **Autofill & Quick Copy**: Fill login forms with one click or copy usernames, passwords, and tokens to clipboard.
- **Secret Management**: Search, filter by secret type, toggle bookmarks, and create new secrets with prefilled site details.
- **TOTP Authenticator**: Displays live 2FA codes with countdown timer.
- **Password Generator**: Configurable, client-side cryptographic password generator.

## Prerequisites

- Node.js 20+
- npm 10+
- A running Frappe instance with the [frappe_vault](https://github.com/lubusIN/frappe-vault) app installed

## Setup

```bash
git clone https://github.com/lubusIN/vault-browser-extention.git
cd vault-browser-extention
npm install
```

## Development

```bash
# Chrome (Manifest V3)
npm run dev

# Firefox (Manifest V2)
npm run dev:firefox
```

## Build

```bash
# Production build (outputs to .output/chrome-mv3)
npm run build

# Firefox build (outputs to .output/firefox-mv2)
npm run build:firefox

# Typecheck
npm run compile
```

## Loading the Extension

### Chrome / Chromium

1. Go to `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `.output/chrome-mv3` directory.

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `manifest.json` inside `.output/firefox-mv2`.

## Authentication

When opening the extension popup, enter your Frappe Vault URL (e.g., `https://vault.example.com` or `http://localhost:8000`).

- **User Login**: Standard Frappe user account with `Vault User` or `Vault Admin` role.
- **API Token**: Use an API Key and API Secret generated in Frappe under **User > API Access**.

## License

MIT
