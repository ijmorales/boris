import { describe, expect, it } from 'vitest';
import { formatDateInTimezone } from '../lib/timezone.js';

describe('formatDateInTimezone', () => {
  it('formats UTC midnight date in Argentina timezone (UTC-3)', () => {
    // Dec 27 00:00 UTC = Dec 26 21:00 in Argentina (UTC-3)
    const utcDate = new Date('2024-12-27T00:00:00Z');
    const result = formatDateInTimezone(utcDate, 'America/Argentina/San_Luis');
    expect(result).toBe('2024-12-26');
  });

  it('formats UTC midnight date in Sydney timezone (UTC+11)', () => {
    // Dec 27 00:00 UTC = Dec 27 11:00 in Sydney (UTC+11)
    const utcDate = new Date('2024-12-27T00:00:00Z');
    const result = formatDateInTimezone(utcDate, 'Australia/Sydney');
    expect(result).toBe('2024-12-27');
  });

  it('formats UTC midnight date in Pacific timezone (UTC-8)', () => {
    // Dec 27 00:00 UTC = Dec 26 16:00 in LA (UTC-8)
    const utcDate = new Date('2024-12-27T00:00:00Z');
    const result = formatDateInTimezone(utcDate, 'America/Los_Angeles');
    expect(result).toBe('2024-12-26');
  });

  it('formats late UTC date correctly in positive offset timezone', () => {
    // Dec 27 23:00 UTC = Dec 28 10:00 in Sydney (UTC+11)
    const utcDate = new Date('2024-12-27T23:00:00Z');
    const result = formatDateInTimezone(utcDate, 'Australia/Sydney');
    expect(result).toBe('2024-12-28');
  });

  it('handles UTC timezone correctly', () => {
    const utcDate = new Date('2024-12-27T00:00:00Z');
    const result = formatDateInTimezone(utcDate, 'UTC');
    expect(result).toBe('2024-12-27');
  });

  it('returns YYYY-MM-DD format', () => {
    const date = new Date('2024-01-05T12:00:00Z');
    const result = formatDateInTimezone(date, 'UTC');
    // Should be ISO format with leading zeros
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toBe('2024-01-05');
  });

  it('throws error for invalid timezone', () => {
    const date = new Date('2024-12-27T00:00:00Z');
    expect(() => formatDateInTimezone(date, 'Invalid/Timezone')).toThrow(
      'Invalid timezone "Invalid/Timezone"',
    );
  });

  it('throws error for empty timezone', () => {
    const date = new Date('2024-12-27T00:00:00Z');
    expect(() => formatDateInTimezone(date, '')).toThrow('Invalid timezone ""');
  });
});
