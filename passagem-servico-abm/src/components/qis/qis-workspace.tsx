"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ParticipantSearch from "@/components/participant-search";
import { militaryOptions } from "@/data/participant-options";
import {
  createActivityRow,
  createStandardContent,
  LocalStorageQisRepository,
} from "@/lib/qis/repository";
import {
  createPublishedQisVersion,
  validateQisPeriod,
  validateQisResponsibleName,
  validateQisForPublication,
} from "@/lib/qis/rules";
import {
  getQisWeekForDate,
  isQisWeekPeriod,
} from "@/lib/qis/date-utils";
import { qisActivitySuggestions } from "@/lib/qis/suggestions";
import {
  weekdays,
  type QisActivity,
  type QisContent,
  type QisSchedule,
  type QisScheduleRow,
  type Weekday,
} from "@/lib/qis/types";

type DemoRole = "user" | "admin";
type ActivityField = keyof QisActivity;
const calendarWeekdays = [
  { short: "D", full: "domingo" },
  { short: "S", full: "segunda-feira" },
  { short: "T", full: "terça-feira" },
  { short: "Q", full: "quarta-feira" },
  { short: "Q", full: "quinta-feira" },
  { short: "S", full: "sexta-feira" },
  { short: "S", full: "sábado" },
] as const;
const repository = new LocalStorageQisRepository();

