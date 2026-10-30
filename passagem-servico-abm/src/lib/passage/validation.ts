export type ServicePeriod = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

export function isValidDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return (
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
  );
}

export function isValidTimeInput(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isDateTimeWithinPeriod(
  date: string,
  time: string,
  period: ServicePeriod,
) {
  if (
    !isValidDateInput(date) ||
    !isValidTimeInput(time) ||
    !isValidDateInput(period.startDate) ||
    !isValidTimeInput(period.startTime) ||
    !isValidDateInput(period.endDate) ||
    !isValidTimeInput(period.endTime)
  ) {
    return false;
  }

  const value = `${date}T${time}`;
  const start = `${period.startDate}T${period.startTime}`;
  const end = `${period.endDate}T${period.endTime}`;
  return start <= value && value <= end;
}

export function parseNonNegativeSafeInteger(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
