import Image from "next/image";
import Link from "next/link";
import PassageWizard from "@/components/passage-wizard";

const primaryNavigation = [
  { label: "Visão geral", href: "/", icon: "▦" },
  { label: "Nova passagem", href: "/nova-passagem", icon: "▤" },
];

const plannedNavigation = [
  "Histórico",
  "Viaturas",
  "Abastecimentos",
  "Alterações",
];

export default function NewPassagePage() {
  return (
    <main className="min-h-screen bg-[#eef0f3] text-slate-900 lg:flex">
      <aside className="hidden shrink-0 flex-col bg-[#171316] text-slate-200 lg:flex lg:min-h-screen lg:w-64">
        <Link
          aria-label="Painel inicial da ABM"
          className="flex items-center gap-3 border-b border-white/10 px-5 py-5 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#e7777d]"
          href="/"
        >
          <Image
            alt=""
            className="size-11 shrink-0 rounded-xl bg-white object-contain p-0.5"
            height={910}
            src="/abm-logo.png"
            width={768}
          />
          <span>
            <span className="block text-xs font-bold tracking-[0.12em] text-white">
              PASSAGEM
            </span>
            <span className="block text-xs font-bold tracking-[0.12em] text-white">
              DE SERVIÇO
            </span>
            <span className="mt-1 block text-[10px] text-slate-400">
              ABM · Gestão operacional
            </span>
          </span>
        </Link>

        <nav aria-label="Menu principal" className="px-3 py-5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Menu principal
          </p>
          <ul className="mt-2 space-y-1">
            {primaryNavigation.map((item) => {
              const isCurrent = item.href === "/nova-passagem";

              return (
                <li key={item.href}>
                  <Link
                    aria-current={isCurrent ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl border-l-2 px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7777d] ${
                      isCurrent
                        ? "border-[#e1434b] bg-[#3a2025] text-white"
                        : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                    href={item.href}
                  >
                    <span aria-hidden="true" className="text-base">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Módulos
          </p>
          <ul className="mt-2 space-y-1">
            {plannedNavigation.map((label) => (
              <li
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-slate-500"
                key={label}
              >
                <span aria-hidden="true" className="text-base">
                  ·
                </span>
                <span className="flex-1">{label}</span>
                <span className="text-[9px]">Em breve</span>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto px-4 pb-5">
          <div className="rounded-2xl border border-white/10 bg-white/4 p-4 text-xs leading-5 text-slate-400">
            Protótipo demonstrativo. Os dados desta etapa não são salvos.
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-t-2 border-[#c8212b] bg-white shadow-sm">
          <div className="flex min-h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:border-t-0">
            <div className="flex min-w-0 items-center gap-2 text-xs sm:text-sm">
              <Link
                className="shrink-0 rounded text-slate-500 hover:text-[#a91f28] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b82029]"
                href="/"
              >
                ABM
              </Link>
              <span aria-hidden="true" className="text-slate-300">
                /
              </span>
              <span className="truncate font-semibold text-slate-800">
                Nova passagem
              </span>
            </div>
            <span className="shrink-0 rounded-full border border-[#f1c8ca] bg-[#fff5f5] px-2.5 py-1 text-[10px] font-semibold text-[#a91f28] sm:px-3 sm:text-[11px]">
              Sem salvamento
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#345d8a]">
                Sistema de passagem de serviço
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#252126] sm:text-3xl">
                Nova passagem de serviço
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Preencha durante o expediente e confira cada etapa.
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900">
              Rascunho temporário
            </span>
          </div>

          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950 sm:text-sm">
            As sugestões de participantes são fictícias. O formulário não
            persiste dados e será limpo ao recarregar a página.
          </div>

          <PassageWizard />

          <p className="mt-4 px-1 text-center text-xs leading-5 text-slate-500">
            As etapas futuras serão habilitadas conforme forem implementadas e
            validadas.
          </p>
        </div>
      </div>
    </main>
  );
}
