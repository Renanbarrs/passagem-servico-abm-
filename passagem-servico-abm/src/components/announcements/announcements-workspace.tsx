"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import ParticipantSearch from "@/components/participant-search";
import {
  isRegisteredMilitaryName,
  militaryOptions,
} from "@/data/participant-options";
import {
  announcementCategories,
  type Announcement,
  type AnnouncementCategory,
  type AnnouncementType,
} from "@/lib/announcements/types";
import { LocalStorageAnnouncementRepository } from "@/lib/announcements/repository";

type AnnouncementDraft = {
  type: AnnouncementType;
  category: AnnouncementCategory;
  title: string;
  body: string;
  author: string;
  expiresAt: string;
  attachmentName: string;
};

type TypeFilter = "todos" | AnnouncementType;
type DraftErrors = Partial<
  Record<"author" | "title" | "body" | "expiresAt", string>
>;

const currentDemoAuthor = "Usuário de demonstração";
const repository = new LocalStorageAnnouncementRepository();
const emptyDraft: AnnouncementDraft = {
  type: "aviso",
  category: "Informativo",
  title: "",
  body: "",
  author: "",
  expiresAt: "",
  attachmentName: "",
};

export default function AnnouncementsWorkspace() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("todos");
  const [draft, setDraft] = useState<AnnouncementDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let active = true;
    repository
      .list()
      .then((items) => {
        if (active) setAnnouncements(items);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar o mural local.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleAnnouncements = useMemo(() => {
    const query = normalizeSearch(search);

    return [...announcements]
      .filter(
        (announcement) =>
          typeFilter === "todos" || announcement.type === typeFilter,
      )
      .filter((announcement) => {
        if (!query) return true;
        const searchableText = normalizeSearch(
          [
            announcement.title,
            announcement.body,
            announcement.category,
            announcement.author,
          ].join(" "),
        );
        return searchableText.includes(query);
      })
      .sort((first, second) => {
        if (first.pinned !== second.pinned) {
          return Number(second.pinned) - Number(first.pinned);
        }
        return (
          new Date(second.publishedAt).getTime() -
          new Date(first.publishedAt).getTime()
        );
      });
  }, [announcements, search, typeFilter]);

  function openCreateForm() {
    setDraft({ ...emptyDraft });
    setEditingId(null);
    setErrors({});
    setError("");
    setFeedback("");
    setFormOpen(true);
  }

  function startEditing(announcement: Announcement) {
    setDraft({
      type: announcement.type,
      category: announcement.category,
      title: announcement.title,
      body: announcement.body,
      author: announcement.author,
      expiresAt: announcement.expiresAt,
      attachmentName: announcement.attachmentName,
    });
    setEditingId(announcement.id);
    setErrors({});
    setError("");
    setFeedback("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setDraft({ ...emptyDraft });
    setErrors({});
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const existingAnnouncement = announcements.find(
      (announcement) => announcement.id === editingId,
    );
    const announcement: Announcement = {
      id: existingAnnouncement?.id ?? crypto.randomUUID(),
      type: draft.type,
      category: draft.category,
      title: draft.title.trim(),
      body: draft.body.trim(),
      author: draft.author.trim(),
      publishedAt: existingAnnouncement?.publishedAt ?? new Date().toISOString(),
      expiresAt: draft.expiresAt,
      pinned: existingAnnouncement?.pinned ?? false,
      createdBy: existingAnnouncement?.createdBy ?? currentDemoAuthor,
      attachmentName: draft.attachmentName,
    };

    setSaving(true);
    setError("");
    setFeedback("");
    try {
      await repository.save(announcement);
      setAnnouncements((current) => [
        announcement,
        ...current.filter((item) => item.id !== announcement.id),
      ]);
      closeForm();
      setFeedback(
        existingAnnouncement
          ? "Publicação atualizada neste navegador."
          : "Publicação criada neste navegador.",
      );
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar a publicação.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePinned(announcement: Announcement) {
    const updated = { ...announcement, pinned: !announcement.pinned };
    setError("");
    setFeedback("");

    try {
      await repository.save(updated);
      setAnnouncements((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setFeedback(
        updated.pinned
          ? "Publicação fixada no topo do mural."
          : "Publicação removida do topo do mural.",
      );
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar a publicação.",
      );
    }
  }

  async function deleteAnnouncement(announcement: Announcement) {
    if (announcement.createdBy !== currentDemoAuthor) return;
    setError("");
    setFeedback("");

    try {
      await repository.remove(announcement.id);
      setAnnouncements((current) =>
        current.filter((item) => item.id !== announcement.id),
      );
      setFeedback("Publicação removida deste navegador.");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível remover a publicação.",
      );
    }
  }

  function handleAttachment(file: File | undefined) {
    if (!file) {
      setDraft((current) => ({ ...current, attachmentName: "" }));
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Selecione um PDF, JPG ou PNG fictício para a demonstração.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("O arquivo de demonstração deve ter no máximo 5 MB.");
      return;
    }

    setError("");
    setDraft((current) => ({ ...current, attachmentName: file.name }));
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <p className="text-sm font-bold text-amber-950">
          Mural demonstrativo — dados locais e fictícios
        </p>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          Qualquer pessoa pode testar a publicação de avisos e determinações
          neste protótipo. Não há login, controle de acesso ou banco; anexos
          não são enviados nem armazenados. Não publique conteúdo oficial ou
          informações reais.
        </p>
      </section>

      {error ? <Message kind="error">{error}</Message> : null}
      {feedback ? <Message kind="success">{feedback}</Message> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <label
              className="text-xs font-bold uppercase tracking-wide text-slate-600"
              htmlFor="announcement-search"
            >
              Pesquisar no mural
            </label>
            <input
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              id="announcement-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título, texto, categoria ou autor"
              type="search"
              value={search}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-44 text-xs font-bold uppercase tracking-wide text-slate-600">
              Tipo
              <select
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                onChange={(event) =>
                  setTypeFilter(event.target.value as TypeFilter)
                }
                value={typeFilter}
              >
                <option value="todos">Todos</option>
                <option value="aviso">Avisos</option>
                <option value="determinacao">Determinações</option>
              </select>
            </label>
            <button
              className="min-h-11 rounded-xl bg-[#356cf0] px-4 text-sm font-bold text-white hover:bg-[#245bde] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              onClick={openCreateForm}
              type="button"
            >
              + Nova publicação
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Publicações fixadas aparecem primeiro; as demais ficam em ordem da
          mais recente para a mais antiga.
        </p>
      </section>

      {formOpen ? (
        <AnnouncementForm
          draft={draft}
          editing={editingId !== null}
          errors={errors}
          onAttachment={handleAttachment}
          onCancel={closeForm}
          onChange={setDraft}
          onSubmit={submitForm}
          saving={saving}
        />
      ) : null}

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Carregando publicações locais...
        </p>
      ) : visibleAnnouncements.length > 0 ? (
        <section aria-label="Publicações do mural" className="space-y-4">
          {visibleAnnouncements.map((announcement) => (
            <AnnouncementCard
              announcement={announcement}
              canManage={announcement.createdBy === currentDemoAuthor}
              key={announcement.id}
              onDelete={() => deleteAnnouncement(announcement)}
              onEdit={() => startEditing(announcement)}
              onTogglePinned={() => togglePinned(announcement)}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          hasFilters={Boolean(search) || typeFilter !== "todos"}
          onCreate={openCreateForm}
        />
      )}
    </div>
  );
}

function AnnouncementForm({
  draft,
  editing,
  errors,
  onAttachment,
  onCancel,
  onChange,
  onSubmit,
  saving,
}: {
  draft: AnnouncementDraft;
  editing: boolean;
  errors: DraftErrors;
  onAttachment: (file: File | undefined) => void;
  onCancel: () => void;
  onChange: (draft: AnnouncementDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  return (
    <section
      aria-labelledby="announcement-form-title"
      className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="mb-5">
        <h2
          className="text-lg font-bold text-[#17233a]"
          id="announcement-form-title"
        >
          {editing ? "Editar publicação" : "Nova publicação"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          O mesmo formulário permite criar Aviso ou Determinação oficial.
        </p>
      </div>
      <form className="space-y-4" noValidate onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700">
            Tipo
            <select
              className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              onChange={(event) =>
                onChange({
                  ...draft,
                  type: event.target.value as AnnouncementType,
                })
              }
              value={draft.type}
            >
              <option value="aviso">Aviso</option>
              <option value="determinacao">Determinação oficial</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Categoria
            <select
              className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              onChange={(event) =>
                onChange({
                  ...draft,
                  category: event.target.value as AnnouncementCategory,
                })
              }
              value={draft.category}
            >
              {announcementCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-xs font-semibold text-slate-700">
          Título
          <input
            aria-describedby={errors.title ? "announcement-title-error" : undefined}
            aria-invalid={Boolean(errors.title)}
            className={`mt-1.5 min-h-11 w-full rounded-lg border px-3 text-sm font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
              errors.title ? "border-red-500" : "border-slate-300"
            }`}
            maxLength={120}
            onChange={(event) =>
              onChange({ ...draft, title: event.target.value })
            }
            value={draft.title}
          />
          {errors.title ? (
            <span className="mt-1 block text-xs text-red-700" id="announcement-title-error">
              {errors.title}
            </span>
          ) : null}
        </label>

        <label className="block text-xs font-semibold text-slate-700">
          Texto
          <textarea
            aria-describedby={errors.body ? "announcement-body-error" : undefined}
            aria-invalid={Boolean(errors.body)}
            className={`mt-1.5 min-h-32 w-full rounded-lg border px-3 py-2 text-sm font-normal leading-6 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
              errors.body ? "border-red-500" : "border-slate-300"
            }`}
            maxLength={5000}
            onChange={(event) =>
              onChange({ ...draft, body: event.target.value })
            }
            value={draft.body}
          />
          {errors.body ? (
            <span className="mt-1 block text-xs text-red-700" id="announcement-body-error">
              {errors.body}
            </span>
          ) : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <ParticipantSearch
              error={errors.author}
              hint="Busque e selecione o militar da ABM responsável pela publicação."
              id="announcement-author"
              label="Responsável pela publicação"
              onChange={(author) => onChange({ ...draft, author })}
              options={militaryOptions}
              selectionRequired
              value={draft.author}
            />
          </div>
          <label className="block text-xs font-semibold text-slate-700">
            Validade (opcional)
            <input
              aria-describedby={
                errors.expiresAt ? "announcement-expiry-error" : undefined
              }
              aria-invalid={Boolean(errors.expiresAt)}
              className={`mt-1.5 min-h-11 w-full rounded-lg border px-3 text-sm font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                errors.expiresAt ? "border-red-500" : "border-slate-300"
              }`}
              onChange={(event) =>
                onChange({ ...draft, expiresAt: event.target.value })
              }
              type="date"
              value={draft.expiresAt}
            />
            {errors.expiresAt ? (
              <span className="mt-1 block text-xs text-red-700" id="announcement-expiry-error">
                {errors.expiresAt}
              </span>
            ) : null}
          </label>
        </div>

        <label className="block text-xs font-semibold text-slate-700">
          Anexo opcional (somente seleção local)
          <input
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="mt-1.5 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            onChange={(event) => onAttachment(event.target.files?.[0])}
            type="file"
          />
          <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
            O navegador valida apenas nome, tipo declarado e tamanho (até 5
            MB). O conteúdo não é enviado, não fica acessível como anexo e o
            nome selecionado é apenas um metadado demonstrativo.
          </span>
          {draft.attachmentName ? (
            <span className="mt-1 block text-xs text-slate-600">
              Selecionado: {draft.attachmentName}
            </span>
          ) : null}
        </label>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="min-h-11 rounded-lg bg-[#356cf0] px-5 text-sm font-bold text-white hover:bg-[#245bde] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? "Salvando..." : editing ? "Salvar alterações" : "Publicar"}
          </button>
        </div>
      </form>
    </section>
  );
}

function AnnouncementCard({
  announcement,
  canManage,
  onDelete,
  onEdit,
  onTogglePinned,
}: {
  announcement: Announcement;
  canManage: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onTogglePinned: () => void;
}) {
  const isExpired =
    Boolean(announcement.expiresAt) &&
    announcement.expiresAt < formatDateInput(new Date());

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${
        announcement.pinned
          ? "border-blue-200 ring-1 ring-blue-100"
          : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            announcement.type === "determinacao"
              ? "bg-violet-100 text-violet-900"
              : "bg-blue-100 text-blue-900"
          }`}
        >
          {announcement.type === "determinacao"
            ? "Determinação oficial"
            : "Aviso"}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
          {announcement.category}
        </span>
        {announcement.pinned ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-900">
            Fixado
          </span>
        ) : null}
        {isExpired ? (
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
            Validade encerrada
          </span>
        ) : null}
      </div>

      <h2 className="mt-3 text-lg font-bold leading-6 text-[#17233a]">
        {announcement.title}
      </h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
        {announcement.body}
      </p>

      {announcement.attachmentName ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Nome de anexo informado na demonstração:{" "}
          <span className="font-semibold">{announcement.attachmentName}</span>.
          O arquivo não foi armazenado.
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-xs leading-5 text-slate-500">
          <p>
            Por <span className="font-semibold text-slate-700">{announcement.author}</span>
          </p>
          <p>
            Publicado em {formatDateTime(announcement.publishedAt)}
            {announcement.expiresAt
              ? ` · Validade: ${formatDate(announcement.expiresAt)}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            aria-pressed={announcement.pinned}
            className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            onClick={onTogglePinned}
            type="button"
          >
            {announcement.pinned ? "Desafixar" : "Fixar"}
          </button>
          {canManage ? (
            <>
              <button
                className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-[#245bde] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                onClick={onEdit}
                type="button"
              >
                Editar
              </button>
              <button
                className="min-h-9 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                onClick={onDelete}
                type="button"
              >
                Excluir
              </button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EmptyState({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean;
  onCreate: () => void;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
      <h2 className="font-bold text-[#17233a]">
        {hasFilters ? "Nenhum resultado encontrado" : "O mural está vazio"}
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
        {hasFilters
          ? "Tente outro termo de busca ou altere o filtro de tipo."
          : "Ainda não há publicações neste navegador. Crie uma publicação fictícia para testar o mural."}
      </p>
      {!hasFilters ? (
        <button
          className="mt-4 min-h-10 rounded-lg bg-[#356cf0] px-4 text-sm font-bold text-white hover:bg-[#245bde] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          onClick={onCreate}
          type="button"
        >
          Criar publicação
        </button>
      ) : null}
    </section>
  );
}

function Message({
  children,
  kind,
}: {
  children: string;
  kind: "error" | "success";
}) {
  return (
    <p
      className={`rounded-xl border px-4 py-3 text-sm ${
        kind === "error"
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

function validateDraft(draft: AnnouncementDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!isRegisteredMilitaryName(draft.author)) {
    errors.author = "Selecione um militar cadastrado na lista.";
  }
  if (!draft.title.trim()) errors.title = "Informe um título.";
  if (!draft.body.trim()) errors.body = "Informe o texto da publicação.";
  if (
    draft.expiresAt &&
    (!isDate(draft.expiresAt) || draft.expiresAt < formatDateInput(new Date()))
  ) {
    errors.expiresAt = "A validade não pode ser anterior à data de hoje.";
  }
  return errors;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function formatDate(value: string) {
  if (!isDate(value)) return "Data inválida";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
