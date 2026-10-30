"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const passageLinks = [
  { label: "Nova passagem", href: "/nova-passagem", available: true },
  { label: "Histórico", href: "/historico", available: false },
  { label: "Viaturas", href: "/viaturas", available: false },
  { label: "Abastecimentos", href: "/abastecimentos", available: false },
  { label: "Alterações", href: "/alteracoes", available: false },
  { label: "Administração", href: "/administracao", available: false },
];

const standaloneModules = [
  { label: "QIS", href: "/qis", available: true },
  { label: "Escalas de Serviço", href: "/escalas", available: true },
  { label: "Avisos e Determinações", href: "/avisos", available: true },
];

function NavigationContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  const [passageExpanded, setPassageExpanded] = useState(
    pathname.startsWith("/nova-passagem"),
  );
  const isHome = pathname === "/";
  const isPassageActive = pathname.startsWith("/nova-passagem");

  return (
    <>
      <div className="border-b border-white/10 px-4 py-6">
        <Link
          aria-label="Portal ABM — início"
          className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
          href="/"
          onClick={onNavigate}
        >
          <Image
            alt=""
            className="size-11 shrink-0 rounded-xl bg-white object-contain p-0.5"
            height={910}
            priority
            src="/abm-logo.png"
            width={768}
          />
          <span>
            <span className="block text-xs font-extrabold tracking-[0.12em] text-white">
              PORTAL ABM
            </span>
            <span className="mt-1 block text-[10px] text-slate-400">
              Academia Bombeiro Militar
            </span>
          </span>
        </Link>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Geral
        </p>
        <Link
          aria-current={isHome ? "page" : undefined}
          className={`mt-2 flex min-h-11 items-center gap-3 rounded-xl border-l-2 px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${
            isHome
              ? "border-blue-400 bg-[#2a4269] text-white"
              : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
          href="/"
          onClick={onNavigate}
        >
          <span aria-hidden="true">⌂</span>
          Início
        </Link>

        <p className="mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Módulos
        </p>
        <ul className="mt-2 space-y-1">
          {standaloneModules.map((module) => {
            const isCurrent = pathname === module.href;

            return (
              <li key={module.href}>
                {module.available ? (
                  <Link
                    aria-current={isCurrent ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl border-l-2 px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${
                      isCurrent
                        ? "border-blue-400 bg-[#2a4269] text-white"
                        : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                    href={module.href}
                    onClick={onNavigate}
                  >
                    <span aria-hidden="true">·</span>
                    <span className="min-w-0 flex-1">{module.label}</span>
                    <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-semibold text-emerald-300">
                      {module.label === "QIS" ? "Consulta" : "Demonstração"}
                    </span>
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-slate-400"
                    title="Módulo ainda não implementado"
                  >
                    <span aria-hidden="true">·</span>
                    <span className="min-w-0 flex-1">{module.label}</span>
                    <span className="rounded-full bg-white/5 px-2 py-1 text-[9px] font-semibold text-slate-500">
                      Em breve
                    </span>
                  </span>
                )}
              </li>
            );
          })}
          <li>
            <button
              aria-expanded={passageExpanded}
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl border-l-2 px-3 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${
                isPassageActive
                  ? "border-blue-400 bg-[#2a4269] text-white"
                  : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
              onClick={() => setPassageExpanded((expanded) => !expanded)}
              type="button"
            >
              <span aria-hidden="true">▤</span>
              <span className="min-w-0 flex-1">Passagem de Serviço</span>
              <span aria-hidden="true" className="text-xs">
                {passageExpanded ? "−" : "+"}
              </span>
            </button>
            {passageExpanded ? (
              <ul className="mt-1 space-y-1 border-l border-white/10 pl-3">
                {passageLinks.map((item) => {
                  const isCurrent = pathname === item.href;

                  return (
                    <li key={item.href}>
                      {item.available ? (
                        <Link
                          aria-current={isCurrent ? "page" : undefined}
                          className={`flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${
                            isCurrent
                              ? "bg-white/10 text-white"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                          href={item.href}
                          onClick={onNavigate}
                        >
                          {item.label}
                          <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                            Disponível
                          </span>
                        </Link>
                      ) : (
                        <span
                          aria-disabled="true"
                          className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 text-xs text-slate-500"
                          title="Módulo ainda não implementado"
                        >
                          {item.label}
                          <span className="text-[9px]">Em breve</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        </ul>
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="text-xs font-semibold text-slate-200">
          Ambiente de desenvolvimento
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Módulos em construção. Use somente dados fictícios.
        </p>
      </div>
    </>
  );
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pageTitle =
    pathname === "/"
      ? "Início"
      : pathname.startsWith("/nova-passagem")
        ? "Nova passagem"
        : pathname.startsWith("/qis")
          ? "QIS"
        : "Portal ABM";

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-[#17233a] lg:flex">
      {mobileMenuOpen ? (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          onClick={closeMobileMenu}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(84vw,270px)] flex-col bg-[#14223c] text-slate-200 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        id="portal-navigation"
      >
        <NavigationContent pathname={pathname} onNavigate={closeMobileMenu} />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-t-2 border-[#356cf0] border-b border-[#e5eaf1] bg-white/95 shadow-sm backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-controls="portal-navigation"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#e5eaf1] text-lg text-[#17233a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 lg:hidden"
                onClick={() => setMobileMenuOpen((open) => !open)}
                type="button"
              >
                ☰
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f7d92]">
                  ABM · Portal interno
                </p>
                <p className="truncate text-sm font-bold text-[#17233a]">
                  {pageTitle}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-semibold text-blue-800 sm:text-[11px]">
              Protótipo em desenvolvimento
            </span>
          </div>
        </header>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
