"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  isValidDateInput,
  isValidTimeInput,
} from "@/lib/passage/validation";

export type Occurrence = {
  id: number;
  isNoChange: boolean;
} & OccurrenceDraft;

type OccurrenceDraft = {
  category: string;
  date: string;
  time: string;
  description: string;
};

type OccurrenceErrors = Partial<Record<keyof OccurrenceDraft, string>>;
export type Sector = "Frota" | "Patrimônio" | "Pessoal";
export type ActionsBySector = Record<Sector, string>;

export type AlterationsData = {
  occurrences: Occurrence[];
  actionsBySector: ActionsBySector;
};

type AlterationsDataFormProps = {
  onBack: () => void;
  onContinue: (data: AlterationsData) => void;
  onEdit: () => void;
};

const sectors: Sector[] = ["Frota", "Patrimônio", "Pessoal"];

export const occurrenceCategories = [
  "Viaturas",
  "Patrimônio",
  "Pessoal",
  "Instalações",
  "Instruções e atividades",
  "Outros",
] as const;

export const noChangeText = "O serviço transcorreu sem alterações";

const inputClassName =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#b82029] focus:ring-4 focus:ring-[#b82029]/10";

const emptyDraft: OccurrenceDraft = {
  category: "",
  date: "",
  time: "",
  description: "",
};

