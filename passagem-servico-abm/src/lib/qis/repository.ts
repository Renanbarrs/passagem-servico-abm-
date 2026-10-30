import {
  weekdays,
  type QisActivity,
  type QisContent,
  type QisPublishedVersion,
  type QisSchedule,
  type QisScheduleRow,
  type Weekday,
} from "@/lib/qis/types";
import { getCurrentQisWeek } from "@/lib/qis/date-utils";

const storageKey = "portal-abm:qis:v3";
const previousStorageKey = "portal-abm:qis:v2";

export interface QisRepository {
  list(): Promise<QisSchedule[]>;
  save(schedule: QisSchedule): Promise<void>;
}

export class LocalStorageQisRepository implements QisRepository {
  async list() {
    const storage = this.getStorage();
    const raw = storage.getItem(storageKey);

    if (raw !== null) return parseSchedules(raw);

    const previousData = storage.getItem(previousStorageKey);
    if (previousData !== null) {
      const migrated = migratePreviousSchedules(previousData);
      storage.setItem(storageKey, JSON.stringify(migrated));
      return migrated;
    }

    const initialDraft = createInitialDraft();
    await this.save(initialDraft);
    return [initialDraft];
  }

  async save(schedule: QisSchedule) {
    const storage = this.getStorage();
    const raw = storage.getItem(storageKey);
    const schedules = raw === null ? [] : parseSchedules(raw);
    const nextSchedules = schedules.filter((item) => item.id !== schedule.id);
    nextSchedules.push(schedule);
    storage.setItem(storageKey, JSON.stringify(nextSchedules));
  }

  private getStorage() {
    if (typeof window === "undefined") {
      throw new Error("O armazenamento local só está disponível no navegador.");
    }

    try {
      return window.localStorage;
    } catch {
      throw new Error(
        "O navegador não permitiu acessar o armazenamento local do QIS.",
      );
    }
  }
}

export function createEmptyActivity(): QisActivity {
  return {
    theme: "",
    uniform: "",
    location: "",
    front: "",
    notes: "",
  };
}

export function createActivityRow(time = ""): QisScheduleRow {
  return {
    id: crypto.randomUUID(),
    time,
    kind: "activity",
    breakLabel: "",
    activities: createActivities(createEmptyActivity),
  };
}

export function createLunchRow(): QisScheduleRow {
  return {
    id: crypto.randomUUID(),
    time: "12h às 13h",
    kind: "break",
    breakLabel: "Intervalo para almoço",
    activities: createActivities(createEmptyActivity),
  };
}

function createActivities(
  createActivity: (weekday: Weekday) => QisActivity,
): Record<Weekday, QisActivity> {
  return {
    "Segunda-feira": createActivity("Segunda-feira"),
    "Terça-feira": createActivity("Terça-feira"),
    "Quarta-feira": createActivity("Quarta-feira"),
    "Quinta-feira": createActivity("Quinta-feira"),
    "Sexta-feira": createActivity("Sexta-feira"),
  };
}

export function createStandardContent(): QisContent {
  const { start, end } = getCurrentQisWeek();
  const standardActivity = (theme: string): QisActivity => ({
    theme,
    uniform: "Uniforme a definir",
    location: "Unidade",
    front: "Equipe responsável",
    notes: "",
  });
  const createStandardRow = (
    time: string,
    themes: Record<Weekday, string>,
  ): QisScheduleRow => ({
    id: crypto.randomUUID(),
    time,
    kind: "activity",
    breakLabel: "",
    activities: createActivities((weekday) =>
      standardActivity(themes[weekday]),
    ),
  });

  return {
    periodStart: start,
    periodEnd: end,
    responsible: "",
    rows: [
      createStandardRow("09h às 10h30", {
        "Segunda-feira": "Expediente administrativo",
        "Terça-feira": "Treinamento físico",
        "Quarta-feira": "Atividade administrativa",
        "Quinta-feira": "Treinamento físico",
        "Sexta-feira": "Atividade administrativa",
      }),
      createStandardRow("10h45 às 12h", {
        "Segunda-feira": "Atividade administrativa",
        "Terça-feira": "Atividade administrativa",
        "Quarta-feira": "Atividade administrativa",
        "Quinta-feira": "Atividade administrativa",
        "Sexta-feira": "Atividade administrativa",
      }),
      createLunchRow(),
      createStandardRow("13h às 15h", {
        "Segunda-feira": "Atividade administrativa",
        "Terça-feira": "Atividade administrativa",
        "Quarta-feira": "Atividade administrativa",
        "Quinta-feira": "Atividade administrativa",
        "Sexta-feira": "Atividade administrativa",
      }),
      createStandardRow("15h às 17h", {
        "Segunda-feira": "Atividade administrativa",
        "Terça-feira": "Atividade administrativa",
        "Quarta-feira": "Atividade administrativa",
        "Quinta-feira": "Atividade administrativa",
        "Sexta-feira": "Atividade administrativa",
      }),
    ],
  };
}

