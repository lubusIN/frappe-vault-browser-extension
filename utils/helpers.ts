/**
 * Extract root domain and hostname from a given URL string.
 */
export function extractDomain(rawUrl?: string | null): { hostname: string; rootDomain: string } {
  if (!rawUrl) return { hostname: '', rootDomain: '' };
  try {
    const formatted = rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`;
    const parsed = new URL(formatted);
    const hostname = parsed.hostname.toLowerCase();

    // Simple heuristic to extract main root domain (e.g. sub.example.com -> example.com)
    const parts = hostname.split('.');
    let rootDomain = hostname;
    if (parts.length > 2) {
      // Handles example.co.uk vs example.com
      const secondLast = parts[parts.length - 2];
      const isSecondLevel =
        secondLast && ['co', 'com', 'org', 'net', 'edu', 'gov'].includes(secondLast);
      if (isSecondLevel && parts.length > 2) {
        rootDomain = parts.slice(-3).join('.');
      } else {
        rootDomain = parts.slice(-2).join('.');
      }
    }

    return { hostname, rootDomain };
  } catch {
    return { hostname: rawUrl.toLowerCase(), rootDomain: rawUrl.toLowerCase() };
  }
}

/**
 * Check if a secret's URL or title matches a target domain/URL.
 * Prevents phishing by strictly enforcing root domain boundaries.
 */
export function matchesDomain(
  secretUrl?: string | null,
  secretTitle?: string | null,
  targetDomain?: string | null
): boolean {
  if (!targetDomain) return false;
  const cleanTarget = targetDomain.toLowerCase().trim();
  const { hostname: targetHost, rootDomain: targetRoot } = extractDomain(cleanTarget);

  if (secretUrl) {
    const { hostname: secretHost, rootDomain: secretRoot } = extractDomain(secretUrl);
    if (secretHost && targetHost) {
      // 1. Exact host match (e.g. github.com === github.com or app.frappe.io === app.frappe.io)
      if (secretHost === targetHost) return true;

      // 2. Subdomain hierarchy match (e.g. gist.github.com is subdomain of github.com)
      if (secretHost.endsWith(`.${targetHost}`) || targetHost.endsWith(`.${secretHost}`)) {
        return true;
      }

      // 3. Shared root domain match (e.g. api.github.com and gist.github.com share github.com)
      if (secretRoot && targetRoot && secretRoot === targetRoot) {
        return true;
      }
    }
    // If secretUrl is explicitly specified but does not match target, do not match by title
    return false;
  }

  if (secretTitle) {
    const cleanTitle = secretTitle.toLowerCase().trim();
    const targetBase = targetRoot ? targetRoot.split('.')[0] : targetHost.split('.')[0];
    if (targetBase && targetBase.length >= 3) {
      const regex = new RegExp(`\\b${targetBase}\\b`, 'i');
      if (regex.test(cleanTitle)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Format timestamp into human readable relative or short date
 */
export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateString;
  }
}

/**
 * Securely generate a password using Web Cryptography API
 */
export interface PasswordGeneratorOptions {
  length: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}

/**
 * Generate a cryptographically secure random password.
 * Accepts either a length number or options object.
 */
export function generateSecurePassword(
  lengthOrOptions?: number | PasswordGeneratorOptions,
  maybeOptions?: Partial<PasswordGeneratorOptions>
): string {
  const defaultOptions: PasswordGeneratorOptions = {
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  };

  let options: PasswordGeneratorOptions;
  if (typeof lengthOrOptions === 'number') {
    options = { ...defaultOptions, ...maybeOptions, length: lengthOrOptions };
  } else if (lengthOrOptions && typeof lengthOrOptions === 'object') {
    options = { ...defaultOptions, ...lengthOrOptions };
  } else {
    options = defaultOptions;
  }

  const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const NUMBERS = '0123456789';
  const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let charPool = '';
  const requiredChars: string[] = [];

  if (options.uppercase) {
    charPool += UPPER;
    const char = UPPER[cryptoRandomInt(UPPER.length)];
    if (char) requiredChars.push(char);
  }
  if (options.lowercase) {
    charPool += LOWER;
    const char = LOWER[cryptoRandomInt(LOWER.length)];
    if (char) requiredChars.push(char);
  }
  if (options.numbers) {
    charPool += NUMBERS;
    const char = NUMBERS[cryptoRandomInt(NUMBERS.length)];
    if (char) requiredChars.push(char);
  }
  if (options.symbols) {
    charPool += SYMBOLS;
    const char = SYMBOLS[cryptoRandomInt(SYMBOLS.length)];
    if (char) requiredChars.push(char);
  }

  if (!charPool) {
    charPool = LOWER + NUMBERS;
  }

  const length = Math.max(options.length || 16, requiredChars.length);
  const remainingLength = length - requiredChars.length;
  const resultChars = [...requiredChars];

  const randomValues = new Uint32Array(remainingLength);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < remainingLength; i++) {
    const randVal = randomValues[i] ?? 0;
    const char = charPool[randVal % charPool.length];
    if (char) resultChars.push(char);
  }

  // Shuffle using Fisher-Yates with crypto random
  for (let i = resultChars.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1);
    const temp = resultChars[i];
    const target = resultChars[j];
    if (temp !== undefined && target !== undefined) {
      resultChars[i] = target;
      resultChars[j] = temp;
    }
  }

  return resultChars.join('');
}

/**
 * Calculate password strength score and label.
 */
export function calculatePasswordStrength(password?: string | null): {
  score: number;
  label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  color: 'red' | 'amber' | 'blue' | 'green';
} {
  if (!password || password.length === 0) {
    return { score: 0, label: 'Very Weak', color: 'red' };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 14) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 0.5;
  if (/[^A-Za-z0-9]/.test(password)) score += 0.5;

  const total = Math.min(4, Math.floor(score));
  const ratings: Record<
    number,
    {
      label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
      color: 'red' | 'amber' | 'blue' | 'green';
    }
  > = {
    0: { label: 'Very Weak', color: 'red' },
    1: { label: 'Weak', color: 'red' },
    2: { label: 'Medium', color: 'amber' },
    3: { label: 'Strong', color: 'blue' },
    4: { label: 'Very Strong', color: 'green' },
  };

  return { score: total, ...ratings[total]! };
}

function cryptoRandomInt(max: number): number {
  if (max <= 0) return 0;
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] ?? 0) % max;
}

let clearTimer: any = null;

/**
 * Copy text to clipboard with navigator.clipboard and optional auto-clear timer.
 */
export async function copyText(text: string, clearAfterSeconds?: number): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);

    if (clearAfterSeconds && clearAfterSeconds > 0) {
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText();
          if (current === text) {
            await navigator.clipboard.writeText('');
          }
        } catch {
          // Ignore silently if read permission not available
        }
      }, clearAfterSeconds * 1000);
    }

    return true;
  } catch (err) {
    console.error('Clipboard write error:', err);
    return false;
  }
}

/**
 * Open external URL safely in a new browser tab.
 */
export function openExternalUrl(url?: string | null): void {
  if (!url || url === '#') return;
  const fullUrl = url.includes('://') ? url : `https://${url}`;

  const g = globalThis as any;
  if (g.browser?.tabs?.create) {
    g.browser.tabs.create({ url: fullUrl });
  } else if (g.chrome?.tabs?.create) {
    g.chrome.tabs.create({ url: fullUrl });
  } else if (typeof window !== 'undefined') {
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  }
}
