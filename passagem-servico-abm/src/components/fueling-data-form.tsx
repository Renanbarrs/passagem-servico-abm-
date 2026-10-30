"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import ParticipantSearch from "@/components/participant-search";
import { personnelOptions } from "@/data/participant-options";
import type { VehicleData, VehicleId } from "@/components/vehicle-data-form";
import {
  isDateTimeWithinPeriod,
  isValidDateInput,
  isValidTimeInput,
  type ServicePeriod,
} from "@/lib/passage/validation";

type FuelingDraft = {
  id: number;
  vehicleId: VehicleId | "";
  date: string;
  time: string;
  responsible: string;
  responsibleId: string | null;
  odometer: string;
  liters: string;
  amount: string;
  balance: string;
  receiptName: string;
};

type FuelingField = Exclude<keyof FuelingDraft, "id" | "receiptName">;
type FuelingErrors = Partial<Record<FuelingField | "receiptName", string>>;

export type ValidatedFueling = {
  id: number;
  vehicleId: VehicleId;
  date: string;
  time: string;
  responsible: string;
  responsibleId: string;
  odometer: number;
  liters: number;
  amount: number;
  balance: number;
  receiptName: string;
};

type FuelingDataFormProps = {
  vehicleData: Record<VehicleId, VehicleData>;
  servicePeriod: ServicePeriod | null;
  onBack: () => void;
  onContinue: (fuelings: ValidatedFueling[]) => void;
  onEdit: () => void;
};

const vehicles: { id: VehicleId; model: string }[] = [
  { id: "APS-112", model: "Ford Ka" },
  { id: "AR-99", model: "Mitsubishi L200 Triton" },
];

const inputClassName =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#b82029] focus:ring-4 focus:ring-[#b82029]/10";

const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function createFueling(id: number, date = ""): FuelingDraft {
  return {
    id,
    vehicleId: "",
    date,
    time: "",
    responsible: "",
    responsibleId: null,
    odometer: "",
    liters: "",
    amount: "",
    balance: "",
    receiptName: "",
  };
}

