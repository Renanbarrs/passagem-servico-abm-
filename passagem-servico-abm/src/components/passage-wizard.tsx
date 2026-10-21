"use client";

import { useState } from "react";
import FuelingDataForm from "@/components/fueling-data-form";
import GeneralDataForm from "@/components/general-data-form";
import VehicleDataForm, {
  initialVehicleData,
  type VehicleData,
  type VehicleId,
} from "@/components/vehicle-data-form";

const steps = [
  "Dados gerais",
  "Viaturas",
  "Abastecimentos",
  "Alterações",
  "Conferência",
];

export default function PassageWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [highestUnlockedStep, setHighestUnlockedStep] = useState(0);
  const [vehicleData, setVehicleData] =
    useState<Record<VehicleId, VehicleData>>(initialVehicleData);

  function handleGeneralDataEdit() {
    if (highestUnlockedStep > 0) {
      setHighestUnlockedStep(0);
      setCurrentStep(0);
    }
  }

  function handleGeneralDataContinue() {
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
            const isAvailable = index <= highestUnlockedStep;

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
            vehicleData={vehicleData}
          />
        </section>
      </div>
    </div>
  );
}
