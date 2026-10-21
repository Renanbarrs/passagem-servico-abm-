"use client";

import { useState, type FormEvent } from "react";

export type VehicleStatus = "Operacional" | "Baixada";

export type VehicleData = {
  status: VehicleStatus;
  initialOdometer: string;
  finalOdometer: string;
  tankLevel: string;
  notes: string;
};

export type VehicleId = "APS-112" | "AR-99";
type VehicleErrors = Partial<Record<keyof VehicleData, string>>;
type FormErrors = Partial<Record<VehicleId, VehicleErrors>>;

const vehicles: {
  id: VehicleId;
  model: string;
  fuel: string;
}[] = [
  { id: "APS-112", model: "Ford Ka", fuel: "Gasolina" },
  { id: "AR-99", model: "Mitsubishi L200 Triton", fuel: "Diesel S10" },
];

const tankLevels = [
  "CHEIO",
  "↑ 3/4",
  "3/4",
  "↓ 3/4",
  "2/4 (meio)",
  "1/4",
] as const;

export const initialVehicleData: Record<VehicleId, VehicleData> = {
  "APS-112": {
    status: "Operacional",
    initialOdometer: "",
    finalOdometer: "",
    tankLevel: "",
    notes: "",
  },
  "AR-99": {
    status: "Operacional",
    initialOdometer: "",
    finalOdometer: "",
    tankLevel: "",
    notes: "",
  },
};

const inputClassName =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#b82029] focus:ring-4 focus:ring-[#b82029]/10";

function getDistance(vehicle: VehicleData) {
  if (!vehicle.initialOdometer || !vehicle.finalOdometer) return null;

  const initial = Number(vehicle.initialOdometer);
  const final = Number(vehicle.finalOdometer);

  if (
    !Number.isInteger(initial) ||
    !Number.isInteger(final) ||
    initial < 0 ||
    final < initial
  ) {
    return null;
  }

  return final - initial;
}

function validateVehicle(vehicle: VehicleData): VehicleErrors {
  const errors: VehicleErrors = {};

  if (vehicle.status === "Baixada") {
    if (!vehicle.notes.trim()) {
      errors.notes = "Informe o motivo da baixa nas observações.";
    }
    return errors;
  }

  if (!vehicle.initialOdometer.trim()) {
    errors.initialOdometer = "Informe o hodômetro inicial.";
  } else if (
    !/^\d+$/.test(vehicle.initialOdometer) ||
    !Number.isSafeInteger(Number(vehicle.initialOdometer))
  ) {
    errors.initialOdometer = "Informe um hodômetro inteiro e não negativo.";
  }

  if (!vehicle.finalOdometer.trim()) {
    errors.finalOdometer = "Informe o hodômetro final.";
  } else if (
    !/^\d+$/.test(vehicle.finalOdometer) ||
    !Number.isSafeInteger(Number(vehicle.finalOdometer))
  ) {
    errors.finalOdometer = "Informe um hodômetro inteiro e não negativo.";
  }

  if (
    vehicle.initialOdometer &&
    vehicle.finalOdometer &&
    /^\d+$/.test(vehicle.initialOdometer) &&
    /^\d+$/.test(vehicle.finalOdometer) &&
    Number(vehicle.finalOdometer) < Number(vehicle.initialOdometer)
  ) {
    errors.finalOdometer =
      "O hodômetro final não pode ser menor que o inicial.";
  }

  if (!vehicle.tankLevel) {
    errors.tankLevel = "Selecione o nível do tanque.";
  }

  return errors;
}

function isValid(errors: FormErrors) {
  return Object.keys(errors).length === 0;
}

type VehicleDataFormProps = {
  onBack: () => void;
  onContinue: (data: Record<VehicleId, VehicleData>) => void;
  onEdit: () => void;
};

