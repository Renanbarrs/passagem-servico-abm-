"use client";

import { useState } from "react";
import AlterationsDataForm, {
  type ActionsBySector,
  type AlterationsData,
  type Occurrence,
} from "@/components/alterations-data-form";
import FuelingDataForm, {
  type ValidatedFueling,
} from "@/components/fueling-data-form";
import GeneralDataForm, {
  type GeneralData,
} from "@/components/general-data-form";
import PassageReview from "@/components/passage-review";
import VehicleDataForm, {
  initialVehicleData,
  type VehicleData,
  type VehicleId,
} from "@/components/vehicle-data-form";

const steps = [
  "Dados gerais",
  "Viaturas",
  "Abastecimentos",
  "Alterações e providências",
  "Conferência",
];

export default function PassageWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [highestUnlockedStep, setHighestUnlockedStep] = useState(0);
  const [vehicleData, setVehicleData] =
    useState<Record<VehicleId, VehicleData>>(initialVehicleData);
  const [generalData, setGeneralData] = useState<GeneralData | null>(null);
  const [fuelings, setFuelings] = useState<ValidatedFueling[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [actionsBySector, setActionsBySector] = useState<ActionsBySector>({
    Frota: "",
    Patrimônio: "",
    Pessoal: "",
  });
  const [demoFinalized, setDemoFinalized] = useState(false);

  function handleGeneralDataEdit() {
    if (highestUnlockedStep > 0) {
      setHighestUnlockedStep(0);
      setCurrentStep(0);
    }
  }

  function handleGeneralDataContinue(data: GeneralData) {
    setGeneralData(data);
    setHighestUnlockedStep((unlocked) => Math.max(unlocked, 1));
    setCurrentStep(1);
  }

  function handleVehicleEdit() {
    if (highestUnlockedStep > 1) {
      setHighestUnlockedStep(1);
      setCurrentStep(1);
    }
  }

  function handleVehicleContinue(data: Record<VehicleId, VehicleData>) {
    setVehicleData(data);
    setHighestUnlockedStep((unlocked) => Math.max(unlocked, 2));
    setCurrentStep(2);
  }

  function handleFuelingEdit() {
    if (highestUnlockedStep > 2) {
      setHighestUnlockedStep(2);
      setCurrentStep(2);
    }
  }

  function handleAlterationEdit() {
    if (highestUnlockedStep > 3) {
      setHighestUnlockedStep(3);
      setCurrentStep(3);
    }
  }

  function handleAlterationsContinue(data: AlterationsData) {
    setOccurrences(data.occurrences);
    setActionsBySector(data.actionsBySector);
    setHighestUnlockedStep((unlocked) => Math.max(unlocked, 4));
    setCurrentStep(4);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <nav
        aria-label="Etapas da passagem de serviço"
        className="overflow-x-auto overscroll-x-contain border-b border-slate-200 px-4 py-3 sm:px-6"
      >
        <ol className="flex min-w-max items-center sm:w-full">
          {steps.map((step, index) => {
            const isCurrent = index === currentStep;
            const isComplete = index < highestUnlockedStep;
            const isAvailable =
              !demoFinalized && index <= highestUnlockedStep;

            return (
              <li
                className="flex min-w-34.5 items-center sm:min-w-0 sm:flex-1"
                key={step}
              >
                <button
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 text-left text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029] sm:px-2 ${
                    isAvailable ? "cursor-pointer" : "cursor-not-allowed"
                  } ${
                    isCurrent
                      ? "text-[#a51e27]"
                      : isComplete
                        ? "text-emerald-800"
                        : "text-slate-600"
                  }`}
                  disabled={!isAvailable}
                  onClick={() => setCurrentStep(index)}
                  type="button"
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      isCurrent
                        ? "bg-[#b82029] text-white"
                        : isComplete
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isComplete ? "✓" : index + 1}
                  </span>
                  <span className="whitespace-nowrap">{step}</span>
                </button>
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={`mx-2 h-px min-w-3 flex-1 ${
                      index < highestUnlockedStep
                        ? "bg-emerald-300"
                        : "bg-slate-200"
                    }`}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="p-4 sm:p-6 lg:p-7">
        <section
          aria-labelledby="general-step-title"
          hidden={currentStep !== 0}
        >
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b31e27]">
              Etapa 1 de 5
            </p>
            <h2
              className="mt-1 text-lg font-bold text-[#252126]"
              id="general-step-title"
            >
              Identificação do serviço
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Informe as datas, horários e participantes do serviço.
            </p>
          </div>
          <GeneralDataForm
            onChange={handleGeneralDataEdit}
            onContinue={handleGeneralDataContinue}
          />
        </section>

        <section
          aria-labelledby="vehicle-step-title"
          hidden={currentStep !== 1}
        >
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b31e27]">
              Etapa 2 de 5
            </p>
            <h2
              className="mt-1 text-lg font-bold text-[#252126]"
              id="vehicle-step-title"
            >
              Controle de viaturas
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Registre a situação, os hodômetros, o tanque e as observações de
              cada viatura.
            </p>
          </div>
          <VehicleDataForm
            onBack={() => setCurrentStep(0)}
            onContinue={handleVehicleContinue}
            onEdit={handleVehicleEdit}
          />
        </section>

        <section
          aria-labelledby="fueling-step-title"
          hidden={currentStep !== 2}
        >
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b31e27]">
              Etapa 3 de 5
            </p>
            <h2
              className="mt-1 text-lg font-bold text-[#252126]"
              id="fueling-step-title"
            >
              Abastecimentos
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Registre zero ou mais abastecimentos realizados durante o
              serviço.
            </p>
          </div>
          <FuelingDataForm
            onBack={() => setCurrentStep(1)}
            onContinue={(data) => {
              setFuelings(data);
              setHighestUnlockedStep((unlocked) => Math.max(unlocked, 3));
              setCurrentStep(3);
            }}
            onEdit={handleFuelingEdit}
            servicePeriod={
              generalData
                ? {
                    startDate: generalData.startDate,
                    startTime: generalData.startTime,
                    endDate: generalData.endDate,
                    endTime: generalData.endTime,
                  }
                : null
            }
            vehicleData={vehicleData}
          />
        </section>

        <section
          aria-labelledby="alterations-step-title"
          hidden={currentStep !== 3}
        >
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b31e27]">
              Etapa 4 de 5
            </p>
            <h2
              className="mt-1 text-lg font-bold text-[#252126]"
              id="alterations-step-title"
            >
              Alterações do serviço
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Registre ocorrências, confirme ausência de alterações e anote
              providências por setor.
            </p>
          </div>
          <AlterationsDataForm
            onBack={() => setCurrentStep(2)}
            onContinue={handleAlterationsContinue}
            onEdit={handleAlterationEdit}
          />
        </section>

        <section
          aria-labelledby="review-step-title"
          hidden={currentStep !== 4}
        >
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b31e27]">
              Etapa 5 de 5
            </p>
            <h2
              className="mt-1 text-lg font-bold text-[#252126]"
              id="review-step-title"
            >
              Conferência da passagem
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Revise os dados reunidos antes de uma futura finalização.
            </p>
          </div>
          <PassageReview
            actionsBySector={actionsBySector}
            fuelings={fuelings}
            generalData={generalData}
            isFinalized={demoFinalized}
            onFinalize={() => setDemoFinalized(true)}
            occurrences={occurrences}
            onEditStep={setCurrentStep}
            vehicleData={vehicleData}
          />
        </section>
      </div>
    </div>
  );
}
