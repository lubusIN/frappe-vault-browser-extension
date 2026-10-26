import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BookmarkIcon from '../../components/BookmarkIcon.vue';

describe('BookmarkIcon Component', () => {
  it('renders outline bookmark when filled is false', () => {
    const wrapper = mount(BookmarkIcon, {
      props: {
        filled: false,
      },
    });

    const svg = wrapper.find('svg');
    expect(svg.exists()).toBe(true);
    expect(svg.attributes('fill')).toBe('none');
    expect(svg.attributes('stroke')).toBe('currentColor');
  });

  it('renders solid filled bookmark when filled is true', () => {
    const wrapper = mount(BookmarkIcon, {
      props: {
        filled: true,
      },
    });

    const svg = wrapper.find('svg');
    expect(svg.exists()).toBe(true);
    expect(svg.attributes('fill')).toBe('currentColor');
    expect(svg.attributes('stroke')).toBe('currentColor');
  });
});