export default function QisWorkspace() {
  const [schedules, setSchedules] = useState<QisSchedule[]>([]);
  const [unsavedDraft, setUnsavedDraft] = useState<QisSchedule | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [role, setRole] = useState<DemoRole>("user");
  const [editingContent, setEditingContent] = useState<QisContent | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState("");
  const [signedPdfName, setSignedPdfName] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [conflictingScheduleId, setConflictingScheduleId] = useState("");

  useEffect(() => {
    let active = true;

    repository
      .list()
      .then((items) => {
        if (!active) return;
        setSchedules(items);
        setSelectedId(
          items.find((item) => item.publishedVersions.length > 0)?.id ??
            items[0]?.id ??
            "",
        );
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar os QIS locais.",
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

  const selectedSchedule =
    schedules.find((item) => item.id === selectedId) ??
    (unsavedDraft?.id === selectedId ? unsavedDraft : undefined);
  const conflictingSchedule = schedules.find(
    (item) => item.id === conflictingScheduleId,
  );
  const latestVersion = selectedSchedule?.publishedVersions.reduce<
    (typeof selectedSchedule.publishedVersions)[number] | null
  >(
    (latest, version) =>
      !latest || version.version > latest.version ? version : latest,
    null,
  );
  const displayedVersion = useMemo(
    () =>
      selectedSchedule?.publishedVersions.find(
        (version) => version.version === selectedVersion,
      ) ?? null,
    [selectedSchedule, selectedVersion],
  );
  const isEditing =
    Boolean(editingContent) && editingScheduleId === selectedSchedule?.id;
  const visibleSchedules =
    role === "admin"
      ? schedules
      : schedules.filter((schedule) => schedule.publishedVersions.length > 0);
  const adminSchedules = unsavedDraft
    ? [...schedules, unsavedDraft]
    : schedules;

  const displayedContent =
    displayedVersion?.content ??
    (role === "admin" && selectedSchedule?.status === "draft"
      ? selectedSchedule.content
      : latestVersion?.content);

  async function persist(schedule: QisSchedule, message: string) {
    setSaving(true);
    setError("");
    setFeedback("");

    try {
      await repository.save(schedule);
      setSchedules((current) => {
        const alreadyExists = current.some((item) => item.id === schedule.id);
        return alreadyExists
          ? current.map((item) => (item.id === schedule.id ? schedule : item))
          : [...current, schedule];
      });
      setUnsavedDraft((current) =>
        current?.id === schedule.id ? null : current,
      );
      setFeedback(message);
      return true;
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar as alterações locais.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  function updateEditingContent(
    update: (current: QisContent) => QisContent,
  ) {
    setEditingContent((current) => (current ? update(current) : current));
  }

  function updateRow(rowId: string, update: (row: QisScheduleRow) => QisScheduleRow) {
    updateEditingContent((content) => ({
      ...content,
      rows: content.rows.map((row) =>
        row.id === rowId ? update(row) : row,
      ),
    }));
  }

  function updateActivity(
    rowId: string,
    weekday: Weekday,
    field: ActivityField,
    value: string,
  ) {
    updateRow(rowId, (row) => ({
      ...row,
      activities: {
        ...row.activities,
        [weekday]: { ...row.activities[weekday], [field]: value },
      },
    }));
  }

  function beginEditing(schedule: QisSchedule) {
    const latestPublishedVersion = schedule.publishedVersions.reduce<
      QisSchedule["publishedVersions"][number] | null
    >(
      (latest, version) =>
        !latest || version.version > latest.version ? version : latest,
      null,
    );
    setError("");
    setFeedback("");
    setConflictingScheduleId("");
    setUnsavedDraft(null);
    setSelectedId(schedule.id);
    setSelectedVersion(null);
    setEditingScheduleId(schedule.id);
    setEditingContent(
      schedule.status === "published" && latestPublishedVersion
        ? structuredClone(latestPublishedVersion.content)
        : structuredClone(schedule.content),
    );
    setSignedPdfName("");
  }

  function createDraft() {
    const now = new Date().toISOString();
    const draft: QisSchedule = {
      id: crypto.randomUUID(),
      status: "draft",
      version: 0,
      createdAt: now,
      updatedAt: now,
      content: createStandardContent(),
      publishedVersions: [],
    };
    setUnsavedDraft(draft);
    setSelectedId(draft.id);
    setEditingScheduleId(draft.id);
    setEditingContent(draft.content);
    setSelectedVersion(null);
    setSignedPdfName("");
    setConflictingScheduleId(
      findScheduleForPeriod(schedules, draft.content)?.id ?? "",
    );
    setError("");
    setFeedback(
      "Rascunho iniciado. Ele será salvo neste navegador ao salvar ou simular a publicação.",
    );
  }

  async function saveDraft() {
    if (!selectedSchedule || !editingContent) return;

    const periodError = validateQisPeriod(editingContent);
    if (periodError) {
      setError(periodError);
      setFeedback("");
      return;
    }

    const responsibleError = validateQisResponsibleName(
      editingContent.responsible,
    );
    if (responsibleError) {
      setError(responsibleError);
      setFeedback("");
      return;
    }

    const duplicate = findScheduleForPeriod(
      schedules,
      editingContent,
      selectedSchedule.id,
    );
    if (duplicate) {
      setConflictingScheduleId(duplicate.id);
      setError("");
      setFeedback("");
      return;
    }

    const updatedSchedule: QisSchedule = {
      ...selectedSchedule,
      status: "draft",
      content: editingContent,
      updatedAt: new Date().toISOString(),
    };
    if (await persist(updatedSchedule, "Rascunho salvo neste navegador.")) {
      setEditingScheduleId("");
      setEditingContent(null);
    }
  }

  async function publishDraft() {
    if (!selectedSchedule || !editingContent) return;
    const validationMessage = validateQisForPublication(
      editingContent,
      signedPdfName,
    );

    if (validationMessage) {
      setError(validationMessage);
      setFeedback("");
      return;
    }

    const duplicate = findScheduleForPeriod(
      schedules,
      editingContent,
      selectedSchedule.id,
    );
    if (duplicate) {
      setConflictingScheduleId(duplicate.id);
      setError("");
      setFeedback("");
      return;
    }

    const updatedSchedule = createPublishedQisVersion(
      selectedSchedule,
      editingContent,
      signedPdfName,
    );
    const newVersion = updatedSchedule.version;

    if (
      await persist(
        updatedSchedule,
        `Versão ${newVersion} publicada apenas nesta demonstração.`,
      )
    ) {
      setEditingScheduleId("");
      setEditingContent(null);
      setSelectedVersion(newVersion);
      setSignedPdfName("");
    }
  }

  function cancelEditing() {
    const wasUnsavedDraft = unsavedDraft?.id === editingScheduleId;
    setEditingScheduleId("");
    setEditingContent(null);
    setConflictingScheduleId("");
    if (wasUnsavedDraft) {
      setUnsavedDraft(null);
      setSelectedId(schedules[0]?.id ?? "");
    }
    setSignedPdfName("");
    setError("");
    setFeedback("");
  }

  function selectSchedule(id: string) {
    setUnsavedDraft(null);
    setSelectedId(id);
    setSelectedVersion(null);
    setEditingContent(null);
    setEditingScheduleId("");
    setError("");
    setFeedback("");
    setConflictingScheduleId("");
  }

  function changeRole(nextRole: DemoRole) {
    setRole(nextRole);
    setConflictingScheduleId("");
    setError("");
    setFeedback("");

    if (nextRole === "user") {
      const firstPublished = schedules.find(
        (schedule) => schedule.publishedVersions.length > 0,
      );
      setSelectedId(firstPublished?.id ?? "");
      setSelectedVersion(null);
    } else if (!schedules.some((schedule) => schedule.id === selectedId)) {
      setSelectedId(schedules[0]?.id ?? "");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <p className="text-sm font-bold text-amber-950">
          Protótipo local — sem autenticação ou publicação oficial
        </p>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          A alternância abaixo serve apenas para testar as telas. Qualquer
          pessoa com acesso ao navegador pode escolher a simulação de
          administrador. Os rascunhos e versões ficam no armazenamento local
          deste navegador; não há banco conectado.
        </p>
        <fieldset className="mt-4">
          <legend className="text-xs font-bold uppercase tracking-wide text-amber-950">
            Simulação de perfil
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <RoleOption
              checked={role === "user"}
              disabled={isEditing || saving}
              label="Usuário da ABM — consulta"
              onChange={() => changeRole("user")}
            />
            <RoleOption
              checked={role === "admin"}
              disabled={isEditing || saving}
              label="Administrador — demonstração"
              onChange={() => changeRole("admin")}
            />
          </div>
        </fieldset>
      </section>

      {error ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {feedback ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          {feedback}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Carregando QIS locais...
        </p>
      ) : (
        <>
          {role === "admin" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  <label
                    className="text-xs font-bold uppercase tracking-wide text-slate-600"
                    htmlFor="qis-record"
                  >
                    Rascunhos e QIS
                  </label>
                  <select
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    disabled={isEditing}
                    id="qis-record"
                    onChange={(event) => selectSchedule(event.target.value)}
                    value={selectedSchedule?.id ?? ""}
                  >
                    {adminSchedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {formatWeekPeriod(schedule.content)} ·{" "}
                        {schedule.status === "draft"
                          ? "Rascunho"
                          : `Publicado — v${schedule.version}`}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="min-h-11 rounded-xl bg-[#172f58] px-4 text-sm font-bold text-white hover:bg-[#244779] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving || isEditing}
                  onClick={createDraft}
                  type="button"
                >
                  Criar rascunho
                </button>
              </div>
              {selectedSchedule ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedSchedule.status} />
                  <span className="text-xs text-slate-600">
                    {selectedSchedule.publishedVersions.length} versão(ões)
                    publicada(s) neste navegador
                  </span>
                  {!isEditing ? (
                    <button
                      className="ml-auto min-h-10 rounded-lg border border-[#356cf0] px-3 text-xs font-bold text-[#245bde] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                      onClick={() => beginEditing(selectedSchedule)}
                      type="button"
                    >
                      {selectedSchedule.status === "published"
                        ? "Criar nova revisão"
                        : "Editar rascunho"}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {role === "user" && visibleSchedules.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <label
                className="text-xs font-bold uppercase tracking-wide text-slate-600"
                htmlFor="qis-published-record"
              >
                QIS publicados disponíveis
              </label>
              <select
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                id="qis-published-record"
                onChange={(event) => selectSchedule(event.target.value)}
                value={selectedSchedule?.id ?? ""}
              >
                {visibleSchedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {formatWeekPeriod(
                      getLatestPublishedContent(schedule) ??
                        schedule.content,
                    )}{" "}
                    · versão{" "}
                    {schedule.version}
                  </option>
                ))}
              </select>
            </section>
          ) : null}

          {isEditing && selectedSchedule && editingContent ? (
            <QisEditor
              conflictingSchedule={conflictingSchedule ?? null}
              content={editingContent}
              onChooseAnotherWeek={() => setConflictingScheduleId("")}
              onEditConflictingSchedule={(schedule) => beginEditing(schedule)}
              onAddRow={(index) =>
                updateEditingContent((content) => {
                  const rows = [...content.rows];
                  rows.splice(index, 0, createActivityRow());
                  return { ...content, rows };
                })
              }
              onChangeActivity={updateActivity}
              onChangeContent={updateEditingContent}
              onSelectPeriod={(date) => {
                const week = getQisWeekForDate(date);
                if (!week) return false;
                const duplicate = findScheduleForPeriod(
                  schedules,
                  {
                    periodStart: week.start,
                    periodEnd: week.end,
                  },
                  editingScheduleId,
                );
                if (duplicate) {
                  setConflictingScheduleId(duplicate.id);
                  setError("");
                  setFeedback("");
                  return false;
                }

                setConflictingScheduleId("");
                updateEditingContent((current) => ({
                  ...current,
                  periodStart: week.start,
                  periodEnd: week.end,
                }));
                return true;
              }}
              onChangeRow={(rowId, update) =>
                updateRow(rowId, update)
              }
              onCancel={cancelEditing}
              onMoveRow={(rowId, direction) =>
                updateEditingContent((content) => {
                  const index = content.rows.findIndex(
                    (row) => row.id === rowId,
                  );
                  const nextIndex = index + direction;
                  if (nextIndex < 0 || nextIndex >= content.rows.length) {
                    return content;
                  }
                  const rows = [...content.rows];
                  [rows[index], rows[nextIndex]] = [
                    rows[nextIndex],
                    rows[index],
                  ];
                  return { ...content, rows };
                })
              }
              onPublish={publishDraft}
              onRemoveRow={(rowId) =>
                updateEditingContent((content) => ({
                  ...content,
                  rows: content.rows.filter((row) => row.id !== rowId),
                }))
              }
              onSave={saveDraft}
              onChangePdfName={setSignedPdfName}
              pdfName={signedPdfName}
              saving={saving}
            />
          ) : (
            <PublishedView
              content={displayedContent}
              isAdmin={role === "admin"}
              latestVersion={latestVersion}
              schedule={selectedSchedule}
              selectedVersion={displayedVersion?.version ?? null}
              onSelectVersion={setSelectedVersion}
            />
          )}
        </>
      )}
    </div>
  );
}

function QisWeekCalendar({
  isOpen,
  onOpenChange,
  onSelectDate,
  periodEnd,
  periodStart,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDate: (date: string) => boolean;
  periodEnd: string;
  periodStart: string;
}) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(parseCalendarDate(periodStart) ?? new Date()),
  );
  const monthName = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
  }).format(visibleMonth);
  const monthLabel = `${monthName.charAt(0).toLocaleUpperCase("pt-BR")}${monthName.slice(1)} de ${visibleMonth.getFullYear()}`;
  const calendarDates = getCalendarDates(visibleMonth);
  const selectedWeekIsValid = isQisWeekPeriod(periodStart, periodEnd);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !calendarRef.current?.contains(event.target)
      ) {
        onOpenChange(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  function changeMonth(amount: number) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  }

  function selectDate(date: Date) {
    const value = toCalendarDateInput(date);
    setVisibleMonth(startOfMonth(date));
    if (!onSelectDate(value)) {
      triggerRef.current?.focus();
      return;
    }
    onOpenChange(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="relative z-20" ref={calendarRef}>
      <div>
        <span className="block text-xs font-semibold text-slate-700">
          Período do QIS
        </span>
        <button
          aria-controls="qis-week-calendar"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="mt-1.5 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 text-left text-sm font-normal text-slate-900 hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          id="qis-week-calendar-trigger"
          onClick={() => onOpenChange(!isOpen)}
          ref={triggerRef}
          type="button"
        >
          <span>
            {selectedWeekIsValid
              ? `${formatDate(periodStart)} a ${formatDate(periodEnd)}`
              : "Selecione uma semana"}
          </span>
          <svg
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M7 10l5 5 5-5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </button>
      </div>

      {isOpen ? (
        <section
          aria-label="Calendário para selecionar a semana do QIS"
          className="absolute left-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:p-4"
          id="qis-week-calendar"
          role="dialog"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-bold text-[#17233a]">
                Selecione uma semana
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Clique em qualquer dia do calendário.
              </p>
            </div>
            <div className="flex items-center gap-1">
          <CalendarMonthButton
            label="Mês anterior"
            onClick={() => changeMonth(-1)}
          >
            ‹
          </CalendarMonthButton>
          <CalendarMonthButton
            label="Próximo mês"
            onClick={() => changeMonth(1)}
          >
            ›
          </CalendarMonthButton>
        </div>
          </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
        <div className="mb-3 flex items-center justify-center">
          <p
            aria-live="polite"
            className="text-sm font-bold text-slate-800"
          >
            {monthLabel}
          </p>
        </div>

        <div
          aria-label="Calendário mensal"
          className="grid grid-cols-7"
        >
          {calendarWeekdays.map((weekday, index) => (
            <div
              aria-label={weekday.full}
              className="flex h-7 items-center justify-center text-[10px] font-bold uppercase text-slate-500 sm:text-xs"
              key={`${weekday.full}-${index}`}
            >
              {weekday.short}
            </div>
          ))}
          {calendarDates.map((date) => {
            const dateValue = toCalendarDateInput(date);
            const isCurrentMonth =
              date.getMonth() === visibleMonth.getMonth();
            const isSelected = dateValue === periodStart;
            const isWeekday = date.getDay() >= 1 && date.getDay() <= 5;
            const isInSelectedWeek =
              selectedWeekIsValid &&
              isWeekday &&
              dateValue >= periodStart &&
              dateValue <= periodEnd;
            const isToday = dateValue === toCalendarDateInput(new Date());
            const accessibleDate = new Intl.DateTimeFormat("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(date);
            const rangeEdge =
              date.getDay() === 1
                ? "rounded-l-full"
                : date.getDay() === 5
                  ? "rounded-r-full"
                  : "";

            return (
              <button
                aria-label={accessibleDate}
                aria-pressed={isSelected}
                className={`relative flex h-9 w-full items-center justify-center text-xs transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600 sm:h-10 sm:text-sm ${
                  isSelected
                    ? "z-[1] rounded-full bg-[#356cf0] font-bold text-white shadow-sm"
                    : isInSelectedWeek
                      ? `${rangeEdge} bg-blue-50 font-semibold text-[#214d9c] hover:bg-blue-100`
                      : `rounded-full font-medium hover:bg-slate-100 ${
                          isCurrentMonth ? "text-slate-700" : "text-slate-400"
                        }`
                } ${
                  isToday && !isSelected
                    ? "ring-1 ring-inset ring-[#356cf0]"
                    : ""
                }`}
                key={dateValue}
                onClick={() => selectDate(date)}
                type="button"
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <div
        aria-live="polite"
        className="mt-2 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-2.5 py-2"
      >
        <span
          aria-hidden="true"
          className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-[#356cf0]"
        />
        <p className="text-xs leading-5 text-blue-950">
          {selectedWeekIsValid
            ? `Semana selecionada: ${formatDate(periodStart)} a ${formatDate(periodEnd)}.`
            : "Selecione um dia para definir o período de segunda a sexta-feira."}
        </p>
      </div>
        </section>
      ) : null}
    </div>
  );
}

function CalendarMonthButton({
  children,
  label,
  onClick,
}: {
  children: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-lg leading-none text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function getCalendarDates(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = firstDay.getDay();
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(1 - offset + index);
    return date;
  });
}

function parseCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (toCalendarDateInput(date) !== value) return null;
  return date;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toCalendarDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function findScheduleForPeriod(
  schedules: QisSchedule[],
  content: Pick<QisContent, "periodStart" | "periodEnd">,
  excludedScheduleId = "",
) {
  if (!isQisWeekPeriod(content.periodStart, content.periodEnd)) return null;

  return (
    schedules.find((schedule) => {
      if (schedule.id === excludedScheduleId) return false;
      const savedPeriods = [
        schedule.content,
        ...schedule.publishedVersions.map((version) => version.content),
      ];
      return savedPeriods.some(
        (savedContent) =>
          savedContent.periodStart === content.periodStart &&
          savedContent.periodEnd === content.periodEnd,
      );
    }) ?? null
  );
}

function getLatestPublishedContent(schedule: QisSchedule) {
  const latest = schedule.publishedVersions.reduce<
    QisSchedule["publishedVersions"][number] | null
  >(
    (latest, version) =>
      !latest || version.version > latest.version ? version : latest,
    null,
  );
  return latest?.content ?? null;
}

function formatWeekPeriod(
  content: Pick<QisContent, "periodStart" | "periodEnd">,
) {
  return `${formatDate(content.periodStart)} a ${formatDate(content.periodEnd)}`;
}

function RoleOption({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className={`inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-slate-800 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <input
        checked={checked}
        className="accent-[#356cf0]"
        disabled={disabled}
        name="qis-demo-role"
        onChange={onChange}
        type="radio"
      />
      {label}
    </label>
  );
}

function StatusBadge({ status }: { status: QisSchedule["status"] }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        status === "published"
          ? "bg-emerald-100 text-emerald-900"
          : "bg-slate-100 text-slate-700"
      }`}
    >
      {status === "published" ? "Publicado na demonstração" : "Rascunho"}
    </span>
  );
}

function QisEditor({
  conflictingSchedule,
  content,
  onAddRow,
  onChangeActivity,
  onChangeContent,
  onChangePdfName,
  onChangeRow,
  onCancel,
  onChooseAnotherWeek,
  onEditConflictingSchedule,
  onMoveRow,
  onPublish,
  onRemoveRow,
  onSave,
  onSelectPeriod,
  pdfName,
  saving,
}: {
  conflictingSchedule: QisSchedule | null;
  content: QisContent;
  onAddRow: (index: number) => void;
  onChangeActivity: (
    rowId: string,
    weekday: Weekday,
    field: ActivityField,
    value: string,
  ) => void;
  onChangeContent: (update: (current: QisContent) => QisContent) => void;
  onChangePdfName: (name: string) => void;
  onChangeRow: (
    rowId: string,
    update: (row: QisScheduleRow) => QisScheduleRow,
  ) => void;
  onCancel: () => void;
  onChooseAnotherWeek: () => void;
  onEditConflictingSchedule: (schedule: QisSchedule) => void;
  onMoveRow: (rowId: string, direction: -1 | 1) => void;
  onPublish: () => void;
  onRemoveRow: (rowId: string) => void;
  onSave: () => void;
  onSelectPeriod: (date: string) => boolean;
  pdfName: string;
  saving: boolean;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <section
      aria-labelledby="qis-editor-title"
      className="overflow-visible rounded-2xl border border-blue-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 p-4 sm:p-6">
        <h2
          className="text-lg font-bold text-[#17233a]"
          id="qis-editor-title"
        >
          Editar QIS em formato de tabela
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          O modelo inicia com horários e atividades comuns preenchidos.
          Edite qualquer célula, ajuste horários ou adicione uma nova linha.
        </p>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <QisWeekCalendar
            isOpen={calendarOpen}
            key={content.periodStart}
            onOpenChange={setCalendarOpen}
            periodEnd={content.periodEnd}
            periodStart={content.periodStart}
            onSelectDate={onSelectPeriod}
          />
          <ParticipantSearch
            hint="Busque e selecione um militar cadastrado na ABM."
            id="qis-responsible"
            label="Responsável pelo QIS"
            onChange={(responsible) =>
              onChangeContent((current) => ({ ...current, responsible }))
            }
            options={militaryOptions}
            selectionRequired
            value={content.responsible}
          />
        </div>
        {conflictingSchedule ? (
          <div
            className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4"
            role="alert"
          >
            <p className="text-sm font-bold text-amber-950">
              Já existe um QIS para essa semana.
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              {formatWeekPeriod(
                getLatestPublishedContent(conflictingSchedule) ??
                  conflictingSchedule.content,
              )}
              {conflictingSchedule.publishedVersions.length > 0
                ? ` — ${conflictingSchedule.publishedVersions.length} versão(ões) publicada(s).`
                : " — rascunho ainda não publicado."}{" "}
              Você pode abrir o registro existente ou escolher outra semana.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="min-h-10 rounded-lg bg-amber-900 px-3 text-xs font-bold text-white hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                onClick={() => onEditConflictingSchedule(conflictingSchedule)}
                type="button"
              >
                Editar QIS existente
              </button>
              <button
                className="min-h-10 rounded-lg border border-amber-500 bg-white px-3 text-xs font-bold text-amber-950 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                onClick={() => {
                  onChooseAnotherWeek();
                  setCalendarOpen(true);
                }}
                type="button"
              >
                Escolher outra semana
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
        <div>
          <h3 className="font-bold text-[#17233a]">Rotina semanal</h3>
          <p className="mt-1 text-xs text-slate-600">
            Use as sugestões dos campos ou digite outro texto. Elas são
            genéricas e não representam uma programação oficial.
          </p>
        </div>
        <button
          className="min-h-10 rounded-lg bg-blue-50 px-3 text-xs font-bold text-[#245bde] hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          onClick={() => onAddRow(content.rows.length)}
          type="button"
        >
          + Adicionar horário
        </button>
      </div>

      {Object.entries(qisActivitySuggestions).map(([field, options]) => (
        <datalist id={`qis-${field}-options`} key={field}>
          {options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ))}

      <div
        aria-label="Tabela de edição do QIS; deslize horizontalmente para ver os cinco dias."
        className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-blue-500"
        role="region"
        tabIndex={0}
      >
        <table className="w-full min-w-[1450px] border-collapse text-left">
          <caption className="sr-only">
            Editor do QIS com horários em linhas e dias úteis em colunas.
          </caption>
          <thead>
            <tr className="bg-[#172f58] text-center text-xs font-bold text-white">
              <th className="w-52 border border-slate-300 px-3 py-3" scope="col">
                Horário
              </th>
              {weekdays.map((weekday) => (
                <th
                  className="min-w-[235px] border border-slate-300 px-3 py-3"
                  key={weekday}
                  scope="col"
                >
                  {weekday}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row, index) => (
              <tr
                className={row.kind === "break" ? "bg-emerald-50" : "bg-white"}
                key={row.id}
              >
                <th
                  className="border border-slate-300 bg-slate-50 p-3 align-top"
                  scope="row"
                >
                  <label className="block text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    Horário
                    <input
                      aria-label={`Horário da linha ${index + 1}`}
                      className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                      onChange={(event) =>
                        onChangeRow(row.id, (current) => ({
                          ...current,
                          time: event.target.value,
                        }))
                      }
                      placeholder="Ex.: 07h30 às 09h"
                      value={row.time}
                    />
                  </label>
                  {row.kind === "break" ? (
                    <label className="mt-3 block text-left text-[10px] font-bold uppercase tracking-wide text-slate-600">
                      Faixa compartilhada
                      <input
                        className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                        onChange={(event) =>
                          onChangeRow(row.id, (current) => ({
                            ...current,
                            breakLabel: event.target.value,
                          }))
                        }
                        value={row.breakLabel}
                      />
                    </label>
                  ) : null}
                  <div className="mt-3 grid grid-cols-2 gap-1">
                    <RowAction
                      disabled={index === 0}
                      label={`Mover linha ${index + 1} para cima`}
                      onClick={() => onMoveRow(row.id, -1)}
                    >
                      ↑
                    </RowAction>
                    <RowAction
                      disabled={index === content.rows.length - 1}
                      label={`Mover linha ${index + 1} para baixo`}
                      onClick={() => onMoveRow(row.id, 1)}
                    >
                      ↓
                    </RowAction>
                    <RowAction
                      label={`Adicionar horário antes da linha ${index + 1}`}
                      onClick={() => onAddRow(index)}
                    >
                      + linha
                    </RowAction>
                    <RowAction
                      danger
                      label={`Remover linha ${index + 1}`}
                      onClick={() => onRemoveRow(row.id)}
                    >
                      Remover
                    </RowAction>
                  </div>
                </th>
                {row.kind === "break" ? (
                  <td
                    className="border border-slate-300 px-4 py-5 text-center text-sm font-semibold italic text-emerald-950"
                    colSpan={weekdays.length}
                  >
                    Intervalo compartilhado pelos dias úteis
                  </td>
                ) : (
                  weekdays.map((weekday) => (
                    <td
                      className="border border-slate-300 p-2 align-top"
                      key={weekday}
                    >
                      <ActivityCellEditor
                        activity={row.activities[weekday]}
                        onChange={(field, value) =>
                          onChangeActivity(row.id, weekday, field, value)
                        }
                        rowIndex={index}
                        weekday={weekday}
                      />
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-200 px-4 py-3 text-xs leading-5 text-slate-600 sm:px-6">
        Em celulares, a grade rola horizontalmente. A quebra para almoço é uma
        linha compartilhada, como na planilha de referência.
      </div>

      <div className="m-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:m-6">
        <label
          className="text-sm font-bold text-amber-950"
          htmlFor="qis-signed-pdf-name"
        >
          Nome fictício do PDF assinado (para simular publicação)
        </label>
        <input
          autoComplete="off"
          className="mt-2 min-h-11 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          id="qis-signed-pdf-name"
          onChange={(event) => onChangePdfName(event.target.value)}
          placeholder="exemplo-assinado.pdf"
          value={pdfName}
        />
        <p className="mt-2 text-xs leading-5 text-amber-950">
          Não informe nomes de arquivos reais. O protótipo só guarda esse
          texto; não recebe PDF, não valida assinatura e não publica um QIS
          oficial.
        </p>
      </div>

      <div className="flex flex-wrap justify-end gap-2 px-4 pb-4 sm:px-6 sm:pb-6">
        <button
          className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          onClick={onCancel}
          type="button"
        >
          Cancelar edição
        </button>
        <button
          className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          onClick={onSave}
          type="button"
        >
          Salvar rascunho
        </button>
        <button
          className="min-h-11 rounded-xl bg-[#356cf0] px-4 text-sm font-bold text-white hover:bg-[#245bde] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          onClick={onPublish}
          type="button"
        >
          Publicar (simulação)
        </button>
      </div>
    </section>
  );
}

function ActivityCellEditor({
  activity,
  onChange,
  rowIndex,
  weekday,
}: {
  activity: QisActivity;
  onChange: (field: ActivityField, value: string) => void;
  rowIndex: number;
  weekday: Weekday;
}) {
  const fields: { key: ActivityField; label: string }[] = [
    { key: "theme", label: "Tema" },
    { key: "uniform", label: "Uniforme" },
    { key: "location", label: "Local" },
    { key: "front", label: "A frente" },
    { key: "notes", label: "Observações" },
  ];

  return (
    <div className="space-y-2.5">
      {fields.map((field) => (
        <label
          className="block text-left text-[10px] font-bold uppercase tracking-wide text-slate-600"
          key={field.key}
        >
          {field.label}
          <input
            aria-label={`${weekday}, ${field.label}, linha ${rowIndex + 1}`}
            className="mt-1 min-h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-normal normal-case tracking-normal text-slate-900 focus-visible:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
            list={
              field.key === "notes" ? undefined : `qis-${field.key}-options`
            }
            onChange={(event) => onChange(field.key, event.target.value)}
            placeholder="Preencher"
            value={activity[field.key]}
          />
        </label>
      ))}
    </div>
  );
}

function ReadOnlyQisGrid({ content }: { content: QisContent }) {
  return (
    <div
      aria-label="Rotina semanal do QIS. Em telas pequenas, deslize horizontalmente para consultar todos os dias."
      className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-blue-500"
      role="region"
      tabIndex={0}
    >
      <table className="w-full min-w-[1200px] border-collapse text-left">
        <caption className="sr-only">
          Quadro semanal do QIS, com faixa horária em cada linha e dia útil em
          cada coluna.
        </caption>
        <thead>
          <tr className="bg-[#172f58] text-center text-xs font-bold text-white">
            <th className="w-40 border border-slate-300 px-3 py-3" scope="col">
              Horário
            </th>
            {weekdays.map((weekday) => (
              <th
                className="min-w-48 border border-slate-300 px-3 py-3"
                key={weekday}
                scope="col"
              >
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.rows.map((row) => (
            <tr
              className={row.kind === "break" ? "bg-emerald-50" : "bg-white"}
              key={row.id}
            >
              <th
                className="border border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs font-bold text-slate-800"
                scope="row"
              >
                {row.time}
              </th>
              {row.kind === "break" ? (
                <td
                  className="border border-slate-300 px-4 py-4 text-center text-sm font-semibold italic text-emerald-950"
                  colSpan={weekdays.length}
                >
                  {row.breakLabel}
                </td>
              ) : (
                weekdays.map((weekday) => (
                  <td
                    className="border border-slate-300 p-3 align-top"
                    key={weekday}
                  >
                    <ActivityCellView activity={row.activities[weekday]} />
                  </td>
                ))
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityCellView({ activity }: { activity: QisActivity }) {
  const entries = [
    ["Tema", activity.theme],
    ["Uniforme", activity.uniform],
    ["Local", activity.location],
    ["A frente", activity.front],
    ["Observações", activity.notes],
  ].filter(([, value]) => value.trim());

  if (entries.length === 0) {
    return (
      <p className="text-xs italic text-slate-500">Sem atividade informada</p>
    );
  }

  return (
    <dl className="space-y-1.5 text-xs leading-5 text-slate-700">
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt className="inline font-bold text-[#17233a]">{label}: </dt>
          <dd className="inline whitespace-pre-line">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PublishedView({
  content,
  isAdmin,
  latestVersion,
  onSelectVersion,
  schedule,
  selectedVersion,
}: {
  content?: QisContent;
  isAdmin: boolean;
  latestVersion: QisSchedule["publishedVersions"][number] | null | undefined;
  onSelectVersion: (version: number | null) => void;
  schedule: QisSchedule | undefined;
  selectedVersion: number | null;
}) {
  if (!schedule) {
    return (
      <EmptyState>
        Ainda não há rascunhos ou QIS publicados neste navegador.
      </EmptyState>
    );
  }

  if (!content) {
    return (
      <EmptyState>
        {isAdmin
          ? "Este rascunho não foi publicado. Você pode editá-lo na simulação de administrador."
          : "Não há QIS publicado para consulta. Rascunhos não são exibidos para Usuários da ABM."}
      </EmptyState>
    );
  }

  const version =
    schedule.publishedVersions.find(
      (item) => item.version === selectedVersion,
    ) ?? latestVersion;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:px-6">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-[#17233a]">
            {isAdmin && schedule.status === "draft"
              ? "Prévia do rascunho"
              : "Rotina semanal"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {formatDate(content.periodStart)} a {formatDate(content.periodEnd)}
            {version ? ` · Versão ${version.version} (simulação)` : ""}
          </p>
          {content.responsible ? (
            <p className="mt-1 text-xs text-slate-600">
              Responsável: {content.responsible}
            </p>
          ) : null}
        </div>
        {version ? (
          <span className="w-fit rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-900">
            Publicado — demonstração
          </span>
        ) : (
          <StatusBadge status="draft" />
        )}
      </div>

      {schedule.publishedVersions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 sm:px-6">
          <span className="mr-1 text-xs font-semibold text-slate-600">
            Versões:
          </span>
          {schedule.publishedVersions.map((item) => (
            <button
              aria-pressed={
                selectedVersion === item.version ||
                (selectedVersion === null &&
                  item.version === latestVersion?.version)
              }
              className={`min-h-9 rounded-lg px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                (selectedVersion ?? latestVersion?.version) === item.version
                  ? "bg-[#172f58] text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
              key={item.version}
              onClick={() => onSelectVersion(item.version)}
              type="button"
            >
              v{item.version}
            </button>
          ))}
        </div>
      ) : null}

      {version ? (
        <p className="px-4 pt-4 text-xs leading-5 text-slate-600 sm:px-6">
          Arquivo informado na simulação: {version.signedPdfName}. O arquivo
          não foi enviado, e a assinatura não foi verificada.
        </p>
      ) : null}

      <ReadOnlyQisGrid content={content} />
      <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-600 sm:px-6">
        QIS de demonstração — não representa rotina oficial.
      </div>
    </section>
  );
}

function RowAction({
  children,
  danger = false,
  disabled = false,
  label,
  onClick,
}: {
  children: string;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`min-h-8 rounded-md border px-1 text-[10px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm">
      <h2 className="font-bold text-[#17233a]">Consulta do QIS</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {children}
      </p>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "Data não definida";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "Data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}