function createInitialDraft(): QisSchedule {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    status: "draft",
    version: 0,
    createdAt: now,
    updatedAt: now,
    content: createStandardContent(),
    publishedVersions: [],
  };
}

function parseSchedules(raw: string): QisSchedule[] {
  const parsed = parseJson(raw);
  if (!Array.isArray(parsed) || !parsed.every(isQisSchedule)) {
    throw new Error(
      "O formato dos dados locais do QIS não é compatível com esta versão da demonstração.",
    );
  }
  return parsed;
}

function migratePreviousSchedules(raw: string): QisSchedule[] {
  const parsed = parseJson(raw);
  if (!Array.isArray(parsed) || !parsed.every(isPreviousSchedule)) {
    throw new Error(
      "Não foi possível migrar os rascunhos antigos do QIS. Os dados originais foram mantidos.",
    );
  }

  return parsed.map((schedule) => {
    const migratedContent = migratePreviousContent(schedule.content);
    const publishedVersions = schedule.publishedVersions.map((version) => ({
      ...version,
      content: migratePreviousContent(version.content),
    }));
    const isUntouchedEmptyDraft =
      schedule.status === "draft" &&
      schedule.version === 0 &&
      schedule.updatedAt === schedule.createdAt &&
      publishedVersions.length === 0 &&
      weekdays.every((weekday) => schedule.content.days[weekday].length === 0);

    return {
      ...schedule,
      content: isUntouchedEmptyDraft
        ? {
            ...createStandardContent(),
            periodStart: migratedContent.periodStart,
            periodEnd: migratedContent.periodEnd,
            responsible: migratedContent.responsible,
          }
        : migratedContent,
      publishedVersions,
    };
  });
}

