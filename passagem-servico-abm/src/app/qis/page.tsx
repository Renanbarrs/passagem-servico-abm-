import PortalShell from "@/components/portal/portal-shell";
import QisWorkspace from "@/components/qis/qis-workspace";

export default function QisPage() {
  return (
    <PortalShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-9">
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#356cf0]">
            Consulta e edição demonstrativas
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#17233a] sm:text-3xl">
            Quadro de Instrução Semanal — QIS
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            A grade organiza horários nas linhas e os dias úteis nas colunas,
            com campos editáveis por atividade. Alterações e publicações nesta
            tela são apenas demonstrações locais.
          </p>
        </div>
        <QisWorkspace />
      </div>
    </PortalShell>
  );
}