export default function VehicleDataForm({
  onBack,
  onContinue,
  onEdit,
}: VehicleDataFormProps) {
  const [data, setData] =
    useState<Record<VehicleId, VehicleData>>(initialVehicleData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);

  function updateVehicle(
    id: VehicleId,
    changes: Partial<VehicleData>,
  ) {
    onEdit();
    setData((current) => ({
      ...current,
      [id]: { ...current[id], ...changes },
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setSuccess(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    for (const vehicle of vehicles) {
      const vehicleErrors = validateVehicle(data[vehicle.id]);
      if (Object.keys(vehicleErrors).length > 0) {
        nextErrors[vehicle.id] = vehicleErrors;
      }
    }

    setErrors(nextErrors);
    setSuccess(isValid(nextErrors));
    if (isValid(nextErrors)) {
      onContinue(data);
    }
  }

  function handleReset() {
    onEdit();
    setData(initialVehicleData);
    setErrors({});
    setSuccess(false);
  }

  const hasErrors = !isValid(errors);

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-950">
        Não há histórico de passagens salvo para sugerir hodômetros iniciais.
        Informe e confira os valores manualmente nesta etapa.
      </div>

      {vehicles.map((vehicle) => {
        const value = data[vehicle.id];
        const vehicleErrors = errors[vehicle.id] ?? {};
        const distance = getDistance(value);

        return (
          <section
            aria-labelledby={`${vehicle.id}-title`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            key={vehicle.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b31e27]">
                  {vehicle.fuel}
                </p>
                <h2
                  className="mt-1 text-lg font-bold text-[#252126]"
                  id={`${vehicle.id}-title`}
                >
                  {vehicle.id}
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">{vehicle.model}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  value.status === "Operacional"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-amber-50 text-amber-900"
                }`}
              >
                {value.status}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="text-sm font-semibold text-slate-800"
                  htmlFor={`${vehicle.id}-status`}
                >
                  Situação <span className="text-[#b82029]">*</span>
                </label>
                <select
                  className={inputClassName}
                  id={`${vehicle.id}-status`}
                  onChange={(event) =>
                    updateVehicle(vehicle.id, {
                      status: event.target.value as VehicleStatus,
                    })
                  }
                  value={value.status}
                >
                  <option value="Operacional">Operacional</option>
                  <option value="Baixada">Baixada</option>
                </select>
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-slate-800"
                  htmlFor={`${vehicle.id}-initial`}
                >
                  Hodômetro inicial (km)
                  {value.status === "Operacional" ? (
                    <span className="text-[#b82029]"> *</span>
                  ) : null}
                </label>
                <input
                  aria-describedby={
                    vehicleErrors.initialOdometer
                      ? `${vehicle.id}-initial-error`
                      : `${vehicle.id}-initial-hint`
                  }
                  aria-invalid={Boolean(vehicleErrors.initialOdometer)}
                  className={`${inputClassName} ${vehicleErrors.initialOdometer ? "border-red-600" : ""}`}
                  id={`${vehicle.id}-initial`}
                  inputMode="numeric"
                  min="0"
                  onChange={(event) =>
                    updateVehicle(vehicle.id, {
                      initialOdometer: event.target.value,
                    })
                  }
                  placeholder="Informe o valor"
                  step="1"
                  type="number"
                  value={value.initialOdometer}
                />
                {vehicleErrors.initialOdometer ? (
                  <p
                    className="mt-1 text-xs font-medium text-red-700"
                    id={`${vehicle.id}-initial-error`}
                  >
                    {vehicleErrors.initialOdometer}
                  </p>
                ) : (
                  <p
                    className="mt-1.5 text-xs leading-5 text-slate-500"
                    id={`${vehicle.id}-initial-hint`}
                  >
                    Sem sugestão de histórico disponível; o valor permanece
                    editável.
                  </p>
                )}
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-slate-800"
                  htmlFor={`${vehicle.id}-final`}
                >
                  Hodômetro final (km)
                  {value.status === "Operacional" ? (
                    <span className="text-[#b82029]"> *</span>
                  ) : null}
                </label>
                <input
                  aria-describedby={
                    vehicleErrors.finalOdometer
                      ? `${vehicle.id}-final-error`
                      : `${vehicle.id}-final-hint`
                  }
                  aria-invalid={Boolean(vehicleErrors.finalOdometer)}
                  className={`${inputClassName} ${vehicleErrors.finalOdometer ? "border-red-600" : ""}`}
                  id={`${vehicle.id}-final`}
                  inputMode="numeric"
                  min="0"
                  onChange={(event) =>
                    updateVehicle(vehicle.id, {
                      finalOdometer: event.target.value,
                    })
                  }
                  placeholder="Informado pelo Condutor"
                  step="1"
                  type="number"
                  value={value.finalOdometer}
                />
                {vehicleErrors.finalOdometer ? (
                  <p
                    className="mt-1 text-xs font-medium text-red-700"
                    id={`${vehicle.id}-final-error`}
                  >
                    {vehicleErrors.finalOdometer}
                  </p>
                ) : (
                  <p
                    className="mt-1.5 text-xs leading-5 text-slate-500"
                    id={`${vehicle.id}-final-hint`}
                  >
                    Preencha com a informação do Condutor.
                  </p>
                )}
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-slate-800"
                  htmlFor={`${vehicle.id}-tank`}
                >
                  Nível do tanque
                  {value.status === "Operacional" ? (
                    <span className="text-[#b82029]"> *</span>
                  ) : null}
                </label>
                <select
                  aria-describedby={
                    vehicleErrors.tankLevel
                      ? `${vehicle.id}-tank-error`
                      : undefined
                  }
                  aria-invalid={Boolean(vehicleErrors.tankLevel)}
                  className={`${inputClassName} ${vehicleErrors.tankLevel ? "border-red-600" : ""}`}
                  id={`${vehicle.id}-tank`}
                  onChange={(event) =>
                    updateVehicle(vehicle.id, { tankLevel: event.target.value })
                  }
                  value={value.tankLevel}
                >
                  <option value="">Selecione o nível</option>
                  {tankLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                {vehicleErrors.tankLevel ? (
                  <p
                    className="mt-1 text-xs font-medium text-red-700"
                    id={`${vehicle.id}-tank-error`}
                  >
                    {vehicleErrors.tankLevel}
                  </p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label
                  className="text-sm font-semibold text-slate-800"
                  htmlFor={`${vehicle.id}-notes`}
                >
                  Observações
                  {value.status === "Baixada" ? (
                    <span className="text-[#b82029]"> · motivo obrigatório</span>
                  ) : (
                    <span className="font-normal text-slate-500"> · opcional</span>
                  )}
                </label>
                <textarea
                  aria-describedby={
                    vehicleErrors.notes ? `${vehicle.id}-notes-error` : undefined
                  }
                  aria-invalid={Boolean(vehicleErrors.notes)}
                  className={`${inputClassName} min-h-24 resize-y py-3 ${vehicleErrors.notes ? "border-red-600" : ""}`}
                  id={`${vehicle.id}-notes`}
                  onChange={(event) =>
                    updateVehicle(vehicle.id, { notes: event.target.value })
                  }
                  placeholder={
                    value.status === "Baixada"
                      ? "Descreva o motivo da baixa"
                      : "Registre informações relevantes (opcional)"
                  }
                  value={value.notes}
                />
                {vehicleErrors.notes ? (
                  <p
                    className="mt-1 text-xs font-medium text-red-700"
                    id={`${vehicle.id}-notes-error`}
                  >
                    {vehicleErrors.notes}
                  </p>
                ) : null}
              </div>
            </div>

            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                distance === null
                  ? "bg-slate-50 text-slate-600"
                  : "bg-blue-50 text-blue-950"
              }`}
              role="status"
            >
              {value.status === "Baixada"
                ? "Viatura baixada: informe o motivo nas observações."
                : distance === null
                  ? "Distância do serviço: aguardando hodômetros válidos."
                  : `Distância percorrida: ${distance.toLocaleString("pt-BR")} km`}
            </div>
          </section>
        );
      })}

      {hasErrors ? (
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
          Dados das viaturas validados neste navegador. Nada foi salvo.
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
        <button
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
          onClick={onBack}
          type="button"
        >
          Voltar para Dados gerais
        </button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
            onClick={handleReset}
            type="button"
          >
            Limpar viaturas
          </button>
          <button
            className="min-h-11 rounded-xl bg-[#b82029] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#991b23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
            type="submit"
          >
            Validar e continuar
          </button>
        </div>
      </div>
    </form>
  );
}
