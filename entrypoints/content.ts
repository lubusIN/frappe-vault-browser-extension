import { getStoredSettings } from '../utils/storage';

export default defineContentScript({
  matches: ['*://*/*'],
  main() {
    console.log('[Frappe Vault] Content script initialized with theme-aware in-field autofill');

    // Root container & Shadow DOM state
    let shadowHost: HTMLElement | null = null;
    let shadowRoot: ShadowRoot | null = null;
    let activeInput: HTMLInputElement | null = null;
    let matchingSecretsCache: any[] | null = null;
    let isFetchingSecrets = false;
    let isDropdownVisible = false;
    let inFieldIcon: HTMLButtonElement | null = null;
    let currentTheme: 'system' | 'light' | 'dark' = 'system';

    // Listen for manual autofill messages from popup
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'AUTOFILL_CREDENTIALS') {
        const { username, password } = message.payload || {};
        const success = performAutofill(username, password, activeInput);
        sendResponse({ success });
        return true;
      }
    });

    /**
     * Track and sync extension theme setting (system / light / dark)
     */
    async function initThemeTracking() {
      try {
        const s = await getStoredSettings();
        if (s.theme) {
          currentTheme = s.theme;
          applyThemeToOverlay();
        }
      } catch {}

      browser.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.frappe_vault_settings) {
          const newSettings = changes.frappe_vault_settings.newValue as any;
          if (newSettings?.theme) {
            currentTheme = newSettings.theme;
            applyThemeToOverlay();
          }
        }
      });

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentTheme === 'system') {
          applyThemeToOverlay();
        }
      });
    }

    function getResolvedTheme(): 'dark' | 'light' {
      if (currentTheme === 'dark') return 'dark';
      if (currentTheme === 'light') return 'light';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }

    function applyThemeToOverlay() {
      if (!shadowRoot) return;
      const resolved = getResolvedTheme();
      const dropdown = shadowRoot.querySelector<HTMLElement>('.vault-dropdown');
      if (dropdown) {
        dropdown.setAttribute('data-theme', resolved);
      }
    }

    /**
     * Isolated Shadow DOM styles with dynamic themes & guaranteed contrast
     */
    const OVERLAY_STYLES = `
      :host {
        all: initial;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        -webkit-font-smoothing: antialiased;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      /* In-Field Trigger Icon Button */
      .vault-input-trigger {
        position: fixed;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        background: transparent;
        border: none;
        cursor: pointer;
        pointer-events: auto;
        opacity: 0.85;
        z-index: 2147483646;
        transition: opacity 0.12s ease, transform 0.12s ease, background-color 0.12s ease;
        user-select: none;
        padding: 0;
      }

      .vault-input-trigger:hover {
        opacity: 1;
        background-color: rgba(137, 77, 248, 0.12);
        transform: scale(1.08);
      }

      .vault-input-trigger:active,
      .vault-input-trigger.active {
        opacity: 1;
        background-color: rgba(137, 77, 248, 0.2);
        transform: scale(1.02);
      }

      .vault-input-trigger.success {
        opacity: 1;
        background-color: rgba(22, 163, 74, 0.16);
      }

      .vault-trigger-shield {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        pointer-events: none;
        flex-shrink: 0;
      }

      .vault-trigger-check {
        width: 14px;
        height: 14px;
        color: #16a34a;
        pointer-events: none;
      }

      /* Dropdown Card Theme Palette */
      .vault-dropdown {
        --v-bg: #ffffff;
        --v-text: #09090b;
        --v-text-muted: #71717a;
        --v-border: #e4e4e7;
        --v-hover-bg: #f4f4f5;
        --v-hover-border: #e4e4e7;
        --v-active-bg: #e4e4e7;
        --v-icon-bg: #f4f4f5;
        --v-icon-text: #71717a;
        --v-icon-border: #e4e4e7;
        --v-icon-hover-bg: #ede9fe;
        --v-icon-hover-text: #7c3aed;
        --v-icon-hover-border: #ddd6fe;
        --v-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.14), 0 4px 10px -2px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05);

        color-scheme: light;
        position: fixed;
        width: 300px;
        background-color: var(--v-bg);
        color: var(--v-text);
        border: 1px solid var(--v-border);
        border-radius: 12px;
        box-shadow: var(--v-shadow);
        padding: 4px;
        overflow: hidden;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(-4px) scale(0.98);
        transition: opacity 0.12s cubic-bezier(0.16, 1, 0.3, 1), transform 0.12s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 2147483647;
      }

      /* Dark Theme */
      .vault-dropdown[data-theme="dark"] {
        --v-bg: #18181b;
        --v-text: #f4f4f5;
        --v-text-muted: #a1a1aa;
        --v-border: #27272a;
        --v-hover-bg: #27272a;
        --v-hover-border: #3f3f46;
        --v-active-bg: #3f3f46;
        --v-icon-bg: #27272a;
        --v-icon-text: #a1a1aa;
        --v-icon-border: #3f3f46;
        --v-icon-hover-bg: #2e1065;
        --v-icon-hover-text: #c4b5fd;
        --v-icon-hover-border: #4c1d95;
        --v-shadow: 0 12px 36px -4px rgba(0, 0, 0, 0.65), 0 4px 12px -2px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08);
        color-scheme: dark;
      }

      .vault-dropdown.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      /* Header */
      .vault-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        margin-bottom: 2px;
        border-bottom: 1px solid var(--v-border);
      }

      .vault-brand {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: -0.01em;
        color: var(--v-text);
      }

      .vault-badge {
        font-size: 9.5px;
        font-weight: 600;
        padding: 1px 6px;
        border-radius: 9999px;
        background: rgba(137, 77, 248, 0.12);
        color: #894df8;
      }

      .vault-dropdown[data-theme="dark"] .vault-badge {
        background: rgba(137, 77, 248, 0.22);
        color: #a78bfa;
      }

      .vault-close {
        background: transparent;
        border: none;
        cursor: pointer;
        width: 20px;
        height: 20px;
        border-radius: 5px;
        font-size: 12px;
        color: var(--v-text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.1s, color 0.1s;
      }

      .vault-close:hover {
        background: var(--v-hover-bg);
        color: var(--v-text);
      }

      /* Scrollable list */
      .vault-list {
        max-height: 230px;
        overflow-y: auto;
        padding: 1px 0;
      }

      .vault-list::-webkit-scrollbar {
        width: 4px;
      }
      .vault-list::-webkit-scrollbar-thumb {
        background: rgba(150, 150, 150, 0.4);
        border-radius: 9999px;
      }

      /* Item row */
      .vault-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 7px 8px;
        margin: 1px 0;
        border-radius: 8px;
        border: 1px solid transparent;
        cursor: pointer;
        user-select: none;
        transition: background-color 0.12s ease, border-color 0.12s ease;
      }

      .vault-item:hover {
        background-color: var(--v-hover-bg);
        border-color: var(--v-hover-border);
      }

      .vault-item:active {
        background-color: var(--v-active-bg);
        transform: scale(0.995);
      }

      .vault-item-left {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
      }

      .vault-item-icon {
        width: 28px;
        height: 28px;
        border-radius: 7px;
        background: var(--v-icon-bg);
        color: var(--v-icon-text);
        border: 1px solid var(--v-icon-border);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.12s ease;
      }

      .vault-item:hover .vault-item-icon {
        background: var(--v-icon-hover-bg);
        color: var(--v-icon-hover-text);
        border-color: var(--v-icon-hover-border);
      }

      .vault-item-details {
        min-width: 0;
        flex: 1;
      }

      .vault-item-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--v-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .vault-item-sub {
        font-size: 11px;
        color: var(--v-text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-top: 1px;
      }

      .vault-fill-tag {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 10px;
        font-weight: 600;
        padding: 2.5px 7px;
        border-radius: 5px;
        background: #894df8;
        color: #ffffff;
        opacity: 0;
        transform: translateX(4px);
        transition: opacity 0.12s ease, transform 0.12s ease, background-color 0.15s;
        flex-shrink: 0;
        margin-left: 6px;
      }

      .vault-item:hover .vault-fill-tag {
        opacity: 1;
        transform: translateX(0);
      }

      .vault-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 5px 8px 3px 8px;
        margin-top: 2px;
        border-top: 1px solid var(--v-border);
        font-size: 10px;
        color: var(--v-text-muted);
      }

      .vault-key-badge {
        font-size: 9px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        padding: 1px 4px;
        border-radius: 3px;
        background: var(--v-hover-bg);
        border: 1px solid var(--v-border);
        color: var(--v-text-muted);
      }
    `;

    /**
     * Initialize Shadow DOM host container
     */
    function ensureShadowRoot(): ShadowRoot {
      if (shadowRoot && shadowHost && document.body.contains(shadowHost)) {
        return shadowRoot;
      }

      shadowHost = document.createElement('div');
      shadowHost.id = 'frappe-vault-autofill-root';
      shadowHost.style.position = 'absolute';
      shadowHost.style.top = '0';
      shadowHost.style.left = '0';
      shadowHost.style.width = '0';
      shadowHost.style.height = '0';
      shadowHost.style.overflow = 'visible';
      shadowHost.style.zIndex = '2147483647';
      shadowHost.style.pointerEvents = 'none';

      shadowRoot = shadowHost.attachShadow({ mode: 'open' });

      const styleEl = document.createElement('style');
      styleEl.textContent = OVERLAY_STYLES;
      shadowRoot.appendChild(styleEl);

      document.body.appendChild(shadowHost);

      return shadowRoot;
    }

    const VAULT_SHIELD_SVG = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none" class="vault-trigger-shield">
        <rect width="96" height="96" fill="#894df8" rx="20"/>
        <path fill="#fdfdfd" d="m75.781 24.906-26.617-9.984a3.5 3.5 0 0 0-2.332 0l-26.617 9.984c-1.332.5-2.164 1.762-2.164 3.16 0 1.532.101 3.063.234 4.594l6.488-2.363L48 21.578l23.223 8.719A58.45 58.45 0 0 1 48 73.82c-11.879-8.953-19.832-22.062-22.395-36.57l-6.355 2.332c3.227 16.504 12.777 31.344 26.852 41.059a3.29 3.29 0 0 0 3.793 0c17.27-11.946 27.75-31.61 28.05-52.606 0-1.398-.832-2.664-2.164-3.164z"/>
      </svg>
    `;

    const CHECK_SVG = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="vault-trigger-check">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;

    /**
     * Check if an element is an eligible login/password input
     */
    function isEligibleInput(el: HTMLElement | null): el is HTMLInputElement {
      if (!el || el.tagName !== 'INPUT') return false;
      const input = el as HTMLInputElement;

      if (input.disabled || input.readOnly) return false;
      if (input.offsetParent === null && input.offsetWidth === 0 && input.offsetHeight === 0) return false;

      const type = (input.type || 'text').toLowerCase();
      const nonEligibleTypes = [
        'hidden', 'submit', 'button', 'reset', 'checkbox',
        'radio', 'file', 'image', 'color', 'range', 'date', 'number'
      ];
      if (nonEligibleTypes.includes(type)) return false;

      if (input.closest('#frappe-vault-autofill-root')) return false;

      const autocomplete = (input.autocomplete || '').toLowerCase();
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();

      // Password inputs
      if (type === 'password') return true;

      // Autocomplete username/email
      if (['username', 'email', 'current-password', 'new-password'].includes(autocomplete)) return true;

      // Common login field names
      if (name.includes('user') || name.includes('login') || name.includes('email') || name.includes('auth') || name.includes('pass')) return true;
      if (id.includes('user') || id.includes('login') || id.includes('email') || id.includes('auth') || id.includes('pass')) return true;
      if (placeholder.includes('email') || placeholder.includes('username') || placeholder.includes('user') || placeholder.includes('login')) return true;

      // Form heuristic
      const form = input.form || input.closest('form');
      if (form && form.querySelector('input[type="password"]')) {
        return true;
      }

      return false;
    }

    /**
     * Fetch matching secrets for current page URL & domain
     */
    async function fetchMatchingSecrets(): Promise<any[]> {
      if (matchingSecretsCache) {
        return matchingSecretsCache;
      }
      if (isFetchingSecrets) return [];

      isFetchingSecrets = true;
      try {
        const res = await browser.runtime.sendMessage({
          type: 'VAULT_GET_MATCHING_SECRETS',
          payload: {
            url: window.location.href,
            domain: window.location.hostname,
          },
        });
        const secrets = res?.secrets || [];
        matchingSecretsCache = secrets;
        return secrets;
      } catch (err) {
        console.warn('[Frappe Vault] Could not query matching secrets:', err);
        return [];
      } finally {
        isFetchingSecrets = false;
      }
    }

    /**
     * Position the in-field trigger icon right inside the input field
     */
    function updateIconPosition(icon: HTMLElement, input: HTMLInputElement) {
      const rect = input.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight) {
        icon.style.display = 'none';
        return;
      }

      icon.style.display = 'flex';
      const iconSize = 22;
      const top = rect.top + (rect.height - iconSize) / 2;
      const left = rect.right - iconSize - 5;

      icon.style.top = `${Math.round(top)}px`;
      icon.style.left = `${Math.round(left)}px`;
    }

    /**
     * Show or move the in-field trigger icon to the given input
     */
    function showInFieldIcon(input: HTMLInputElement) {
      const root = ensureShadowRoot();
      activeInput = input;

      if (!inFieldIcon) {
        inFieldIcon = document.createElement('button');
        inFieldIcon.type = 'button';
        inFieldIcon.className = 'vault-input-trigger';
        inFieldIcon.title = 'Frappe Vault (Click to autofill)';
        inFieldIcon.setAttribute('aria-label', 'Frappe Vault Autofill');

        inFieldIcon.innerHTML = VAULT_SHIELD_SVG;

        inFieldIcon.addEventListener('mousedown', (e) => {
          e.preventDefault(); // Don't blur the input field
        });

        inFieldIcon.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (isDropdownVisible) {
            hideAutofillDropdown();
            return;
          }

          const secrets = await fetchMatchingSecrets();
          if (activeInput && secrets && secrets.length > 0) {
            showAutofillDropdown(activeInput, secrets);
          }
        });

        root.appendChild(inFieldIcon);
      }

      updateIconPosition(inFieldIcon, input);
    }

    /**
     * Position dropdown aligned to the right edge of input/icon
     */
    function updateDropdownPosition(dropdown: HTMLElement, input: HTMLInputElement) {
      const rect = input.getBoundingClientRect();
      const dropdownWidth = 300;
      const dropdownHeight = dropdown.offsetHeight || 160;

      // Align right edge of dropdown with right edge of input
      let left = rect.right - dropdownWidth;
      if (left < 10) left = 10;
      if (left + dropdownWidth > window.innerWidth - 10) {
        left = window.innerWidth - dropdownWidth - 10;
      }

      let top: number;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow >= dropdownHeight + 10 || spaceBelow > rect.top) {
        top = rect.bottom + 6;
      } else {
        top = Math.max(10, rect.top - dropdownHeight - 6);
      }

      dropdown.style.top = `${Math.round(top)}px`;
      dropdown.style.left = `${Math.round(left)}px`;
    }

    /**
     * Render the in-page autofill dropdown (with guaranteed contrast & theme sync)
     */
    function showAutofillDropdown(input: HTMLInputElement, secrets: any[]) {
      const root = ensureShadowRoot();
      activeInput = input;

      const existing = root.querySelector('.vault-dropdown');
      if (existing) existing.remove();

      if (inFieldIcon) {
        inFieldIcon.classList.add('active');
      }

      const dropdown = document.createElement('div');
      dropdown.className = 'vault-dropdown';
      dropdown.setAttribute('data-theme', getResolvedTheme());

      const keyIconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="7.5" cy="15.5" r="5.5"/>
          <path d="m21 2-9.6 9.6"/>
          <path d="m15.5 7.5 3 3L22 7l-3-3"/>
        </svg>
      `;

      let itemsHtml = '';
      secrets.forEach((s) => {
        const usernameDisplay = s.username || s.email || 'No username';
        itemsHtml += `
          <div
            class="vault-item"
            data-secret-name="${s.name}"
            role="button"
            tabindex="0"
          >
            <div class="vault-item-left">
              <div class="vault-item-icon">
                ${keyIconSvg}
              </div>
              <div class="vault-item-details">
                <div class="vault-item-title">${escapeHtml(s.title || 'Untitled')}</div>
                <div class="vault-item-sub">${escapeHtml(usernameDisplay)}</div>
              </div>
            </div>
            <div class="vault-fill-tag">
              <span>Fill</span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 10 4 15 9 20"></polyline>
                <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
              </svg>
            </div>
          </div>
        `;
      });

      dropdown.innerHTML = `
        <div class="vault-header">
          <div class="vault-brand">
            ${VAULT_SHIELD_SVG}
            <span>Frappe Vault</span>
            <span class="vault-badge">${secrets.length} found</span>
          </div>
          <button
            type="button"
            class="vault-close"
            title="Dismiss"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
        <div class="vault-list">
          ${itemsHtml}
        </div>
        <div class="vault-footer">
          <span>Click item to autofill</span>
          <span class="vault-key-badge">esc</span>
        </div>
      `;

      root.appendChild(dropdown);
      updateDropdownPosition(dropdown, input);

      requestAnimationFrame(() => {
        dropdown.classList.add('visible');
        isDropdownVisible = true;
      });

      const closeBtn = dropdown.querySelector('.vault-close');
      closeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        hideAutofillDropdown();
      });

      const itemRows = dropdown.querySelectorAll<HTMLElement>('.vault-item');
      itemRows.forEach((row) => {
        row.addEventListener('click', async (e) => {
          e.stopPropagation();
          const secretName = row.dataset.secretName;
          if (!secretName) return;

          const fillTag = row.querySelector<HTMLElement>('.vault-fill-tag');
          if (fillTag) {
            fillTag.innerHTML = `<span>Filling...</span>`;
            fillTag.style.opacity = '1';
          }

          try {
            const res = await browser.runtime.sendMessage({
              type: 'VAULT_DECRYPT_SECRET',
              payload: { secretName },
            });

            if (res && res.success && res.password) {
              performAutofill(res.username, res.password, activeInput);
              if (fillTag) {
                fillTag.innerHTML = `<span>Filled!</span>`;
                fillTag.style.background = '#16a34a';
              }

              // Flash checkmark on in-field icon
              if (inFieldIcon) {
                inFieldIcon.innerHTML = CHECK_SVG;
                inFieldIcon.classList.add('success');
                setTimeout(() => {
                  if (inFieldIcon) {
                    inFieldIcon.innerHTML = VAULT_SHIELD_SVG;
                    inFieldIcon.classList.remove('success');
                  }
                }, 1400);
              }

              setTimeout(() => {
                hideAutofillDropdown();
              }, 220);
            } else {
              if (fillTag) {
                fillTag.innerHTML = `<span>Failed</span>`;
                fillTag.style.background = '#dc2626';
              }
            }
          } catch (err) {
            console.error('[Frappe Vault] Autofill click error:', err);
            hideAutofillDropdown();
          }
        });
      });
    }

    /**
     * Hide and remove autofill dropdown
     */
    function hideAutofillDropdown() {
      if (inFieldIcon) {
        inFieldIcon.classList.remove('active');
      }
      if (!shadowRoot) return;
      const dropdown = shadowRoot.querySelector<HTMLElement>('.vault-dropdown');
      if (dropdown) {
        dropdown.classList.remove('visible');
        setTimeout(() => {
          dropdown.remove();
          isDropdownVisible = false;
        }, 120);
      }
    }

    /**
     * Populate credentials into input fields and fire change events
     */
    function performAutofill(username?: string, password?: string, targetInput?: HTMLInputElement | null): boolean {
      try {
        let filledAny = false;

        // 1. Password input
        let passwordInput: HTMLInputElement | null = null;
        if (targetInput && targetInput.type === 'password') {
          passwordInput = targetInput;
        } else {
          const passwordInputs = Array.from(
            document.querySelectorAll<HTMLInputElement>('input[type="password"]')
          ).filter(el => el.offsetParent !== null && !el.disabled && !el.readOnly);
          passwordInput = passwordInputs[0] || null;
        }

        // Fill password
        if (password && passwordInput) {
          setInputValue(passwordInput, password);
          filledAny = true;
        }

        // 2. Username input
        let usernameInput: HTMLInputElement | null = null;
        if (targetInput && targetInput.type !== 'password') {
          usernameInput = targetInput;
        } else {
          usernameInput = findUsernameInput(passwordInput || undefined);
        }

        // Fill username
        if (username && usernameInput) {
          setInputValue(usernameInput, username);
          filledAny = true;
        }

        return filledAny;
      } catch (err) {
        console.error('[Frappe Vault] Autofill error:', err);
        return false;
      }
    }

    function findUsernameInput(relatedPasswordInput?: HTMLInputElement): HTMLInputElement | null {
      const form = relatedPasswordInput ? relatedPasswordInput.closest('form') : document;
      const selector = [
        'input[autocomplete="username"]',
        'input[autocomplete="email"]',
        'input[type="email"]',
        'input[name*="user" i]',
        'input[name*="login" i]',
        'input[name*="email" i]',
        'input[id*="user" i]',
        'input[id*="login" i]',
        'input[id*="email" i]',
        'input[type="text"]',
      ].join(',');

      const candidates = Array.from(
        (form || document).querySelectorAll<HTMLInputElement>(selector)
      ).filter(el => el.offsetParent !== null && el.type !== 'password' && el.type !== 'hidden' && !el.disabled);

      return candidates[0] || null;
    }

    function setInputValue(input: HTMLInputElement, value: string) {
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
    }

    function escapeHtml(str: string): string {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    // Handle input focus or hover to attach the in-field icon
    async function handleInputInteraction(event: Event) {
      const target = event.target as HTMLElement;
      if (!isEligibleInput(target)) return;

      const secrets = await fetchMatchingSecrets();
      if (secrets.length > 0) {
        showInFieldIcon(target);
      }
    }

    // Attach delegated listeners to display in-field icon on focus / hover
    document.addEventListener('focusin', handleInputInteraction, true);
    document.addEventListener('mouseenter', handleInputInteraction, true);

    // Dismiss dropdown on outside clicks
    document.addEventListener('pointerdown', (e) => {
      const path = e.composedPath();

      // Click inside shadow host (icon or dropdown)
      if (shadowHost && path.includes(shadowHost)) {
        return;
      }

      // Click inside the active input
      if (activeInput && path.includes(activeInput)) {
        return;
      }

      if (isDropdownVisible) {
        hideAutofillDropdown();
      }
    }, true);

    // Dismiss on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isDropdownVisible) {
        hideAutofillDropdown();
      }
    }, true);

    // Keep in-field icon and dropdown positioned on scroll / resize
    function handleViewChange() {
      if (activeInput) {
        const rect = activeInput.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          if (inFieldIcon) inFieldIcon.style.display = 'none';
          if (isDropdownVisible) hideAutofillDropdown();
        } else {
          if (inFieldIcon) updateIconPosition(inFieldIcon, activeInput);
          if (isDropdownVisible && shadowRoot) {
            const dropdown = shadowRoot.querySelector<HTMLElement>('.vault-dropdown');
            if (dropdown) updateDropdownPosition(dropdown, activeInput);
          }
        }
      }
    }

    window.addEventListener('scroll', handleViewChange, { passive: true });
    window.addEventListener('resize', handleViewChange, { passive: true });

    // Initial setup: track theme & prefetch secrets for active domain
    initThemeTracking();
    fetchMatchingSecrets();
  },
});
