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
      const isSecondLevel = secondLast && ['co', 'com', 'org', 'net', 'edu', 'gov'].includes(secondLast);
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
 */
export function matchesDomain(secretUrl?: string | null, secretTitle?: string | null, targetDomain?: string | null): boolean {
  if (!targetDomain) return false;
  const cleanTarget = targetDomain.toLowerCase().trim();

  if (secretUrl) {
    const { hostname, rootDomain } = extractDomain(secretUrl);
    if (
      hostname.includes(cleanTarget) ||
      cleanTarget.includes(hostname) ||
      rootDomain.includes(cleanTarget) ||
      cleanTarget.includes(rootDomain)
    ) {
      return true;
    }
  }

  if (secretTitle) {
    const cleanTitle = secretTitle.toLowerCase().trim();
    const targetBase = cleanTarget.split('.')[0] || '';
    if (targetBase.length >= 3 && cleanTitle.includes(targetBase)) {
      return true;
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
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export function generateSecurePassword(options: PasswordGeneratorOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
}): string {
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

  const length = Math.max(options.length, requiredChars.length);
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
