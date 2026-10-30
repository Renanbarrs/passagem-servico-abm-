import type { ReactNode } from "react";
import Link from "next/link";
import PortalShell from "@/components/portal/portal-shell";

type ModuleIconName =
  | "overview"
  | "new"
  | "vehicle"
  | "fuel"
  | "notes"
  | "history";

const modules: {
  title: string;
  description: string;
  icon: Exclude<ModuleIconName, "overview" | "new">;
  status: "Em desenvolvimento" | "Consulta demonstrativa" | "Disponível";
  href?: string;
}[] = [
  {
    title: "QIS",
    description: "Consulta da rotina semanal diretamente no portal",
    icon: "vehicle",
    status: "Consulta demonstrativa",
    href: "/qis",
  },
  {
    title: "Escalas de Serviço",
    description: "Calendário mensal e designações por data",
    icon: "fuel",
    status: "Consulta demonstrativa",
    href: "/escalas",
  },
  {
    title: "Avisos e Determinações",
    description: "Mural de publicações internas",
    icon: "notes",
    status: "Consulta demonstrativa",
    href: "/avisos",
  },
  {
    title: "Passagem de Serviço",
    description: "Dados gerais, viaturas e abastecimentos",
    icon: "history",
    status: "Disponível",
  },
];

const iconPaths: Record<ModuleIconName, ReactNode> = {
  overview: (
    <>
      <rect height="7" rx="1" width="7" x="3" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="3" />
      <rect height="7" rx="1" width="7" x="3" y="14" />
      <rect height="7" rx="1" width="7" x="14" y="14" />
    </>
  ),
  new: <path d="M12 5v14M5 12h14" />,
  vehicle: (
    <>
      <path d="M3 13.5 5 7h14l2 6.5" />
      <path d="M3 13.5h18v5H3zM6.5 18.5v2m11-2v2" />
      <circle cx="7" cy="16.5" r=".75" />
      <circle cx="17" cy="16.5" r=".75" />
    </>
  ),
  fuel: (
    <>
      <path d="M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17M4 21h12M7 7h6v5H7z" />
      <path d="M15 8h2l2 2v7a2 2 0 0 0 4 0v-5l-2-2" />
    </>
  ),
  notes: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M14 3v5h5M9 12h7m-7 4h7" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
      <path d="M3 3v5h5m4-1v5l3 2" />
    </>
  ),
};

function Icon({ name, className = "size-5" }: { name: ModuleIconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {iconPaths[name]}
    </svg>
  );
}

export default function Home() {
  return (
    <PortalShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-9">
        <section
          aria-labelledby="welcome-title"
          className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1.5 bg-[#356cf0]"
          />
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#356cf0]">
                Portal institucional
              </p>
              <h1
                className="mt-2 text-2xl font-bold tracking-tight text-[#17233a] sm:text-3xl"
                id="welcome-title"
              >
                Bem-vindo ao Portal ABM
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Acesse a Passagem de Serviço e acompanhe os módulos internos
                que serão reunidos neste portal.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#356cf0] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#245bde] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                href="/nova-passagem"
              >
                <Icon name="new" />
                Nova passagem de serviço
              </Link>
              <p className="mt-2 text-center text-xs text-slate-500">
                Dados temporários · sem salvamento
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="modules-title" className="mt-8">
          <div className="mb-4">
            <h2
              className="text-lg font-bold tracking-tight text-[#17233a]"
              id="modules-title"
            >
              Módulos do portal
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              QIS, Escalas e o mural estão disponíveis em demonstrações
              locais; os demais módulos serão construídos em etapas.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => (
              <article
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                key={module.title}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-[#356cf0]">
                    <Icon className="size-5" name={module.icon} />
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      module.status !== "Em desenvolvimento"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {module.status}
                  </span>
                </div>
                <h3 className="mt-4 font-bold text-slate-900">
                  {module.title}
                </h3>
                <p className="mt-1 min-h-10 text-sm leading-5 text-slate-600">
                  {module.description}
                </p>
                {module.href || module.status === "Disponível" ? (
                  <Link
                    className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-[#245bde] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    href={module.href ?? "/nova-passagem"}
                  >
                    {module.title === "QIS"
                      ? "Consultar QIS"
                      : module.title === "Escalas de Serviço"
                        ? "Abrir calendário"
                        : module.title === "Avisos e Determinações"
                          ? "Abrir mural"
                          : "Abrir módulo"}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-xs leading-5 text-blue-950">
          Ambiente de demonstração: ainda não há banco de dados conectado.
          Indicadores operacionais serão exibidos quando houver dados
          disponíveis. Use somente informações fictícias.
        </footer>
      </div>
    </PortalShell>
  );
}