function migratePreviousContent(
  content: PreviousQisContent,
): QisContent {
  const times = Array.from(
    new Set(
      weekdays.flatMap((weekday) =>
        content.days[weekday].map((item) => item.time),
      ),
    ),
  );
  const rows = times.flatMap((time) => {
    const activitiesByDay = weekdays.map((weekday) =>
      content.days[weekday].filter((activity) => activity.time === time),
    );
    const rowCount = Math.max(...activitiesByDay.map((activities) => activities.length));

    return Array.from({ length: rowCount }, (_, activityIndex) => {
      const row = createActivityRow(time);

      weekdays.forEach((weekday, weekdayIndex) => {
        const activity = activitiesByDay[weekdayIndex][activityIndex];
        if (activity) {
          row.activities[weekday] = {
            theme: activity.theme,
            uniform: activity.uniform,
            location: activity.location,
            front: activity.front,
            notes: activity.notes,
          };
        }
      });

      return row;
    });
  });
  const lunchIndex = rows.findIndex(
    (row) =>
      (row.time.toLowerCase().includes("12h") ||
        row.time.toLowerCase().includes("12:00")) &&
      weekdays.every((weekday) =>
        Object.values(row.activities[weekday]).every((value) => !value),
      ),
  );

  if (lunchIndex >= 0) {
    rows[lunchIndex] = {
      ...rows[lunchIndex],
      kind: "break",
      breakLabel: "Intervalo para almoço",
    };
  } else {
    const afternoonIndex = rows.findIndex((row) =>
      row.time.startsWith("13h"),
    );
    rows.splice(
      afternoonIndex < 0 ? rows.length : afternoonIndex,
      0,
      createLunchRow(),
    );
  }

  return {
    periodStart: content.periodStart,
    periodEnd: content.periodEnd,
    responsible: content.responsible,
    rows,
  };
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      "Os dados locais do QIS estão inválidos. Os dados existentes foram mantidos.",
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isActivity(value: unknown): value is QisActivity {
  return (
    isRecord(value) &&
    isString(value.theme) &&
    isString(value.uniform) &&
    isString(value.location) &&
    isString(value.front) &&
    isString(value.notes)
  );
}

function isScheduleRow(value: unknown): value is QisScheduleRow {
  const activities = isRecord(value) ? value.activities : null;
  if (
    !isRecord(value) ||
    !isString(value.id) ||
    !isString(value.time) ||
    (value.kind !== "activity" && value.kind !== "break") ||
    !isString(value.breakLabel) ||
    !isRecord(activities)
  ) {
    return false;
  }

  return weekdays.every((weekday) => isActivity(activities[weekday]));
}

function isContent(value: unknown): value is QisContent {
  return (
    isRecord(value) &&
    isString(value.periodStart) &&
    isString(value.periodEnd) &&
    isString(value.responsible) &&
    Array.isArray(value.rows) &&
    value.rows.every(isScheduleRow)
  );
}

function isPublishedVersion(value: unknown): value is QisPublishedVersion {
  return (
    isRecord(value) &&
    typeof value.version === "number" &&
    isString(value.publishedAt) &&
    isString(value.signedPdfName) &&
    isContent(value.content)
  );
}

function isQisSchedule(value: unknown): value is QisSchedule {
  return (
    isRecord(value) &&
    isString(value.id) &&
    (value.status === "draft" || value.status === "published") &&
    typeof value.version === "number" &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isContent(value.content) &&
    Array.isArray(value.publishedVersions) &&
    value.publishedVersions.every(isPublishedVersion)
  );
}

type PreviousActivity = QisActivity & { id: string; time: string };
type PreviousQisContent = Omit<QisContent, "rows"> & {
  days: Record<Weekday, PreviousActivity[]>;
};
type PreviousQisSchedule = Omit<QisSchedule, "content" | "publishedVersions"> & {
  content: PreviousQisContent;
  publishedVersions: (Omit<QisPublishedVersion, "content"> & {
    content: PreviousQisContent;
  })[];
};

function isPreviousActivity(value: unknown): value is PreviousActivity {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.time) &&
    isString(value.theme) &&
    isString(value.uniform) &&
    isString(value.location) &&
    isString(value.front) &&
    isString(value.notes)
  );
}

function isPreviousContent(value: unknown): value is PreviousQisContent {
  const days = isRecord(value) ? value.days : null;
  if (
    !isRecord(value) ||
    !isString(value.periodStart) ||
    !isString(value.periodEnd) ||
    !isString(value.responsible) ||
    !isRecord(days)
  ) {
    return false;
  }

  return weekdays.every(
    (weekday) =>
      Array.isArray(days[weekday]) &&
      days[weekday].every(isPreviousActivity),
  );
}

function isPreviousPublishedVersion(
  value: unknown,
): value is PreviousQisSchedule["publishedVersions"][number] {
  return (
    isRecord(value) &&
    typeof value.version === "number" &&
    isString(value.publishedAt) &&
    isString(value.signedPdfName) &&
    isPreviousContent(value.content)
  );
}

function isPreviousSchedule(value: unknown): value is PreviousQisSchedule {
  return (
    isRecord(value) &&
    isString(value.id) &&
    (value.status === "draft" || value.status === "published") &&
    typeof value.version === "number" &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isPreviousContent(value.content) &&
    Array.isArray(value.publishedVersions) &&
    value.publishedVersions.every(isPreviousPublishedVersion)
  );
}
