"use client";

import { useEffect, useState, type FormEvent } from "react";
import ParticipantSearch from "@/components/participant-search";
import {
  officerOptions,
  personnelOptions,
} from "@/data/participant-options";
import { LocalStorageDutyRosterRepository } from "@/lib/duty-rosters/repository";
import {
  isValidDateInput,
  isValidTimeInput,
} from "@/lib/passage/validation";

export type GeneralData = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  officerName: string;
  officerId: string | null;
  auxiliaryName: string;
  auxiliaryId: string | null;
  driverName: string;
  driverId: string | null;
};

type Errors = Partial<Record<keyof GeneralData, string>>;

type GeneralDataFormProps = {
  onChange: () => void;
  onContinue: (data: GeneralData) => void;
};

const inputClassName =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#b82029] focus:ring-4 focus:ring-[#b82029]/10";

const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialData: GeneralData = {
  startDate: getTodayDate(),
  startTime: "08:00",
  endDate: "",
  endTime: "",
  officerName: "",
  officerId: null,
  auxiliaryName: "",
  auxiliaryId: null,
  driverName: "",
  driverId: null,
};

const rosterRepository = new LocalStorageDutyRosterRepository();

function validate(data: GeneralData): Errors {
  const errors: Errors = {};

  if (!data.startDate) errors.startDate = "Informe a data de início.";
  else if (!isValidDateInput(data.startDate)) {
    errors.startDate = "Informe uma data de início válida.";
  }
  if (!data.startTime) errors.startTime = "Informe o horário de início.";
  else if (!isValidTimeInput(data.startTime)) {
    errors.startTime = "Informe um horário de início válido.";
  }
  if (!data.endDate) errors.endDate = "Informe a data de término.";
  else if (!isValidDateInput(data.endDate)) {
    errors.endDate = "Informe uma data de término válida.";
  }
  if (!data.endTime) errors.endTime = "Informe o horário de término.";
  else if (!isValidTimeInput(data.endTime)) {
    errors.endTime = "Informe um horário de término válido.";
  }
  if (!data.officerName.trim()) errors.officerName = "Informe o Oficial de Dia.";
  if (!data.auxiliaryId) {
    errors.auxiliaryName = "Busque e selecione um Auxiliar de Dia.";
  }
  if (!data.driverId) errors.driverName = "Busque e selecione um Condutor.";

  if (
    data.startDate &&
    data.startTime &&
    data.endDate &&
    data.endTime &&
    isValidDateInput(data.startDate) &&
    isValidTimeInput(data.startTime) &&
    isValidDateInput(data.endDate) &&
    isValidTimeInput(data.endTime) &&
    (data.endDate < data.startDate ||
      (data.endDate === data.startDate && data.endTime < data.startTime))
  ) {
    errors.endDate =
      data.endDate < data.startDate
        ? "A data de término não pode ser anterior à data de início."
        : "No mesmo dia, o horário de término não pode ser anterior ao início.";
  }

  return errors;
}

