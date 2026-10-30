"use client";

import { useState, type ReactNode } from "react";
import {
  noChangeText,
  occurrenceCategories,
  type ActionsBySector,
  type Occurrence,
} from "@/components/alterations-data-form";
import type { ValidatedFueling } from "@/components/fueling-data-form";
import type { GeneralData } from "@/components/general-data-form";
import type {
  VehicleData,
  VehicleId,
} from "@/components/vehicle-data-form";
import {
  isDateTimeWithinPeriod,
  isValidDateInput,
  isValidTimeInput,
  parseNonNegativeSafeInteger,
} from "@/lib/passage/validation";

type PassageReviewProps = {
  generalData: GeneralData | null;
  vehicleData: Record<VehicleId, VehicleData>;
  fuelings: ValidatedFueling[];
  occurrences: Occurrence[];
  actionsBySector: ActionsBySector;
  onEditStep: (step: number) => void;
  onFinalize: () => void;
  isFinalized: boolean;
};

const vehicles: {
  id: VehicleId;
  model: string;
  fuel: string;
}[] = [
  { id: "APS-112", model: "Ford Ka", fuel: "Gasolina" },
  { id: "AR-99", model: "Mitsubishi L200 Triton", fuel: "Diesel S10" },
];

function display(value: string | number | null | undefined) {
  return value === null || value === undefined || value === ""
    ? "Não informado"
    : String(value);
}

