import { describe, it, expect, beforeEach } from 'vitest';
import { isEligibleInput } from '../../utils/autofill';

describe('isEligibleInput (Autofill Heuristic)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('accepts standard password inputs', () => {
    const input = document.createElement('input');
    input.type = 'password';
    document.body.appendChild(input);

    expect(isEligibleInput(input)).toBe(true);
  });

  it('accepts inputs with login autocomplete attributes', () => {
    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.autocomplete = 'username';

    const emailInput = document.createElement('input');
    emailInput.type = 'text';
    emailInput.autocomplete = 'email';

    const currentPass = document.createElement('input');
    currentPass.autocomplete = 'current-password';

    expect(isEligibleInput(usernameInput)).toBe(true);
    expect(isEligibleInput(emailInput)).toBe(true);
    expect(isEligibleInput(currentPass)).toBe(true);
  });

  it('accepts inputs with common login names, ids, or placeholders', () => {
    const byName = document.createElement('input');
    byName.name = 'user_login';

    const byId = document.createElement('input');
    byId.id = 'auth-email-address';

    const byPlaceholder = document.createElement('input');
    byPlaceholder.placeholder = 'Enter your username or email';

    expect(isEligibleInput(byName)).toBe(true);
    expect(isEligibleInput(byId)).toBe(true);
    expect(isEligibleInput(byPlaceholder)).toBe(true);
  });

  it('accepts text inputs inside a form that also contains a password input', () => {
    const form = document.createElement('form');
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.name = 'account_identifier';

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';

    form.appendChild(textInput);
    form.appendChild(passwordInput);
    document.body.appendChild(form);

    expect(isEligibleInput(textInput)).toBe(true);
  });

  it('rejects non-login input types (checkbox, radio, submit, hidden, search, etc.)', () => {
    const nonEligible = [
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

    nonEligible.forEach((type) => {
      const el = document.createElement('input');
      el.type = type;
      expect(isEligibleInput(el)).toBe(false);
    });
  });

  it('rejects disabled or readonly inputs', () => {
    const disabledInput = document.createElement('input');
    disabledInput.type = 'password';
    disabledInput.disabled = true;

    const readonlyInput = document.createElement('input');
    readonlyInput.type = 'password';
    readonlyInput.readOnly = true;

    expect(isEligibleInput(disabledInput)).toBe(false);
    expect(isEligibleInput(readonlyInput)).toBe(false);
  });

  it('rejects inputs inside the Vault extension Shadow DOM itself', () => {
    const vaultRoot = document.createElement('div');
    vaultRoot.id = 'frappe-vault-autofill-root';

    const input = document.createElement('input');
    input.type = 'password';
    vaultRoot.appendChild(input);
    document.body.appendChild(vaultRoot);

    expect(isEligibleInput(input)).toBe(false);
  });

  it('rejects null or non-input elements', () => {
    expect(isEligibleInput(null)).toBe(false);
    const div = document.createElement('div');
    expect(isEligibleInput(div)).toBe(false);
  });
});
