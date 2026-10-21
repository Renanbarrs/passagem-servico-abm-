import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

type ModuleIconName = "overview" | "new" | "vehicle" | "fuel" | "notes" | "history";

const modules: {
  title: string;
  description: string;
  icon: Exclude<ModuleIconName, "overview" | "new">;
}[] = [
  {
    title: "Viaturas",
    description: "Condição, hodômetros e nível do tanque",
    icon: "vehicle",
  },
  {
    title: "Abastecimentos",
    description: "Registros de combustível e comprovantes",
    icon: "fuel",
  },
  {
    title: "Alterações de serviço",
    description: "Ocorrências e providências",
    icon: "notes",
  },
  {
    title: "Histórico",
    description: "Consulta de passagens e relatórios",
    icon: "history",
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
    <main className="min-h-screen bg-[#eef0f3] text-slate-900 lg:flex">
      <aside className="flex shrink-0 flex-col bg-[#171316] text-slate-200 lg:min-h-screen lg:w-64">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div
            className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-0.5 shadow-md shadow-black/20"
          >
            <Image
              alt="Brasão da Academia de Bombeiro Militar"
              className="h-full w-full object-contain"
              height={910}
              priority
              src="/abm-logo.png"
              width={768}
            />
          </div>
          <div>
            <p className="text-xs font-black tracking-wider text-white uppercase leading-tight">
              PASSAGEM<br />DE SERVIÇO
            </p>
            <p className="text-[10px] font-medium tracking-wider text-white/70">
              ACADEMIA BOMBEIRO MILITAR
            </p>
          </div>
        </div>

        <div className="px-4 py-5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Geral
          </p>
          <div
            aria-current="page"
            className="mt-2 flex items-center gap-3 rounded-xl border-l-2 border-[#d52932] bg-[#3a2025] px-3 py-3 text-sm font-semibold text-white"
          >
            <Icon className="size-4.5 text-[#f08a8e]" name="overview" />
            Visão geral
          </div>
        </div>

        <nav aria-label="Módulos do sistema" className="px-4 pb-5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Módulos
          </p>
          <ul className="mt-2 space-y-1">
            {modules.map((module) => (
              <li
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400"
                key={module.title}
              >
                <Icon className="size-4.5 text-slate-500" name={module.icon} />
                <span className="min-w-0 flex-1">{module.title}</span>
                <span className="rounded-full bg-white/5 px-2 py-1 text-[9px] font-semibold text-slate-500">
                  Em breve
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto hidden px-5 pb-5 lg:block">
          <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
            <p className="text-xs font-semibold text-slate-200">
              Ambiente de desenvolvimento
            </p>
            <p className="mt-1.5 text-xs leading-5 text-slate-400">
              Use somente dados fictícios nesta etapa.
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-t-2 border-[#c8212b] bg-white shadow-sm">
          <div className="flex min-h-16 items-center justify-between gap-4 px-5 sm:px-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-slate-500">
                ABM · Sistema interno
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                Painel inicial
              </p>
            </div>
            <span className="rounded-full border border-[#f1c8ca] bg-[#fff5f5] px-3 py-1.5 text-[11px] font-semibold text-[#a91f28]">
              Protótipo em desenvolvimento
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">
          <section
            aria-labelledby="welcome-title"
            className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1.5 bg-[#c8212b]"
            />
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b31e27]">
                  Controle de serviço
                </p>
                <h1
                  className="mt-2 text-2xl font-bold tracking-tight text-[#252126] sm:text-3xl"
                  id="welcome-title"
                >
                  Passagem de Serviço
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                  Bem-vindo ao painel da ABM. Aqui ficarão reunidos os registros
                  e informações da passagem diária de serviço.
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#b82029] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#991b23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
                  href="/nova-passagem"
                >
                  <Icon name="new" />
                  Nova passagem de serviço
                </Link>
                <p
                  className="mt-2 text-center text-xs text-slate-500"
                >
                  Primeira etapa disponível · sem gravação
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="modules-title" className="mt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2
                  className="text-lg font-bold tracking-tight text-[#252126]"
                  id="modules-title"
                >
                  Módulos do sistema
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Áreas previstas para as próximas etapas do projeto.
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                4 módulos planejados
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {modules.map((module) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  key={module.title}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid size-11 place-items-center rounded-xl bg-[#f9e9ea] text-[#b82029]">
                      <Icon className="size-5" name={module.icon} />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                      Em breve
                    </span>
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900">
                    {module.title}
                  </h3>
                  <p className="mt-1 min-h-10 text-sm leading-5 text-slate-600">
                    {module.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <footer className="mt-8 rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 text-xs leading-5 text-slate-500">
            A etapa Dados gerais permite validar o formulário localmente. Os
            demais módulos ainda estão em desenvolvimento e nenhum dado de
            serviço é armazenado.
          </footer>
        </div>
      </div>
    </main>
  );
}
