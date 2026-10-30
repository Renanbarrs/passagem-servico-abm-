export type QisWeekPeriod = {
  start: string;
  end: string;
};

export function getQisWeekForDate(value: string): QisWeekPeriod | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const referenceDate = new Date(year, month - 1, day, 12);

  if (
    referenceDate.getFullYear() !== year ||
    referenceDate.getMonth() !== month - 1 ||
    referenceDate.getDate() !== day
  ) {
    return null;
  }

  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - ((referenceDate.getDay() + 6) % 7));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    start: toDateInput(monday),
    end: toDateInput(friday),
  };
}

export function getCurrentQisWeek(): QisWeekPeriod {
  const currentWeek = getQisWeekForDate(toDateInput(new Date()));
  if (!currentWeek) {
    throw new Error("Não foi possível calcular a semana atual do QIS.");
  }

  return currentWeek;
}

export function isQisWeekPeriod(start: string, end: string) {
  const week = getQisWeekForDate(start);
  return week !== null && week.start === start && week.end === end;
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
