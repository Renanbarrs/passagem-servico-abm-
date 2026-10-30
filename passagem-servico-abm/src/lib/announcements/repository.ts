import type { Announcement } from "@/lib/announcements/types";

const storageKey = "portal-abm:announcements:v1";

export interface AnnouncementRepository {
  list(): Promise<Announcement[]>;
  save(announcement: Announcement): Promise<void>;
  remove(id: string): Promise<void>;
}

export class LocalStorageAnnouncementRepository
  implements AnnouncementRepository
{
  async list() {
    const raw = this.getStorage().getItem(storageKey);
    if (raw === null) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        "Os dados locais do mural estão inválidos. Os registros existentes foram mantidos.",
      );
    }

    if (!Array.isArray(parsed) || !parsed.every(isAnnouncement)) {
      throw new Error(
        "O formato dos avisos locais não é compatível com esta versão. Os registros existentes foram mantidos.",
      );
    }

    return parsed;
  }

  async save(announcement: Announcement) {
    const announcements = await this.list();
    const nextAnnouncements = announcements.filter(
      (item) => item.id !== announcement.id,
    );
    nextAnnouncements.push(announcement);
    this.writeAll(nextAnnouncements);
  }

  async remove(id: string) {
    const announcements = await this.list();
    this.writeAll(announcements.filter((item) => item.id !== id));
  }

  private writeAll(announcements: Announcement[]) {
    this.getStorage().setItem(storageKey, JSON.stringify(announcements));
  }

  private getStorage() {
    if (typeof window === "undefined") {
      throw new Error("O armazenamento local só está disponível no navegador.");
    }

    try {
      return window.localStorage;
    } catch {
      throw new Error(
        "O navegador não permitiu acessar o armazenamento local do mural.",
      );
    }
  }
}

function isAnnouncement(value: unknown): value is Announcement {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    (value.type === "aviso" || value.type === "determinacao") &&
    isAnnouncementCategory(value.category) &&
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    typeof value.author === "string" &&
    typeof value.publishedAt === "string" &&
    typeof value.expiresAt === "string" &&
    typeof value.pinned === "boolean" &&
    typeof value.createdBy === "string" &&
    typeof value.attachmentName === "string"
  );
}

function isAnnouncementCategory(
  value: unknown,
): value is Announcement["category"] {
  return (
    value === "Informativo" ||
    value === "Administrativo" ||
    value === "Atividade" ||
    value === "Outros"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
