import PassageWizard from "@/components/passage-wizard";
import PortalShell from "@/components/portal/portal-shell";

export default function NewPassagePage() {
  return (
    <PortalShell>
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#356cf0]">
              Passagem de Serviço
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#17233a] sm:text-3xl">
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
          A conferência é demonstrativa. A passagem não é finalizada nem salva
          nesta versão.
        </p>
      </div>
    </PortalShell>
  );
}