function parseNonNegativeDecimal(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;

  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeDecimalInput(value: string) {
  return parseNonNegativeDecimal(value) === null
    ? value
    : value.trim().replace(".", ",");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function validateFueling(
  fueling: FuelingDraft,
  vehicleData: Record<VehicleId, VehicleData>,
  servicePeriod: ServicePeriod | null,
): { errors: FuelingErrors; normalized: ValidatedFueling | null } {
  const errors: FuelingErrors = {};

  if (!fueling.vehicleId) errors.vehicleId = "Selecione a viatura.";
  if (!fueling.date) errors.date = "Informe a data.";
  else if (!isValidDateInput(fueling.date)) {
    errors.date = "Informe uma data válida.";
  }
  if (!fueling.time) errors.time = "Informe o horário.";
  else if (!isValidTimeInput(fueling.time)) {
    errors.time = "Informe um horário válido.";
  }
  if (!fueling.responsible.trim()) {
    errors.responsible = "Busque e selecione um responsável da lista.";
  } else if (!fueling.responsibleId) {
    errors.responsible = "Selecione um responsável da lista de militares.";
  }

  let odometer: number | null = null;
  if (!fueling.odometer.trim()) {
    errors.odometer = "Informe o hodômetro do abastecimento.";
  } else if (
    !/^\d+$/.test(fueling.odometer) ||
    !Number.isSafeInteger(Number(fueling.odometer))
  ) {
    errors.odometer = "Informe um hodômetro inteiro e não negativo.";
  } else {
    odometer = Number(fueling.odometer);
  }

  const liters = parseNonNegativeDecimal(fueling.liters);
  if (!fueling.liters.trim()) {
    errors.liters = "Informe o volume abastecido.";
  } else if (liters === null) {
    errors.liters = "Informe um volume numérico não negativo.";
  }

  const amount = parseNonNegativeDecimal(fueling.amount);
  if (!fueling.amount.trim()) {
    errors.amount = "Informe o valor do abastecimento.";
  } else if (amount === null) {
    errors.amount = "Informe um valor numérico não negativo.";
  }

  const balance = parseNonNegativeDecimal(fueling.balance);
  if (!fueling.balance.trim()) {
    errors.balance = "Informe o saldo informado.";
  } else if (balance === null) {
    errors.balance = "Informe um saldo numérico não negativo.";
  }

  if (fueling.vehicleId && odometer !== null) {
    const vehicle = vehicleData[fueling.vehicleId];
    const initial = Number(vehicle.initialOdometer);
    const final = Number(vehicle.finalOdometer);
    const hasValidInterval =
      /^\d+$/.test(vehicle.initialOdometer) &&
      /^\d+$/.test(vehicle.finalOdometer) &&
      Number.isSafeInteger(initial) &&
      Number.isSafeInteger(final) &&
      final >= initial;

    if (hasValidInterval && (odometer < initial || odometer > final)) {
      errors.odometer =
        "O hodômetro deve estar entre os valores inicial e final da viatura.";
    }
  }

  if (
    servicePeriod &&
    isValidDateInput(fueling.date) &&
    isValidTimeInput(fueling.time) &&
    !isDateTimeWithinPeriod(fueling.date, fueling.time, servicePeriod)
  ) {
    errors.date = "O abastecimento deve ocorrer dentro do período do serviço.";
  }

  if (
    Object.keys(errors).length > 0 ||
    !fueling.vehicleId ||
    !fueling.responsibleId ||
    odometer === null ||
    liters === null ||
    amount === null ||
    balance === null
  ) {
    return { errors, normalized: null };
  }

  return {
    errors,
    normalized: {
      id: fueling.id,
      vehicleId: fueling.vehicleId,
      date: fueling.date,
      time: fueling.time,
      responsible: fueling.responsible.trim(),
      responsibleId: fueling.responsibleId,
      odometer,
      liters,
      amount,
      balance,
      receiptName: fueling.receiptName,
    },
  };
}

export default function FuelingDataForm({
  vehicleData,
  servicePeriod,
  onBack,
  onContinue,
  onEdit,
}: FuelingDataFormProps) {
  const nextId = useRef(1);
  const [draft, setDraft] = useState<FuelingDraft>(() => createFueling(0));
  const [fuelings, setFuelings] = useState<ValidatedFueling[]>([]);
  const [errors, setErrors] = useState<FuelingErrors>({});
  const [success, setSuccess] = useState(false);
  const [entryError, setEntryError] = useState("");

  function getInvalidSavedFueling() {
    return fuelings.find((fueling) => {
      const draftFueling: FuelingDraft = {
        ...fueling,
        odometer: String(fueling.odometer),
        liters: String(fueling.liters),
        amount: String(fueling.amount),
        balance: String(fueling.balance),
      };
      return Object.keys(
        validateFueling(draftFueling, vehicleData, servicePeriod).errors,
      ).length > 0;
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDraft((current) =>
        current.date ? current : { ...current, date: getTodayDate() },
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function addFueling() {
    onEdit();
    const result = validateFueling(draft, vehicleData, servicePeriod);
    setErrors(result.errors);
    const normalized = result.normalized;
    if (!normalized) return;

    setFuelings((current) => [...current, normalized]);
    setDraft(createFueling(nextId.current++, getTodayDate()));
    setErrors({});
    setEntryError("");
    setSuccess(false);
  }

  function removeFueling(id: number) {
    onEdit();
    setFuelings((current) => current.filter((fueling) => fueling.id !== id));
    setEntryError("");
    setSuccess(false);
  }

  function updateDraft(changes: Partial<FuelingDraft>) {
    onEdit();
    setDraft((current) => ({ ...current, ...changes }));
    setErrors({});
    setEntryError("");
    setSuccess(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const invalidSavedFueling = getInvalidSavedFueling();
    if (invalidSavedFueling) {
      const fuelingNumber =
        fuelings.findIndex((fueling) => fueling.id === invalidSavedFueling.id) +
        1;
      setEntryError(
        `O abastecimento ${fuelingNumber} ficou incompatível com o período ou hodômetro atualizado da viatura. Revise ou remova esse lançamento.`,
      );
      setSuccess(false);
      return;
    }

    const hasDraftContent = Boolean(
      draft.vehicleId ||
        draft.time ||
        draft.responsible ||
        draft.odometer ||
        draft.liters ||
        draft.amount ||
        draft.balance ||
        draft.receiptName,
    );
    if (hasDraftContent) {
      const result = validateFueling(draft, vehicleData, servicePeriod);
      const normalized = result.normalized;
      if (!normalized) {
        setErrors(result.errors);
        setSuccess(false);
        return;
      }

      const nextFuelings = [...fuelings, normalized];
      setFuelings(nextFuelings);
      setDraft(createFueling(nextId.current++, getTodayDate()));
      setErrors({});
      setEntryError("");
      setSuccess(true);
      onContinue(nextFuelings);
      return;
    }

    setErrors({});
    setSuccess(true);
    onContinue(fuelings);
  }

  const fuelingErrors = errors;
  const fueling = draft;
  const prefix = "new-fueling";
  const totalLiters = fuelings.reduce(
    (total, fueling) => total + fueling.liters,
    0,
  );
  const totalAmount = fuelings.reduce(
    (total, fueling) => total + fueling.amount,
    0,
  );

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-950">
        Preencha os dados abaixo e selecione “Adicionar abastecimento”. Cada
        lançamento validado aparecerá logo abaixo. Se não houver abastecimento,
        deixe a lista vazia.
      </div>
      {entryError ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {entryError}
        </p>
      ) : null}

      <section
        aria-labelledby={`${prefix}-title`}
        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-6"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <h3
            className="text-lg font-bold text-[#252126]"
            id={`${prefix}-title`}
          >
            Novo abastecimento
          </h3>
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-600">
            Opcional
          </span>
        </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label
                    className="text-sm font-semibold text-slate-800"
                    htmlFor={`${prefix}-vehicle`}
                  >
                    Viatura <span className="text-[#b82029]">*</span>
                  </label>
                  <select
                    aria-describedby={
                      fuelingErrors.vehicleId
                        ? `${prefix}-vehicle-error`
                        : undefined
                    }
                    aria-invalid={Boolean(fuelingErrors.vehicleId)}
                    className={`${inputClassName} ${fuelingErrors.vehicleId ? "border-red-600" : ""}`}
                    id={`${prefix}-vehicle`}
                    onChange={(event) =>
                      updateDraft({
                        vehicleId:
                          vehicles.find(
                            (vehicle) => vehicle.id === event.target.value,
                          )?.id ?? "",
                      })
                    }
                    value={draft.vehicleId}
                  >
                    <option value="">Selecione a viatura</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.id} · {vehicle.model}
                      </option>
                    ))}
                  </select>
                  {fuelingErrors.vehicleId ? (
                    <p
                      className="mt-1 text-xs font-medium text-red-700"
                      id={`${prefix}-vehicle-error`}
                    >
                      {fuelingErrors.vehicleId}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    className="text-sm font-semibold text-slate-800"
                    htmlFor={`${prefix}-date`}
                  >
                    Data <span className="text-[#b82029]">*</span>
                  </label>
                  <input
                    aria-describedby={
                      fuelingErrors.date ? `${prefix}-date-error` : undefined
                    }
                    aria-invalid={Boolean(fuelingErrors.date)}
                    className={`${inputClassName} ${fuelingErrors.date ? "border-red-600" : ""}`}
                    id={`${prefix}-date`}
                    onChange={(event) =>
                      updateDraft({ date: event.target.value })
                    }
                    type="date"
                    value={fueling.date}
                  />
                  {fuelingErrors.date ? (
                    <p
                      className="mt-1 text-xs font-medium text-red-700"
                      id={`${prefix}-date-error`}
                    >
                      {fuelingErrors.date}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    className="text-sm font-semibold text-slate-800"
                    htmlFor={`${prefix}-time`}
                  >
                    Horário <span className="text-[#b82029]">*</span>
                  </label>
                  <input
                    aria-describedby={
                      fuelingErrors.time ? `${prefix}-time-error` : undefined
                    }
                    aria-invalid={Boolean(fuelingErrors.time)}
                    className={`${inputClassName} ${fuelingErrors.time ? "border-red-600" : ""}`}
                    id={`${prefix}-time`}
                    onChange={(event) =>
                      updateDraft({ time: event.target.value })
                    }
                    type="time"
                    value={fueling.time}
                  />
                  {fuelingErrors.time ? (
                    <p
                      className="mt-1 text-xs font-medium text-red-700"
                      id={`${prefix}-time-error`}
                    >
                      {fuelingErrors.time}
                    </p>
                  ) : null}
                </div>

                <ParticipantSearch
                  error={fuelingErrors.responsible}
                  hint="Selecione o Condutor ou Auxiliar de Dia na lista."
                  id={`${prefix}-responsible`}
                  label="Responsável"
                  onChange={(responsible, responsibleId) =>
                    updateDraft({ responsible, responsibleId })
                  }
                  options={personnelOptions}
                  selectionRequired
                  value={fueling.responsible}
                />

                <div>
                  <label
                    className="text-sm font-semibold text-slate-800"
                    htmlFor={`${prefix}-odometer`}
                  >
                    Hodômetro no abastecimento (km){" "}
                    <span className="text-[#b82029]">*</span>
                  </label>
                  <input
                    aria-describedby={
                      fuelingErrors.odometer
                        ? `${prefix}-odometer-error`
                        : undefined
                    }
                    aria-invalid={Boolean(fuelingErrors.odometer)}
                    className={`${inputClassName} ${fuelingErrors.odometer ? "border-red-600" : ""}`}
                    id={`${prefix}-odometer`}
                    inputMode="numeric"
                    min="0"
                    onChange={(event) =>
                      updateDraft({ odometer: event.target.value })
                    }
                    placeholder="Ex.: 12500"
                    type="text"
                    value={fueling.odometer}
                  />
                  {fuelingErrors.odometer ? (
                    <p
                      className="mt-1 text-xs font-medium text-red-700"
                      id={`${prefix}-odometer-error`}
                    >
                      {fuelingErrors.odometer}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    className="text-sm font-semibold text-slate-800"
                    htmlFor={`${prefix}-liters`}
                  >
                    Volume abastecido (L){" "}
                    <span className="text-[#b82029]">*</span>
                  </label>
                  <input
                    aria-describedby={
                      fuelingErrors.liters ? `${prefix}-liters-error` : undefined
                    }
                    aria-invalid={Boolean(fuelingErrors.liters)}
                    className={`${inputClassName} ${fuelingErrors.liters ? "border-red-600" : ""}`}
                    id={`${prefix}-liters`}
                    inputMode="decimal"
                    onChange={(event) =>
                      updateDraft({ liters: event.target.value })
                    }
                    onBlur={(event) =>
                      updateDraft({
                        liters: normalizeDecimalInput(event.target.value),
                      })
                    }
                    placeholder="Ex.: 35,5"
                    type="text"
                    value={fueling.liters}
                  />
                  {fuelingErrors.liters ? (
                    <p
                      className="mt-1 text-xs font-medium text-red-700"
                      id={`${prefix}-liters-error`}
                    >
                      {fuelingErrors.liters}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">
                    Aceita vírgula ou ponto; padroniza para vírgula ao sair do
                    campo.
                  </p>
                </div>

                <div>
                  <label
                    className="text-sm font-semibold text-slate-800"
                    htmlFor={`${prefix}-amount`}
                  >
                    Valor do abastecimento (R$){" "}
                    <span className="text-[#b82029]">*</span>
                  </label>
                  <input
                    aria-describedby={
                      fuelingErrors.amount ? `${prefix}-amount-error` : undefined
                    }
                    aria-invalid={Boolean(fuelingErrors.amount)}
                    className={`${inputClassName} ${fuelingErrors.amount ? "border-red-600" : ""}`}
                    id={`${prefix}-amount`}
                    inputMode="decimal"
                    onChange={(event) =>
                      updateDraft({ amount: event.target.value })
                    }
                    onBlur={(event) =>
                      updateDraft({
                        amount: normalizeDecimalInput(event.target.value),
                      })
                    }
                    placeholder="Ex.: 250,00"
                    type="text"
                    value={fueling.amount}
                  />
                  {fuelingErrors.amount ? (
                    <p
                      className="mt-1 text-xs font-medium text-red-700"
                      id={`${prefix}-amount-error`}
                    >
                      {fuelingErrors.amount}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">
                    Aceita vírgula ou ponto; padroniza para vírgula ao sair do
                    campo.
                  </p>
                </div>

                <div>
                  <label
                    className="text-sm font-semibold text-slate-800"
                    htmlFor={`${prefix}-balance`}
                  >
                    Saldo disponível (R$){" "}
                    <span className="text-[#b82029]">*</span>
                  </label>
                  <input
                    aria-describedby={
                      fuelingErrors.balance
                        ? `${prefix}-balance-error`
                        : undefined
                    }
                    aria-invalid={Boolean(fuelingErrors.balance)}
                    className={`${inputClassName} ${fuelingErrors.balance ? "border-red-600" : ""}`}
                    id={`${prefix}-balance`}
                    inputMode="decimal"
                    onChange={(event) =>
                      updateDraft({ balance: event.target.value })
                    }
                    onBlur={(event) =>
                      updateDraft({
                        balance: normalizeDecimalInput(event.target.value),
                      })
                    }
                    placeholder="Ex.: 100,00"
                    type="text"
                    value={fueling.balance}
                  />
                  {fuelingErrors.balance ? (
                    <p
                      className="mt-1 text-xs font-medium text-red-700"
                      id={`${prefix}-balance-error`}
                    >
                      {fuelingErrors.balance}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">
                    Aceita vírgula ou ponto; padroniza para vírgula ao sair do
                    campo.
                  </p>
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <input
                    accept="image/*"
                    className="peer sr-only"
                    id={`${prefix}-receipt`}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith("image/")) {
                        setErrors({
                          receiptName: "Selecione um arquivo de imagem.",
                        });
                        setSuccess(false);
                        event.target.value = "";
                        return;
                      }
                      updateDraft({ receiptName: file.name });
                      event.target.value = "";
                    }}
                    type="file"
                  />
                  <label
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-white px-4 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#b82029]"
                    htmlFor={`${prefix}-receipt`}
                  >
                    ▧ Selecionar foto do comprovante
                    <span className="font-normal text-slate-500">· opcional</span>
                  </label>
                  {fueling.receiptName ? (
                    <p className="mt-1.5 text-xs text-slate-600">
                      Arquivo selecionado: {fueling.receiptName}
                      <button
                        className="ml-2 font-semibold text-red-700 underline underline-offset-2"
                        onClick={() =>
                          updateDraft({ receiptName: "" })
                        }
                        type="button"
                      >
                        Remover
                      </button>
                    </p>
                  ) : null}
                  {fuelingErrors.receiptName ? (
                    <p className="mt-1 text-xs font-medium text-red-700">
                      {fuelingErrors.receiptName}
                    </p>
                  ) : null}
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">
                    Apenas imagens. Nesta demonstração, o arquivo não é enviado
                    nem salvo.
                  </p>
                </div>
        </div>
        <button
          className="mt-5 min-h-11 rounded-xl bg-[#17233d] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#263754] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
          onClick={addFueling}
          type="button"
        >
          + Adicionar abastecimento
        </button>
      </section>

      {fuelings.length > 0 ? (
        <section aria-labelledby="added-fuelings-title" className="space-y-3">
          <h3
            className="text-base font-bold text-[#252126]"
            id="added-fuelings-title"
          >
            Abastecimentos adicionados ({fuelings.length})
          </h3>
          {fuelings.map((savedFueling, index) => (
            <article
              className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:items-center"
              key={savedFueling.id}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {savedFueling.vehicleId}
                  <span className="font-normal text-slate-500">
                    {" "}· {formatDate(savedFueling.date)} {savedFueling.time}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Responsável: {savedFueling.responsible}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                    {savedFueling.liters.toLocaleString("pt-BR")} L
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                    {formatCurrency(savedFueling.amount)}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                    {savedFueling.odometer.toLocaleString("pt-BR")} km
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                    Saldo: {formatCurrency(savedFueling.balance)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      savedFueling.receiptName
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {savedFueling.receiptName
                      ? "Comprovante anexado"
                      : "Sem comprovante"}
                  </span>
                </div>
                {savedFueling.receiptName ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {savedFueling.receiptName}
                  </p>
                ) : null}
              </div>
              <button
                aria-label={`Remover abastecimento ${index + 1}`}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-red-200 bg-white text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
                onClick={() => removeFueling(savedFueling.id)}
                type="button"
              >
                ×
              </button>
            </article>
          ))}
        </section>
      ) : null}

      {Object.keys(errors).length > 0 ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          Revise os campos destacados antes de validar os abastecimentos.
        </div>
      ) : null}

      {success ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950"
          role="status"
        >
          {fuelings.length === 0 ? (
            <p>Nenhum abastecimento informado. Essa opção é válida.</p>
          ) : (
            <>
              <p className="font-semibold">
                {fuelings.length}{" "}
                {fuelings.length === 1
                  ? "abastecimento validado"
                  : "abastecimentos validados"}{" "}
                neste navegador.
              </p>
              <p>
                Volume total: {totalLiters.toLocaleString("pt-BR")} L · Valor
                total: {formatCurrency(totalAmount)}
              </p>
            </>
          )}
          <p className="mt-1">
            Os dados são temporários e serão perdidos ao recarregar a página.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
        <button
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
          onClick={onBack}
          type="button"
        >
          Voltar para Viaturas
        </button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
            onClick={() => {
              onEdit();
              setFuelings([]);
              setDraft(createFueling(nextId.current++, getTodayDate()));
              setErrors({});
              setSuccess(false);
            }}
            type="button"
          >
            Limpar abastecimentos
          </button>
          <button
            className="min-h-11 rounded-xl bg-[#b82029] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#991b23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
            type="submit"
          >
            Validar abastecimentos
          </button>
        </div>
      </div>
    </form>
  );
}