export default function AlterationsDataForm({
  onBack,
  onContinue,
  onEdit,
}: AlterationsDataFormProps) {
  const nextId = useRef(1);
  const [draft, setDraft] = useState<OccurrenceDraft>(emptyDraft);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [actionsBySector, setActionsBySector] = useState<
    ActionsBySector
  >({
    Frota: "",
    Patrimônio: "",
    Pessoal: "",
  });
  const [errors, setErrors] = useState<OccurrenceErrors>({});
  const [entryError, setEntryError] = useState("");
  const noChangeConfirmed = occurrences.some(
    (occurrence) => occurrence.isNoChange,
  );
  const hasRealOccurrences = occurrences.some(
    (occurrence) => !occurrence.isNoChange,
  );

  function addOccurrence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onEdit();
    setEntryError("");
    const nextErrors: OccurrenceErrors = {};

    if (!draft.category) nextErrors.category = "Selecione uma categoria.";
    if (!draft.description.trim()) {
      nextErrors.description = "Descreva a ocorrência.";
    }
    if (draft.date && !isValidDateInput(draft.date)) {
      nextErrors.date = "Informe uma data válida.";
    }
    if (draft.time && !isValidTimeInput(draft.time)) {
      nextErrors.time = "Informe um horário válido.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setOccurrences((current) => [
      ...current,
      {
        id: nextId.current++,
        isNoChange: false,
        ...draft,
        description: draft.description.trim(),
      },
    ]);
    setDraft(emptyDraft);
    setErrors({});
  }

  function toggleNoChange(checked: boolean) {
    onEdit();
    setEntryError("");
    if (checked) {
      setOccurrences([
        {
          id: nextId.current++,
          isNoChange: true,
          category: "Sem alteração",
          date: "",
          time: "",
          description: noChangeText,
        },
      ]);
    } else {
      setOccurrences((current) =>
        current.filter((occurrence) => !occurrence.isNoChange),
      );
    }
    setErrors({});
  }

  function removeOccurrence(id: number) {
    onEdit();
    setOccurrences((current) =>
      current.filter((occurrence) => occurrence.id !== id),
    );
  }

  function updateSector(sector: Sector, value: string) {
    onEdit();
    setActionsBySector((current) => ({ ...current, [sector]: value }));
  }

  function handleContinue() {
    if (occurrences.length === 0) {
      setEntryError("Registre uma ocorrência ou confirme “Sem alteração” antes de continuar.");
      return;
    }

    onContinue({ occurrences, actionsBySector });
  }
  
  function updateDraft(changes: Partial<OccurrenceDraft>) {
    onEdit();
    setEntryError("");
    setDraft((current) => ({ ...current, ...changes }));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-950">
        Registre as ocorrências relevantes do serviço. Data e horário são
        opcionais quando não se aplicarem. Esta etapa ainda não salva os dados
        fora desta página.
      </div>

      <section
        aria-labelledby="alterations-title"
        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-6"
      >
        <div className="border-b border-slate-200 pb-4">
          <h3
            className="text-lg font-bold text-[#252126]"
            id="alterations-title"
          >
            Alterações do serviço
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Adicione uma ou mais ocorrências ou confirme “Sem alteração”.
          </p>
        </div>

        <label className="mt-5 flex min-h-12 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-semibold text-slate-800">
          <input
            checked={noChangeConfirmed}
            className="mt-0.5 size-4 accent-[#b82029] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
            disabled={hasRealOccurrences}
            onChange={(event) => toggleNoChange(event.target.checked)}
            type="checkbox"
          />
          <span>
            Sem alteração
            <span className="mt-1 block text-xs font-normal leading-5 text-slate-600">
              Gera o registro “{noChangeText}” sem exigir horário ou descrição.
              {hasRealOccurrences
                ? " Remova as ocorrências para habilitar esta opção."
                : ""}
            </span>
          </span>
        </label>

        {noChangeConfirmed ? (
          <div
            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950"
            role="status"
          >
            {noChangeText}
          </div>
        ) : (
          <form className="mt-5 space-y-4" noValidate onSubmit={addOccurrence}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="text-sm font-semibold text-slate-800"
                  htmlFor="occurrence-category"
                >
                  Categoria <span className="text-[#b82029]">*</span>
                </label>
                <select
                  aria-describedby={
                    errors.category ? "occurrence-category-error" : undefined
                  }
                  aria-invalid={Boolean(errors.category)}
                  className={`${inputClassName} ${errors.category ? "border-red-600" : ""}`}
                  id="occurrence-category"
                  onChange={(event) =>
                    updateDraft({ category: event.target.value })
                  }
                  value={draft.category}
                >
                  <option value="">Selecione uma categoria</option>
                  {occurrenceCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category ? (
                  <p
                    className="mt-1 text-xs font-medium text-red-700"
                    id="occurrence-category-error"
                  >
                    {errors.category}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-slate-800"
                  htmlFor="occurrence-date"
                >
                      Data{" "}
                      <span className="font-normal text-slate-500">· opcional</span>
                </label>
                <input
                  aria-describedby={
                    errors.date ? "occurrence-date-error" : undefined
                  }
                  aria-invalid={Boolean(errors.date)}
                  className={`${inputClassName} ${errors.date ? "border-red-600" : ""}`}
                  id="occurrence-date"
                  onChange={(event) => updateDraft({ date: event.target.value })}
                  type="date"
                  value={draft.date}
                />
                {errors.date ? (
                  <p
                    className="mt-1 text-xs font-medium text-red-700"
                    id="occurrence-date-error"
                  >
                    {errors.date}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-slate-800"
                  htmlFor="occurrence-time"
                >
                  Horário{" "}
                  <span className="font-normal text-slate-500">· opcional</span>
                </label>
                <input
                  aria-describedby={
                    errors.time ? "occurrence-time-error" : undefined
                  }
                  aria-invalid={Boolean(errors.time)}
                  className={`${inputClassName} ${errors.time ? "border-red-600" : ""}`}
                  id="occurrence-time"
                  onChange={(event) => updateDraft({ time: event.target.value })}
                  type="time"
                  value={draft.time}
                />
                {errors.time ? (
                  <p
                    className="mt-1 text-xs font-medium text-red-700"
                    id="occurrence-time-error"
                  >
                    {errors.time}
                  </p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label
                  className="text-sm font-semibold text-slate-800"
                  htmlFor="occurrence-description"
                >
                  Descrição <span className="text-[#b82029]">*</span>
                </label>
                <textarea
                  aria-describedby={
                    errors.description
                      ? "occurrence-description-error"
                      : undefined
                  }
                  aria-invalid={Boolean(errors.description)}
                  className={`${inputClassName} min-h-28 resize-y py-3 ${errors.description ? "border-red-600" : ""}`}
                  id="occurrence-description"
                  onChange={(event) =>
                    updateDraft({ description: event.target.value })
                  }
                  placeholder="Descreva a ocorrência de forma objetiva."
                  value={draft.description}
                />
                {errors.description ? (
                  <p
                    className="mt-1 text-xs font-medium text-red-700"
                    id="occurrence-description-error"
                  >
                    {errors.description}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              className="min-h-11 rounded-xl bg-[#17233d] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#263754] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
              type="submit"
            >
              + Adicionar ocorrência
            </button>
          </form>
        )}
      </section>

      {hasRealOccurrences ? (
        <section aria-labelledby="occurrence-list-title" className="space-y-3">
          <h3
            className="text-base font-bold text-[#252126]"
            id="occurrence-list-title"
          >
            Ocorrências adicionadas (
            {occurrences.filter((occurrence) => !occurrence.isNoChange).length})
          </h3>
          {occurrences
            .filter((occurrence) => !occurrence.isNoChange)
            .map((occurrence) => (
              <article
                className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                key={occurrence.id}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {occurrence.category}
                    {occurrence.date || occurrence.time ? (
                      <span className="font-normal text-slate-500">
                        {" · "}
                        {occurrence.date
                          ? new Intl.DateTimeFormat("pt-BR", {
                              timeZone: "UTC",
                            }).format(
                              new Date(`${occurrence.date}T00:00:00Z`),
                            )
                          : ""}
                        {occurrence.date && occurrence.time ? " · " : ""}
                        {occurrence.time}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {occurrence.description}
                  </p>
                </div>
                <button
                  aria-label={`Remover ocorrência de ${occurrence.category}`}
                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-red-200 bg-white text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
                  onClick={() => removeOccurrence(occurrence.id)}
                  type="button"
                >
                  ×
                </button>
              </article>
            ))}
        </section>
      ) : null}

      <details className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b82029] [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-lg font-bold text-[#252126]">
              Providências por setor
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">
              Registre providências relacionadas a cada setor, se houver.
              Todos os campos são opcionais.
            </span>
          </span>
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-lg text-slate-700 transition-transform group-open:rotate-180"
          >
           ⌄
          </span>
        </summary>
        <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4">
          {sectors.map((sector) => (
            <div key={sector}>
              <label
                className="text-sm font-semibold text-slate-800"
                htmlFor={`actions-${sector.toLocaleLowerCase("pt-BR")}`}
              >
                {sector}
              </label>
              <textarea
                className={`${inputClassName} min-h-24 resize-y py-3`}
                id={`actions-${sector.toLocaleLowerCase("pt-BR")}`}
                onChange={(event) => updateSector(sector, event.target.value)}
                placeholder={`Providências para ${sector.toLocaleLowerCase("pt-BR")} (opcional)`}
                value={actionsBySector[sector]}
              />
            </div>
          ))}
        </div>
      </details>

      {entryError ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {entryError}
        </p>
      ) : null}

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        A conferência revisa os dados desta passagem, mas ainda não finaliza nem
        salva o registro.
      </div>

      <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row">
        <button
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
          onClick={onBack}
          type="button"
        >
          Voltar para Abastecimentos
        </button>
        <button
          className="min-h-11 rounded-xl bg-[#b82029] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#991b23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
          onClick={handleContinue}
          type="button"
        >
          Conferir passagem
        </button>
      </div>
    </div>
  );
}
