"use client";

import { useEffect, useMemo, useState } from "react";
import {
  officerOptions,
  personnelOptions,
} from "@/data/participant-options";
import { LocalStorageDutyRosterRepository } from "@/lib/duty-rosters/repository";
import type { DutyRoster } from "@/lib/duty-rosters/types";

type DemoRole = "user" | "admin";
type RosterDraft = Omit<DutyRoster, "date" | "updatedAt">;

const repository = new LocalStorageDutyRosterRepository();
const emptyDraft: RosterDraft = {
  officerName: "",
  auxiliaryName: "",
  driverName: "",
  notes: "",
};
const weekDays = [
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
  "Dom",
];

export default function DutyRosterWorkspace() {
  const [rosters, setRosters] = useState<DutyRoster[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [todayDate, setTodayDate] = useState("");
  const [monthDate, setMonthDate] = useState(() => {
    return new Date(2000, 0, 1);
  });
  const [role, setRole] = useState<DemoRole>("user");
  const [draft, setDraft] = useState<RosterDraft>(emptyDraft);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let active = true;
    repository
      .list()
      .then((items) => {
        if (active) setRosters(items);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar as escalas locais.",
          );
        }
      })
      .finally(() => {
        if (active) {
          const today = new Date();
          const todayValue = formatDateInput(today);
          setSelectedDate(todayValue);
          setTodayDate(todayValue);
          setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedRoster = rosters.find(
    (roster) => roster.date === selectedDate,
  );
  const calendarDays = useMemo(
    () => getCalendarDays(monthDate),
    [monthDate],
  );

  function chooseDate(date: string) {
    const [year, month] = date.split("-").map(Number);
    const selectedMonth = new Date(year, month - 1, 1);
    if (
      selectedMonth.getMonth() !== monthDate.getMonth() ||
      selectedMonth.getFullYear() !== monthDate.getFullYear()
    ) {
      setMonthDate(selectedMonth);
    }
    setSelectedDate(date);
    setIsEditing(false);
    setDraft(emptyDraft);
    setError("");
    setFeedback("");
  }

  function changeMonth(direction: -1 | 1) {
    const nextMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + direction,
      1,
    );
    setMonthDate(nextMonth);
    chooseDate(formatDateInput(nextMonth));
  }

  function beginEditing() {
    setDraft(
      selectedRoster
        ? {
            officerName: selectedRoster.officerName,
            auxiliaryName: selectedRoster.auxiliaryName,
            driverName: selectedRoster.driverName,
            notes: selectedRoster.notes,
          }
        : { ...emptyDraft },
    );
    setIsEditing(true);
    setError("");
    setFeedback("");
  }

  async function saveRoster() {
    const hasAssignment = [
      draft.officerName,
      draft.auxiliaryName,
      draft.driverName,
      draft.notes,
    ].some((value) => value.trim());

    if (!hasAssignment) {
      setError(
        "Preencha ao menos uma designação ou observação antes de salvar.",
      );
      setFeedback("");
      return;
    }

    const roster: DutyRoster = {
      date: selectedDate,
      officerName: draft.officerName.trim(),
      auxiliaryName: draft.auxiliaryName.trim(),
      driverName: draft.driverName.trim(),
      notes: draft.notes.trim(),
      updatedAt: new Date().toISOString(),
    };
    setSaving(true);
    setError("");

    try {
      await repository.save(roster);
      setRosters((current) => [
        ...current.filter((item) => item.date !== selectedDate),
        roster,
      ]);
      setIsEditing(false);
      setFeedback("Designação salva somente neste navegador.");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar a designação.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeRoster() {
    setSaving(true);
    setError("");
    setFeedback("");

    try {
      await repository.remove(selectedDate);
      setRosters((current) =>
        current.filter((roster) => roster.date !== selectedDate),
      );
      setDraft({ ...emptyDraft });
      setIsEditing(false);
      setFeedback("Designação removida deste navegador.");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível remover a designação.",
      );
    } finally {
      setSaving(false);
    }
  }

  function changeRole(nextRole: DemoRole) {
    setRole(nextRole);
    setIsEditing(false);
    setError("");
    setFeedback("");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <p className="text-sm font-bold text-amber-950">
          Protótipo local — sem autenticação ou controle real de acesso
        </p>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          As designações ficam apenas neste navegador. A alternância de perfil
          é uma simulação e não protege a edição; use somente dados fictícios.
        </p>
        <fieldset className="mt-4">
          <legend className="text-xs font-bold uppercase tracking-wide text-amber-950">
            Simulação de perfil
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <RoleOption
              checked={role === "user"}
              label="Usuário da ABM — consulta"
              onChange={() => changeRole("user")}
            />
            <RoleOption
              checked={role === "admin"}
              label="Administrador — demonstração"
              onChange={() => changeRole("admin")}
            />
          </div>
        </fieldset>
      </section>

      {error ? <Message kind="error">{error}</Message> : null}
      {feedback ? <Message kind="success">{feedback}</Message> : null}

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Carregando designações locais...
        </p>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                aria-label="Mês anterior"
                className="grid size-10 place-items-center rounded-lg border border-slate-300 text-lg text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                onClick={() => changeMonth(-1)}
                type="button"
              >
                ‹
              </button>
              <h2
                className="text-center text-base font-bold capitalize text-[#17233a] sm:text-lg"
                aria-live="polite"
              >
                {formatMonth(monthDate)}
              </h2>
              <button
                aria-label="Próximo mês"
                className="grid size-10 place-items-center rounded-lg border border-slate-300 text-lg text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                onClick={() => changeMonth(1)}
                type="button"
              >
                ›
              </button>
            </div>

            <div
              aria-label={`Calendário de ${formatMonth(monthDate)}`}
              className="grid grid-cols-7 gap-1"
            >
              {weekDays.map((day) => (
                <div
                  className="py-2 text-center text-[10px] font-bold uppercase text-slate-500 sm:text-xs"
                  key={day}
                >
                  {day}
                </div>
              ))}
              {calendarDays.map((date) => {
                const dateValue = formatDateInput(date);
                const isCurrentMonth =
                  date.getMonth() === monthDate.getMonth();
                const isSelected = dateValue === selectedDate;
                const isToday = dateValue === todayDate;
                const hasRoster = rosters.some(
                  (roster) => roster.date === dateValue,
                );

                return (
                  <button
                    aria-current={isToday ? "date" : undefined}
                    aria-label={`${date.getDate()} de ${formatMonth(date)}${
                      hasRoster ? ", com designação" : ""
                    }`}
                    aria-pressed={isSelected}
                    className={`relative grid min-h-11 place-items-center rounded-lg text-sm font-semibold transition focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 ${
                      isSelected
                        ? "bg-[#172f58] text-white"
                        : isCurrentMonth
                          ? "text-slate-800 hover:bg-blue-50"
                          : "text-slate-400 hover:bg-slate-50"
                    } ${isToday && !isSelected ? "ring-1 ring-[#356cf0]" : ""}`}
                    key={dateValue}
                    onClick={() => chooseDate(dateValue)}
                    type="button"
                  >
                    {date.getDate()}
                    {hasRoster ? (
                      <span
                        aria-hidden="true"
                        className={`absolute bottom-1 size-1 rounded-full ${
                          isSelected ? "bg-white" : "bg-[#356cf0]"
                        }`}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-[#356cf0]"
              />
              Data com designação cadastrada
            </div>
          </section>

          <section
            aria-labelledby="selected-roster-title"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#356cf0]">
                  Designação diária
                </p>
                <h2
                  className="mt-1 text-lg font-bold text-[#17233a]"
                  id="selected-roster-title"
                >
                  {formatDate(selectedDate)}
                </h2>
              </div>
              {role === "admin" && !isEditing ? (
                <button
                  className="min-h-10 rounded-lg bg-[#356cf0] px-3 text-xs font-bold text-white hover:bg-[#245bde] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  onClick={beginEditing}
                  type="button"
                >
                  {selectedRoster ? "Editar designação" : "Cadastrar designação"}
                </button>
              ) : null}
            </div>

            {isEditing && role === "admin" ? (
              <RosterEditor
                draft={draft}
                onChange={setDraft}
                onCancel={() => setIsEditing(false)}
                onRemove={removeRoster}
                onSave={saveRoster}
                saving={saving}
                hasExistingRoster={Boolean(selectedRoster)}
              />
            ) : selectedRoster ? (
              <RosterDetails roster={selectedRoster} />
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  Nenhuma designação cadastrada para esta data.
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {role === "admin"
                    ? "Use “Cadastrar designação” para adicionar os dados fictícios."
                    : "Se necessário, informe os participantes manualmente na Passagem de Serviço."}
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function RosterEditor({
  draft,
  hasExistingRoster,
  onCancel,
  onChange,
  onRemove,
  onSave,
  saving,
}: {
  draft: RosterDraft;
  hasExistingRoster: boolean;
  onCancel: () => void;
  onChange: (draft: RosterDraft) => void;
  onRemove: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="mt-5 space-y-4">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
        Use apenas participantes fictícios. Os campos são sugestões e podem
        ser ajustados na Passagem de Serviço.
      </p>
      <SelectField
        label="Oficial de Dia"
        onChange={(officerName) => onChange({ ...draft, officerName })}
        options={officerOptions.map((option) => option.name)}
        value={draft.officerName}
      />
      <SelectField
        label="Auxiliar de Dia"
        onChange={(auxiliaryName) => onChange({ ...draft, auxiliaryName })}
        options={personnelOptions.map((option) => option.name)}
        value={draft.auxiliaryName}
      />
      <SelectField
        label="Condutor"
        onChange={(driverName) => onChange({ ...draft, driverName })}
        options={personnelOptions.map((option) => option.name)}
        value={draft.driverName}
      />
      <label className="block text-xs font-semibold text-slate-700">
        Observações
        <textarea
          className="mt-1.5 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          onChange={(event) =>
            onChange({ ...draft, notes: event.target.value })
          }
          value={draft.notes}
        />
      </label>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
        {hasExistingRoster ? (
          <button
            className="mr-auto min-h-10 rounded-lg px-3 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-60"
            disabled={saving}
            onClick={onRemove}
            type="button"
          >
            Limpar designação
          </button>
        ) : null}
        <button
          className="min-h-10 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="min-h-10 rounded-lg bg-[#356cf0] px-4 text-xs font-bold text-white hover:bg-[#245bde] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          onClick={onSave}
          type="button"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      <select
        className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Não designado</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function RosterDetails({ roster }: { roster: DutyRoster }) {
  const details = [
    ["Oficial de Dia", roster.officerName],
    ["Auxiliar de Dia", roster.auxiliaryName],
    ["Condutor", roster.driverName],
  ];

  return (
    <dl className="mt-5 divide-y divide-slate-100">
      {details.map(([label, value]) => (
        <div className="grid gap-1 py-3 sm:grid-cols-[140px_1fr]" key={label}>
          <dt className="text-xs font-semibold text-slate-500">{label}</dt>
          <dd className="text-sm font-medium text-slate-900">
            {value || "Não designado"}
          </dd>
        </div>
      ))}
      {roster.notes ? (
        <div className="grid gap-1 py-3 sm:grid-cols-[140px_1fr]">
          <dt className="text-xs font-semibold text-slate-500">Observações</dt>
          <dd className="whitespace-pre-line text-sm text-slate-800">
            {roster.notes}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function RoleOption({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-slate-800 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500">
      <input
        checked={checked}
        className="accent-[#356cf0]"
        name="roster-demo-role"
        onChange={onChange}
        type="radio"
      />
      {label}
    </label>
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

function getCalendarDays(monthDate: Date) {
  const firstDay = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
  );
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "Data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}
