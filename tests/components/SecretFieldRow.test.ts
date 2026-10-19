import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SecretFieldRow from '../../components/SecretFieldRow.vue';

describe('SecretFieldRow Component', () => {
  it('renders standard text label and value correctly', () => {
    const wrapper = mount(SecretFieldRow, {
      props: {
        label: 'Username',
        value: 'admin@frappe.io',
      },
      global: {
        stubs: ['Icon', 'Button', 'Badge'],
      },
    });

    expect(wrapper.text()).toContain('Username');
    expect(wrapper.text()).toContain('admin@frappe.io');
  });

  it('renders masked bullets when isMasked is true and isRevealed is false', () => {
    const wrapper = mount(SecretFieldRow, {
      props: {
        label: 'Password',
        value: 'SuperSecret123',
        isMasked: true,
        isRevealed: false,
        canReveal: true,
      },
      global: {
        stubs: ['Icon', 'Button', 'Badge'],
      },
    });

    expect(wrapper.text()).toContain('••••••••••••');
    expect(wrapper.text()).not.toContain('SuperSecret123');
  });

  it('reveals plaintext password when isRevealed is true', () => {
    const wrapper = mount(SecretFieldRow, {
      props: {
        label: 'Password',
        value: 'SuperSecret123',
        isMasked: true,
        isRevealed: true,
        canReveal: true,
      },
      global: {
        stubs: ['Icon', 'Button', 'Badge'],
      },
    });

    expect(wrapper.text()).toContain('SuperSecret123');
  });
});
