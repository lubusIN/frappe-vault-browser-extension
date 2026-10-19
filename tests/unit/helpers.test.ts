import { describe, it, expect } from 'vitest';
import {
  extractDomain,
  matchesDomain,
  generateSecurePassword,
  calculatePasswordStrength,
  formatRelativeTime,
} from '../../utils/helpers';

describe('extractDomain', () => {
  it('extracts hostname and root domain for standard urls', () => {
    const res = extractDomain('https://app.frappe.io/desk');
    expect(res.hostname).toBe('app.frappe.io');
    expect(res.rootDomain).toBe('frappe.io');
  });

  it('handles multi-level country code TLDs like .co.uk', () => {
    const res = extractDomain('https://subdomain.service.co.uk/login');
    expect(res.hostname).toBe('subdomain.service.co.uk');
    expect(res.rootDomain).toBe('service.co.uk');
  });

  it('handles localhost and IP addresses safely', () => {
    const localhost = extractDomain('http://localhost:8000');
    expect(localhost.hostname).toBe('localhost');

    const ip = extractDomain('http://192.168.1.10:3000/dashboard');
    expect(ip.hostname).toBe('192.168.1.10');
  });

  it('handles inputs missing protocol scheme', () => {
    const res = extractDomain('github.com/frappe');
    expect(res.hostname).toBe('github.com');
  });

  it('returns empty strings for falsy inputs', () => {
    expect(extractDomain(null)).toEqual({ hostname: '', rootDomain: '' });
    expect(extractDomain('')).toEqual({ hostname: '', rootDomain: '' });
  });
});

describe('matchesDomain (Security & Phishing Prevention)', () => {
  it('matches exact domain and root domain', () => {
    expect(matchesDomain('https://github.com', 'GitHub', 'github.com')).toBe(true);
    expect(matchesDomain('https://app.github.com', 'GitHub App', 'github.com')).toBe(true);
  });

  it('matches subdomains to target root domain', () => {
    expect(matchesDomain('https://github.com', 'GitHub', 'gist.github.com')).toBe(true);
  });

  it('matches by secret title if title contains domain base', () => {
    expect(matchesDomain(null, 'Frappe Cloud Login', 'frappe.cloud')).toBe(true);
  });

  it('does NOT match unrelated domains with similar substrings (Phishing protection)', () => {
    // evil-github.com should not match github.com
    expect(matchesDomain('https://evil-github.com', 'Evil GitHub', 'github.com')).toBe(false);
    // notpaypal.com should not match paypal.com
    expect(matchesDomain('https://notpaypal.com', 'Fake PayPal', 'paypal.com')).toBe(false);
  });

  it('does NOT match attacker domains containing target domain in subdomains', () => {
    // paypal.com.attacker.com should not match paypal.com
    const result = matchesDomain('https://paypal.com.attacker.com', 'Attacker', 'paypal.com');
    // Root domain of attacker is attacker.com, root domain of target is paypal.com
    expect(result).toBe(false);
  });

  it('returns false for empty or null target domain', () => {
    expect(matchesDomain('https://github.com', 'GitHub', null)).toBe(false);
    expect(matchesDomain('https://github.com', 'GitHub', '')).toBe(false);
  });
});

describe('generateSecurePassword', () => {
  it('generates password with the specified length', () => {
    const p12 = generateSecurePassword(12);
    expect(p12.length).toBe(12);

    const p32 = generateSecurePassword(32);
    expect(p32.length).toBe(32);
  });

  it('includes required character types when requested', () => {
    const password = generateSecurePassword(24, {
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    });

    expect(/[A-Z]/.test(password)).toBe(true);
    expect(/[a-z]/.test(password)).toBe(true);
    expect(/[0-9]/.test(password)).toBe(true);
    expect(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)).toBe(true);
  });

  it('respects disabling specific character sets', () => {
    const numbersOnly = generateSecurePassword(16, {
      uppercase: false,
      lowercase: false,
      numbers: true,
      symbols: false,
    });
    expect(/^[0-9]+$/.test(numbersOnly)).toBe(true);
  });
});

describe('calculatePasswordStrength', () => {
  it('rates empty or very short passwords as very weak', () => {
    expect(calculatePasswordStrength('')).toEqual({ score: 0, label: 'Very Weak', color: 'red' });
    expect(calculatePasswordStrength('abc')).toEqual({
      score: 0,
      label: 'Very Weak',
      color: 'red',
    });
  });

  it('rates complex long passwords as strong or very strong', () => {
    const res = calculatePasswordStrength('xK9#mQ2$vL8!pZ1@');
    expect(res.score).toBeGreaterThanOrEqual(3);
    expect(['Strong', 'Very Strong']).toContain(res.label);
  });
});

describe('formatRelativeTime', () => {
  it('formats recent timestamps as Just now or minutes ago', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('handles invalid or empty date gracefully', () => {
    expect(formatRelativeTime(null)).toBe('');
    expect(formatRelativeTime('invalid-date')).toBe('invalid-date');
  });
});