function formatDate(value: string) {
  if (!value) return "Não informado";
  if (!isValidDateInput(value)) return "Data inválida";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getVehicleDistance(vehicle: VehicleData) {
  const initial = parseNonNegativeSafeInteger(vehicle.initialOdometer);
  const final = parseNonNegativeSafeInteger(vehicle.finalOdometer);
  return initial !== null && final !== null && final >= initial
    ? final - initial
    : null;
}

function ReviewSection({
  title,
  onEdit,
  isFinalized,
  children,
}: {
  title: string;
  onEdit: () => void;
  isFinalized: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <h3 className="text-base font-bold text-[#252126]">{title}</h3>
        <button
          className="min-h-10 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isFinalized}
          onClick={onEdit}
          type="button"
        >
          Editar
        </button>
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

function DetailList({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-medium text-slate-500">{label}</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-sm font-semibold text-slate-800">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function PassageReview({
  generalData,
  vehicleData,
  fuelings,
  occurrences,
  actionsBySector,
  onEditStep,
  onFinalize,
  isFinalized,
}: PassageReviewProps) {
  const [confirmingFinalize, setConfirmingFinalize] = useState(false);
  const hasOccurrence = occurrences.length > 0;
  const warnings = vehicles.flatMap(({ id }) => {
    const vehicle = vehicleData[id];
    if (vehicle.status === "Baixada") {
      return vehicle.notes.trim()
        ? []
        : [`Informe a justificativa da baixa da viatura ${id}.`];
    }

    const issues: string[] = [];
    const initial = parseNonNegativeSafeInteger(vehicle.initialOdometer);
    const final = parseNonNegativeSafeInteger(vehicle.finalOdometer);
    if (initial === null) {
      issues.push(`Confira o hodômetro inicial da viatura ${id}.`);
    }
    if (final === null || (initial !== null && final < initial)) {
      issues.push(`Confira o hodômetro final da viatura ${id}.`);
    }
    if (!vehicle.tankLevel) {
      issues.push(`Informe o nível do tanque da viatura ${id}.`);
    }
    return issues;
  });

  if (!generalData) {
    warnings.unshift("Os dados gerais ainda não foram validados.");
  } else {
    const validServicePeriod =
      isValidDateInput(generalData.startDate) &&
      isValidTimeInput(generalData.startTime) &&
      isValidDateInput(generalData.endDate) &&
      isValidTimeInput(generalData.endTime);
    if (!validServicePeriod) {
      warnings.unshift("Confira as datas e os horários do serviço.");
    } else if (
      generalData.endDate < generalData.startDate ||
      (generalData.endDate === generalData.startDate &&
        generalData.endTime < generalData.startTime)
    ) {
      warnings.unshift("A data ou horário final não pode anteceder o início.");
    }
    if (!generalData.officerName.trim()) {
      warnings.push("Informe o Oficial de Dia.");
    }
    if (!generalData.auxiliaryId || !generalData.driverId) {
      warnings.push("Selecione Auxiliar e Condutor cadastrados.");
    }
  }
  if (!hasOccurrence) {
    warnings.push("Registre uma ocorrência ou confirme “Sem alteração”.");
  }
  const noChangeOccurrences = occurrences.filter(
    (occurrence) => occurrence.isNoChange,
  );
  const realOccurrences = occurrences.filter(
    (occurrence) => !occurrence.isNoChange,
  );
  if (noChangeOccurrences.length > 0) {
    if (
      noChangeOccurrences.length !== 1 ||
      realOccurrences.length > 0 ||
      noChangeOccurrences[0].category !== "Sem alteração" ||
      noChangeOccurrences[0].description !== noChangeText ||
      Boolean(noChangeOccurrences[0].date) ||
      Boolean(noChangeOccurrences[0].time)
    ) {
      warnings.push("Revise a confirmação exclusiva de “Sem alteração”.");
    }
  } else {
    for (const occurrence of realOccurrences) {
      if (
        !occurrenceCategories.some(
          (category) => category === occurrence.category,
        ) ||
        !occurrence.description.trim()
      ) {
        warnings.push("Revise a categoria e a descrição das ocorrências.");
        break;
      }
      if (occurrence.date && !isValidDateInput(occurrence.date)) {
        warnings.push("Informe datas válidas nas ocorrências.");
        break;
      }
      if (occurrence.time && !isValidTimeInput(occurrence.time)) {
        warnings.push("Informe horários válidos nas ocorrências.");
        break;
      }
    }
  }

  if (fuelings.length > 0 && generalData) {
    for (const fueling of fuelings) {
      const vehicle = vehicleData[fueling.vehicleId];
      const initial = parseNonNegativeSafeInteger(vehicle.initialOdometer);
      const final = parseNonNegativeSafeInteger(vehicle.finalOdometer);
      if (
        !Number.isSafeInteger(fueling.odometer) ||
        fueling.odometer < 0 ||
        !Number.isFinite(fueling.liters) ||
        fueling.liters < 0 ||
        !Number.isFinite(fueling.amount) ||
        fueling.amount < 0 ||
        !Number.isFinite(fueling.balance) ||
        fueling.balance < 0
      ) {
        warnings.push(
          `Revise os valores do abastecimento ${fueling.id}.`,
        );
        continue;
      }
      if (
        !isValidDateInput(fueling.date) ||
        !isValidTimeInput(fueling.time)
      ) {
        warnings.push(
          `Revise a data e o horário do abastecimento ${fueling.id}.`,
        );
        continue;
      }
      if (
        isValidDateInput(generalData.startDate) &&
        isValidTimeInput(generalData.startTime) &&
        isValidDateInput(generalData.endDate) &&
        isValidTimeInput(generalData.endTime) &&
        !isDateTimeWithinPeriod(fueling.date, fueling.time, generalData)
      ) {
        warnings.push(
          `O abastecimento ${fueling.id} está fora do período do serviço.`,
        );
      }
      if (
        initial !== null &&
        final !== null &&
        final >= initial &&
        (fueling.odometer < initial || fueling.odometer > final)
      ) {
        warnings.push(
          `O hodômetro do abastecimento ${fueling.id} está fora do intervalo atual da viatura ${fueling.vehicleId}.`,
        );
      }
    }
  }

  const completed = warnings.length === 0;
  const allActions = Object.entries(actionsBySector).filter(([, value]) =>
    value.trim(),
  );
  const noChange = occurrences.some((occurrence) => occurrence.isNoChange);
  const totalLiters = fuelings.reduce(
    (total, fueling) => total + fueling.liters,
    0,
  );
  const totalAmount = fuelings.reduce(
    (total, fueling) => total + fueling.amount,
    0,
  );

  return (
    <div className="space-y-5">
      {isFinalized ? (
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-950"
          role="status"
        >
          <h3 className="font-bold">Demonstração concluída</h3>
          <p className="mt-1 text-sm leading-6">
            Esta passagem foi apenas concluída nesta sessão de demonstração.
            Nenhum dado foi salvo; ao recarregar ou sair, o conteúdo será
            perdido.
          </p>
        </div>
      ) : null}

      <div
        className={`rounded-2xl border px-4 py-4 ${
          completed
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : "border-amber-200 bg-amber-50 text-amber-950"
        }`}
        role={completed ? "status" : "alert"}
      >
        <h3 className="font-bold">
          {completed
            ? "Conferência pronta"
            : "Há itens para revisar antes de finalizar"}
        </h3>
        {completed ? (
          <p className="mt-1 text-sm leading-6">
            As etapas obrigatórias foram preenchidas. Revise o resumo abaixo.
            {isFinalized
              ? " Esta conclusão é apenas demonstrativa; os dados não foram salvos."
              : " A passagem ainda não foi concluída nem salva."}
          </p>
        ) : (
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
      </div>

      <ReviewSection
        isFinalized={isFinalized}
        title="Dados gerais"
        onEdit={() => onEditStep(0)}
      >
        <DetailList
          items={[
            [
              "Período",
              generalData
                ? `${formatDate(generalData.startDate)} ${generalData.startTime} até ${formatDate(generalData.endDate)} ${generalData.endTime}`
                : "Não validado",
            ],
            ["Oficial de Dia", display(generalData?.officerName)],
            ["Auxiliar de Dia", display(generalData?.auxiliaryName)],
            ["Condutor", display(generalData?.driverName)],
          ]}
        />
      </ReviewSection>

      <ReviewSection
        isFinalized={isFinalized}
        title="Viaturas"
        onEdit={() => onEditStep(1)}
      >
        <div className="space-y-4">
          {vehicles.map(({ id, model, fuel }) => {
            const vehicle = vehicleData[id];
            const distance = getVehicleDistance(vehicle);
            return (
              <div
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                key={id}
              >
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="font-bold text-slate-900">
                    {id} · {model}
                  </h4>
                  <span className="text-xs text-slate-500">{fuel}</span>
                </div>
                <DetailList
                  items={[
                    ["Situação", vehicle.status],
                    ["Hodômetro inicial", vehicle.initialOdometer ? `${vehicle.initialOdometer} km` : "Não informado"],
                    ["Hodômetro final", vehicle.finalOdometer ? `${vehicle.finalOdometer} km` : "Não informado"],
                    ["Distância", distance === null ? "Não calculada" : `${distance.toLocaleString("pt-BR")} km`],
                    ["Nível do tanque", display(vehicle.tankLevel)],
                    ["Observações", display(vehicle.notes.trim())],
                  ]}
                />
              </div>
            );
          })}
        </div>
      </ReviewSection>

      <ReviewSection
        isFinalized={isFinalized}
        title="Abastecimentos"
        onEdit={() => onEditStep(2)}
      >
        {fuelings.length === 0 ? (
          <p className="text-sm text-slate-600">
            Nenhum abastecimento informado, conforme permitido.
          </p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900">
                {fuelings.length} lançamento(s)
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900">
                Volume total: {totalLiters.toLocaleString("pt-BR")} L
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900">
                Valor total: {formatCurrency(totalAmount)}
              </span>
            </div>
            <div className="space-y-3">
              {fuelings.map((fueling) => (
                <div
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  key={fueling.id}
                >
                  <DetailList
                    items={[
                      ["Viatura", fueling.vehicleId],
                      ["Data e horário", `${formatDate(fueling.date)} ${fueling.time}`],
                      ["Responsável", fueling.responsible],
                      ["Hodômetro", `${fueling.odometer.toLocaleString("pt-BR")} km`],
                      ["Volume", `${fueling.liters.toLocaleString("pt-BR")} L`],
                      ["Valor", formatCurrency(fueling.amount)],
                      ["Saldo informado", formatCurrency(fueling.balance)],
                      ["Comprovante", fueling.receiptName || "Não anexado"],
                    ]}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </ReviewSection>

      <ReviewSection
        isFinalized={isFinalized}
        title="Alterações e providências"
        onEdit={() => onEditStep(3)}
      >
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">
              Alterações
            </h4>
            {noChange ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
                O serviço transcorreu sem alterações
              </p>
            ) : (
              <ul className="space-y-2">
                {occurrences.map((occurrence) => (
                  <li
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    key={occurrence.id}
                  >
                    <p className="text-xs font-semibold text-slate-600">
                      {occurrence.category}
                      {occurrence.date
                        ? ` · ${formatDate(occurrence.date)}`
                        : ""}
                      {occurrence.time ? ` · ${occurrence.time}` : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                      {occurrence.description}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">
              Providências por setor
            </h4>
            {allActions.length === 0 ? (
              <p className="text-sm text-slate-600">
                Nenhuma providência informada.
              </p>
            ) : (
              <DetailList
                items={allActions.map(([sector, action]) => [sector, action])}
              />
            )}
          </div>
        </div>
      </ReviewSection>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        A conclusão abaixo é apenas demonstrativa. Não equivale a uma
        finalização oficial, assinatura, persistência nem registro de auditoria.
      </div>

      {!isFinalized ? (
        <div className="border-t border-slate-200 pt-5">
          {confirmingFinalize ? (
            <div
              aria-labelledby="confirm-demo-finalization-title"
              className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5"
              role="group"
            >
              <h3
                className="font-bold text-amber-950"
                id="confirm-demo-finalization-title"
              >
                Confirmar conclusão demonstrativa?
              </h3>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                Revise se as informações estão corretas. Esta ação não salva a
                passagem e não poderá ser desfeita nesta sessão.
              </p>
              <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
                  onClick={() => setConfirmingFinalize(false)}
                  type="button"
                >
                  Voltar à conferência
                </button>
                <button
                  className="min-h-11 rounded-xl bg-[#b82029] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#991b23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
                  disabled={!completed}
                  onClick={onFinalize}
                  type="button"
                >
                  Confirmar conclusão demonstrativa
                </button>
              </div>
            </div>
          ) : (
            <button
              className="min-h-11 rounded-xl bg-[#b82029] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#991b23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              disabled={!completed}
              onClick={() => setConfirmingFinalize(true)}
              type="button"
            >
              Concluir demonstração
            </button>
          )}
          {!completed ? (
            <p className="mt-2 text-xs text-slate-600">
              Resolva as pendências listadas acima antes de concluir a
              demonstração.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
