/**
 * Check if a DOM element is an eligible login/password input for Vault autofill.
 */
export function isEligibleInput(el: HTMLElement | null): el is HTMLInputElement {
  if (!el || el.tagName !== 'INPUT') return false;
  const input = el as HTMLInputElement;

  if (input.disabled || input.readOnly) return false;

  const type = (input.type || 'text').toLowerCase();
  const nonEligibleTypes = [
    'hidden',
    'submit',
    'button',
    'reset',
    'checkbox',
    'radio',
    'file',
    'image',
    'color',
    'range',
    'date',
    'number',
    'search',
  ];
  if (nonEligibleTypes.includes(type)) return false;

  if (input.closest && input.closest('#frappe-vault-autofill-root')) return false;

  const autocomplete = (input.autocomplete || '').toLowerCase();
  const name = (input.name || '').toLowerCase();
  const id = (input.id || '').toLowerCase();
  const placeholder = (input.placeholder || '').toLowerCase();

  // Password inputs
  if (type === 'password') return true;

  // Autocomplete username/email
  if (['username', 'email', 'current-password', 'new-password'].includes(autocomplete)) return true;

  // Common login field names
  if (
    name.includes('user') ||
    name.includes('login') ||
    name.includes('email') ||
    name.includes('auth') ||
    name.includes('pass')
  ) {
    return true;
  }

  if (
    id.includes('user') ||
    id.includes('login') ||
    id.includes('email') ||
    id.includes('auth') ||
    id.includes('pass')
  ) {
    return true;
  }

  if (
    placeholder.includes('email') ||
    placeholder.includes('username') ||
    placeholder.includes('user') ||
    placeholder.includes('login')
  ) {
    return true;
  }

  // Form heuristic: if inside a form that contains a password field, treat text input as username
  const form = input.form || (input.closest ? input.closest('form') : null);
  if (form && form.querySelector && form.querySelector('input[type="password"]')) {
    return true;
  }

  return false;
}
