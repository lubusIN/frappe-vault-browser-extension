export default defineContentScript({
  matches: ['*://*/*'],
  main() {
    console.log('[Frappe Vault] Content script loaded');

    // Listen for autofill messages from popup
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'AUTOFILL_CREDENTIALS') {
        const { username, password } = message.payload || {};
        const success = performAutofill(username, password);
        sendResponse({ success });
        return true;
      }
    });

    function performAutofill(username?: string, password?: string): boolean {
      try {
        const passwordInputs = Array.from(
          document.querySelectorAll<HTMLInputElement>('input[type="password"]')
        ).filter(el => el.offsetParent !== null); // visible only

        let filledAny = false;
        const mainPasswordInput = passwordInputs[0];

        if (password && mainPasswordInput) {
          setInputValue(mainPasswordInput, password);
          filledAny = true;

          // Attempt to find corresponding username/email input preceding the password input
          if (username) {
            const usernameInput = findUsernameInput(mainPasswordInput);
            if (usernameInput) {
              setInputValue(usernameInput, username);
            }
          }
        } else if (username) {
          // If only username or no visible password input found yet
          const usernameInput = findUsernameInput();
          if (usernameInput) {
            setInputValue(usernameInput, username);
            filledAny = true;
          }
        }

        return filledAny;
      } catch (err) {
        console.error('[Frappe Vault] Autofill error:', err);
        return false;
      }
    }

    function findUsernameInput(relatedPasswordInput?: HTMLInputElement): HTMLInputElement | null {
      // 1. Check form containing the password input
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
      ).filter(el => el.offsetParent !== null && el.type !== 'password' && el.type !== 'hidden');

      return candidates[0] || null;
    }

    function setInputValue(input: HTMLInputElement, value: string) {
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
    }
  },
});
