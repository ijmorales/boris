/**
 * Formats a date as YYYY-MM-DD in the specified IANA timezone.
 * Uses native Intl API - no external dependencies needed.
 *
 * @param date - The date to format
 * @param timezone - IANA timezone name (e.g., 'America/Argentina/San_Luis')
 * @returns Date string in YYYY-MM-DD format
 * @throws {Error} If timezone is not a valid IANA timezone identifier
 */
export function formatDateInTimezone(date: Date, timezone: string): string {
  try {
    return date.toLocaleDateString('en-CA', { timeZone: timezone });
  } catch (error) {
    if (error instanceof RangeError) {
      throw new Error(
        `Invalid timezone "${timezone}". Expected an IANA timezone like "America/New_York".`,
      );
    }
    throw error;
  }
}
