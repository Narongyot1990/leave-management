export function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateKey(value: string | Date) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`;
  }

  return value.slice(0, 10);
}

export function buildDateKey(year: number, month: number, day: number) {
  return `${year}-${padDatePart(month + 1)}-${padDatePart(day)}`;
}

export function leaveSpansDateKey(startDate: string, endDate: string, dateKey: string) {
  const startKey = toDateKey(startDate);
  const endKey = toDateKey(endDate);
  return startKey <= dateKey && dateKey <= endKey;
}

export function leaveStartsInMonth(startDate: string, year: number, month: number) {
  return toDateKey(startDate).startsWith(`${year}-${padDatePart(month + 1)}`);
}

export function otMatchesDateKey(otDate: string | Date, dateKey: string) {
  return toDateKey(otDate) === dateKey;
}

export function otInMonth(otDate: string | Date, year: number, month: number) {
  return toDateKey(otDate).startsWith(`${year}-${padDatePart(month + 1)}`);
}
