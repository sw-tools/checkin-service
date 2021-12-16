import * as Luxon from 'luxon';

/**
 * Generate a cron expression that triggers once at the given date.
 *
 * Uses an extended cron syntax.
 */
export function generateCronExpressionUtc(date: Date) {
  const dateTime = Luxon.DateTime.fromJSDate(date, { zone: 'utc' });

  return `${dateTime.minute} ${dateTime.hour} ${dateTime.day} ${dateTime.month} ? ${dateTime.year}`;
}
