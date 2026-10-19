# Frappe Vault Browser Extension

A modern browser extension for [Frappe Vault](https://github.com/lubusIN/frappe-vault) built with [WXT](https://wxt.dev/), **Vue 3**, and **frappe-ui**. Securely access, autofill, generate, and manage passwords and secrets directly from your browser.

---

## ✨ Features

- 🔐 **Connect to Any Hosted Frappe Vault Instance**:
  - Support for **User Login** (Username/Email + Password via session cookie).
  - Support for **API Token** authentication (API Key + API Secret) for long-lived, reliable connections and accounts with 2FA/SSO.
  - Automatic session health check and reconnection.
- 🎯 **Active Tab Domain Matching**:
  - Automatically matches secrets for the website currently open in your active tab.
  - 1-click **Autofill** into login and password fields on the page.
  - 1-click **Quick Copy** for username and password.
  - 1-click "Add secret for this site" with URL and Title pre-filled.
- 📋 **Complete Secrets Management**:
  - Browse secrets with type categorization (Password, API Key, Secure Note, Credit Card, Database, SSH Key).
  - Real-time search by title, username, email, or URL.
  - Star / Bookmark favorite secrets for fast access.
  - On-demand decryption with sensitive field masking and reveal toggles.
- ⏱️ **Live TOTP (2FA) Authenticator**:
  - Displays dynamic 6-digit TOTP codes with a live countdown timer and 1-click copy.
- 🎲 **Built-in Strong Password Generator**:
  - Configurable length (8–40 characters), uppercase, lowercase, numbers, and symbols.
  - Real-time strength estimation and cryptographically secure generation.
- 🎨 **Modern Frappe UI & Tailwind Design**:
  - Native Frappe styling, refined typography, and responsive micro-interactions.

---

## 🛠️ Tech Stack

- **Framework**: [WXT](https://wxt.dev/) (Next-gen WebExtension framework)
- **UI Library**: [frappe-ui](https://github.com/frappe/frappe-ui) & Vue 3
- **Icons**: [@lucide/vue](https://lucide.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with Frappe UI preset
- **Language**: TypeScript

---

## 🚀 Getting Started

### Prerequisites

- Node.js `v20+` (tested with v25)
- npm `v10+`

### Installation

```bash
# Clone the repository
git clone https://github.com/lubusIN/vault-browser-extention.git
cd vault-browser-extention

# Install dependencies
npm install
```

### Development

Run the extension in development mode with hot module reloading (HMR):

```bash
# Chrome (Manifest V3)
npm run dev

# Firefox (Manifest V2)
npm run dev:firefox
```

### Production Build

```bash
# Build for Chrome (MV3)
npm run build

# Build for Firefox (MV2)
npm run build:firefox

# Create distribution zip files
npm run zip
npm run zip:firefox
```

---

## 📦 Loading the Extension in Your Browser

### Chrome / Brave / Edge (Chromium)

1. Open `chrome://extensions` in your browser.
2. Enable **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3` folder inside this repository.

### Firefox

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on...**.
3. Select the `manifest.json` file inside the `.output/firefox-mv2` folder.

---

## 🔗 Connecting to Frappe Vault

1. Click the Frappe Vault extension icon in your browser toolbar.
2. Enter your **Instance URL** (e.g. `https://vault.yourdomain.com` or `http://localhost:8000`).
3. Choose your preferred authentication method:
   - **User Login**: Enter your Frappe username or email and password.
   - **API Token**: Enter an API Key and API Secret (generated in Frappe under **User Profile > API Access > Generate Keys**).
4. Click **Connect to Vault**.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
