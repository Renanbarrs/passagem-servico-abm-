export const announcementCategories = [
  "Informativo",
  "Administrativo",
  "Atividade",
  "Outros",
] as const;

export type AnnouncementCategory =
  (typeof announcementCategories)[number];
export type AnnouncementType = "aviso" | "determinacao";

export type Announcement = {
  id: string;
  type: AnnouncementType;
  category: AnnouncementCategory;
  title: string;
  body: string;
  author: string;
  publishedAt: string;
  expiresAt: string;
  pinned: boolean;
  createdBy: string;
  attachmentName: string;
};
