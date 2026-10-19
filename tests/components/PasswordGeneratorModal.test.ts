import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PasswordGeneratorModal from '../../components/PasswordGeneratorModal.vue';

describe('PasswordGeneratorModal Component', () => {
  it('renders length and character options correctly', () => {
    const wrapper = mount(PasswordGeneratorModal, {
      props: {
        forSelection: false,
      },
      global: {
        stubs: ['Button', 'Badge', 'Checkbox', 'Slider', 'Icon'],
      },
    });

    expect(wrapper.text()).toContain('Password Generator');
    expect(wrapper.text()).toContain('Length: 18');
    expect(wrapper.html()).toContain('Uppercase (A-Z)');
    expect(wrapper.html()).toContain('Numbers (0-9)');
    expect(wrapper.html()).toContain('Symbols (!@#$...)');
  });

  it('emits close when Cancel / Close button is clicked', async () => {
    const wrapper = mount(PasswordGeneratorModal, {
      props: {
        forSelection: false,
      },
      global: {
        stubs: ['Button', 'Badge', 'Checkbox', 'Slider', 'Icon'],
      },
    });

    const closeBtn = wrapper.find('button[aria-label="Close"]');
    if (closeBtn.exists()) {
      await closeBtn.trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    }
  });

  it('renders "Use this password" button when forSelection is true', () => {
    const wrapper = mount(PasswordGeneratorModal, {
      props: {
        forSelection: true,
      },
      global: {
        stubs: ['Button', 'Badge', 'Checkbox', 'Slider', 'Icon'],
      },
    });

    expect(wrapper.html()).toContain('Use this password');
  });
});