export default function GeneralDataForm({
  onChange,
  onContinue,
}: GeneralDataFormProps) {
  const [data, setData] = useState<GeneralData>(initialData);
  const [errors, setErrors] = useState<Errors>({});
  const [success, setSuccess] = useState(false);
  const [rosterNotice, setRosterNotice] = useState("");
  const [rosterError, setRosterError] = useState("");

  useEffect(() => {
    let active = true;

    rosterRepository
      .getByDate(data.startDate)
      .then((roster) => {
        if (!active) return;
        setRosterError("");

        if (!roster) {
          setData((current) => ({
            ...current,
            officerName: "",
            officerId: null,
            auxiliaryName: "",
            auxiliaryId: null,
            driverName: "",
            driverId: null,
          }));
          setRosterNotice(
            "Não há escala cadastrada para a data inicial. Preencha os participantes manualmente; os campos continuam editáveis.",
          );
          return;
        }

        setData((current) => ({
          ...current,
          officerName: roster.officerName,
          officerId:
            officerOptions.find(
              (option) => option.name === roster.officerName,
            )?.id ?? null,
          auxiliaryName: roster.auxiliaryName,
          auxiliaryId:
            personnelOptions.find(
              (option) => option.name === roster.auxiliaryName,
            )?.id ?? null,
          driverName: roster.driverName,
          driverId:
            personnelOptions.find(
              (option) => option.name === roster.driverName,
            )?.id ?? null,
        }));
        setRosterNotice(
          "Sugestões da escala para esta data. Revise e ajuste os campos, se necessário.",
        );
      })
      .catch((cause: unknown) => {
        if (active) {
          setRosterError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível consultar a escala desta data.",
          );
          setRosterNotice("");
        }
      });

    return () => {
      active = false;
    };
  }, [data.startDate]);

  function updateData(changes: Partial<GeneralData>) {
    setData((current) => ({ ...current, ...changes }));
    setErrors({});
    setSuccess(false);
    onChange();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(data);
    setErrors(nextErrors);
    const isValid = Object.keys(nextErrors).length === 0;
    setSuccess(isValid);
    if (isValid) {
      onContinue(data);
    }
  }

  function handleReset() {
    setData(initialData);
    setErrors({});
    setSuccess(false);
    onChange();
  }

  const errorMessages = Object.values(errors).filter(
    (message): message is string => Boolean(message),
  );

  return (
    <form className="space-y-7" noValidate onSubmit={handleSubmit}>
      <div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="startDate"
            >
              Data de início <span className="text-[#b82029]">*</span>
            </label>
            <input
              aria-describedby={errors.startDate ? "startDate-error" : undefined}
              aria-invalid={Boolean(errors.startDate)}
              className={`${inputClassName} ${errors.startDate ? "border-red-600" : ""}`}
              id="startDate"
              onChange={(event) => updateData({ startDate: event.target.value })}
              type="date"
              value={data.startDate}
            />
            {errors.startDate ? (
              <p className="mt-1 text-xs font-medium text-red-700" id="startDate-error">
                {errors.startDate}
              </p>
            ) : null}
          </div>
          <div>
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="startTime"
            >
              Horário de início <span className="text-[#b82029]">*</span>
            </label>
            <input
              aria-describedby={errors.startTime ? "startTime-error" : undefined}
              aria-invalid={Boolean(errors.startTime)}
              className={`${inputClassName} ${errors.startTime ? "border-red-600" : ""}`}
              id="startTime"
              onChange={(event) => updateData({ startTime: event.target.value })}
              type="time"
              value={data.startTime}
            />
            {errors.startTime ? (
              <p className="mt-1 text-xs font-medium text-red-700" id="startTime-error">
                {errors.startTime}
              </p>
            ) : null}
          </div>
          <div>
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="endDate"
            >
              Data de término <span className="text-[#b82029]">*</span>
            </label>
            <input
              aria-describedby={errors.endDate ? "endDate-error" : undefined}
              aria-invalid={Boolean(errors.endDate)}
              className={`${inputClassName} ${errors.endDate ? "border-red-600" : ""}`}
              id="endDate"
              onChange={(event) => updateData({ endDate: event.target.value })}
              type="date"
              value={data.endDate}
            />
            {errors.endDate ? (
              <p className="mt-1 text-xs font-medium text-red-700" id="endDate-error">
                {errors.endDate}
              </p>
            ) : null}
          </div>
          <div>
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="endTime"
            >
              Horário de término <span className="text-[#b82029]">*</span>
            </label>
            <input
              aria-describedby={errors.endTime ? "endTime-error" : undefined}
              aria-invalid={Boolean(errors.endTime)}
              className={`${inputClassName} ${errors.endTime ? "border-red-600" : ""}`}
              id="endTime"
              onChange={(event) => updateData({ endTime: event.target.value })}
              type="time"
              value={data.endTime}
            />
            {errors.endTime ? (
              <p className="mt-1 text-xs font-medium text-red-700" id="endTime-error">
                {errors.endTime}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        {rosterNotice ? (
          <p
            className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900"
            role="status"
          >
            {rosterNotice}
          </p>
        ) : null}
        {rosterError ? (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-900"
            role="alert"
          >
            {rosterError}
          </p>
        ) : null}
        <div className="grid gap-5">
          <ParticipantSearch
            error={errors.officerName}
            hint="Selecione uma sugestão ou informe o nome de um oficial externo."
            id="officer"
            label="Oficial de Dia"
            onChange={(officerName, officerId) =>
              updateData({ officerName, officerId })
            }
            options={officerOptions}
            selectionRequired={false}
            value={data.officerName}
          />
          <ParticipantSearch
            error={errors.auxiliaryName}
            hint="É necessário selecionar um militar da lista."
            id="auxiliary"
            label="Auxiliar de Dia"
            onChange={(auxiliaryName, auxiliaryId) =>
              updateData({ auxiliaryName, auxiliaryId })
            }
            options={personnelOptions}
            selectionRequired
            value={data.auxiliaryName}
          />
          <ParticipantSearch
            error={errors.driverName}
            hint="É necessário selecionar um militar da lista."
            id="driver"
            label="Condutor"
            onChange={(driverName, driverId) =>
              updateData({ driverName, driverId })
            }
            options={personnelOptions}
            selectionRequired
            value={data.driverName}
          />
        </div>
      </div>

      {errorMessages.length > 0 ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          Revise os campos destacados antes de continuar.
        </div>
      ) : null}
      {success ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          Dados gerais validados neste navegador. Eles ainda não foram salvos.
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
        <button
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
          onClick={handleReset}
          type="button"
        >
          Limpar campos
        </button>
        <button
          className="min-h-11 rounded-xl bg-[#b82029] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#991b23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
          type="submit"
        >
          Validar e continuar
        </button>
      </div>
    </form>
  );
}
