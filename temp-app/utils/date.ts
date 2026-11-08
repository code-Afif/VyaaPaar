/**
 * Date utilities for DukaanSaathi / VyaaPaar
 * Strictly compares ISO date strings against device local calendar date.
 */

export function isCreatedToday(isoString?: string): boolean {
  if (!isoString) return false;
  const entryDate = new Date(isoString);
  if (isNaN(entryDate.getTime())) return false;
  const now = new Date();
  return (
    entryDate.getFullYear() === now.getFullYear() &&
    entryDate.getMonth() === now.getMonth() &&
    entryDate.getDate() === now.getDate()
  );
}
