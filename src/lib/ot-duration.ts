const TIME_PATTERN = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;

export function isValidTimeString(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/**
 * Minutes between startTime and endTime (both "HH:mm").
 * If endTime is not after startTime, assumes the shift rolls past
 * midnight into the next day (e.g. night_shift 22:00 -> 06:00).
 */
export function getWorkDurationMinutes(startTime?: string, endTime?: string): number | null {
  if (!startTime || !endTime || !isValidTimeString(startTime) || !isValidTimeString(endTime)) {
    return null;
  }

  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;

  if (endTotal <= startTotal) {
    endTotal += 24 * 60;
  }

  return endTotal - startTotal;
}

export function formatWorkDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes} mins`;
}

export function getWorkDurationLabel(startTime?: string, endTime?: string): string | null {
  const minutes = getWorkDurationMinutes(startTime, endTime);
  return minutes === null ? null : formatWorkDuration(minutes);
}
