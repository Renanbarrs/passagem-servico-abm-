export const weekdays = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
] as const;

export type Weekday = (typeof weekdays)[number];
export type QisStatus = "draft" | "published";
export type QisActivity = {
  theme: string;
  uniform: string;
  location: string;
  front: string;
  notes: string;
};

export type QisScheduleRow = {
  id: string;
  time: string;
  kind: "activity" | "break";
  breakLabel: string;
  activities: Record<Weekday, QisActivity>;
};

export type QisContent = {
  periodStart: string;
  periodEnd: string;
  responsible: string;
  rows: QisScheduleRow[];
};

export type QisPublishedVersion = {
  version: number;
  publishedAt: string;
  signedPdfName: string;
  content: QisContent;
};

export type QisSchedule = {
  id: string;
  status: QisStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  content: QisContent;
  publishedVersions: QisPublishedVersion[];
};
