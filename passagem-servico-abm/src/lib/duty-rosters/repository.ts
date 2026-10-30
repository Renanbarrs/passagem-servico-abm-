import type { DutyRoster } from "@/lib/duty-rosters/types";

const storageKey = "portal-abm:duty-rosters:v1";

export interface DutyRosterRepository {
  list(): Promise<DutyRoster[]>;
  getByDate(date: string): Promise<DutyRoster | null>;
  save(roster: DutyRoster): Promise<void>;
  remove(date: string): Promise<void>;
}

export class LocalStorageDutyRosterRepository
  implements DutyRosterRepository
{
  async list() {
    return this.readAll();
  }

  async getByDate(date: string) {
    return (await this.readAll()).find((roster) => roster.date === date) ?? null;
  }

  async save(roster: DutyRoster) {
    const rosters = await this.readAll();
    const nextRosters = rosters.filter((item) => item.date !== roster.date);
    nextRosters.push(roster);
    this.writeAll(nextRosters);
  }

  async remove(date: string) {
    const rosters = await this.readAll();
    this.writeAll(rosters.filter((roster) => roster.date !== date));
  }

  private readAll(): DutyRoster[] {
    const storage = this.getStorage();
    const raw = storage.getItem(storageKey);
    if (raw === null) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        "Os dados locais das escalas estão inválidos. Os dados existentes foram mantidos.",
      );
    }

    if (!Array.isArray(parsed) || !parsed.every(isDutyRoster)) {
      throw new Error(
        "O formato das escalas locais não é compatível com esta versão. Os dados existentes foram mantidos.",
      );
    }

    return parsed;
  }

  private writeAll(rosters: DutyRoster[]) {
    this.getStorage().setItem(storageKey, JSON.stringify(rosters));
  }

  private getStorage() {
    if (typeof window === "undefined") {
      throw new Error("O armazenamento local só está disponível no navegador.");
    }

    try {
      return window.localStorage;
    } catch {
      throw new Error(
        "O navegador não permitiu acessar o armazenamento local das escalas.",
      );
    }
  }
}

function isDutyRoster(value: unknown): value is DutyRoster {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.date === "string" &&
    isDate(value.date) &&
    typeof value.officerName === "string" &&
    typeof value.auxiliaryName === "string" &&
    typeof value.driverName === "string" &&
    typeof value.notes === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
