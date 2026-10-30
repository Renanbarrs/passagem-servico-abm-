import DutyRosterWorkspace from "@/components/duty-rosters/duty-roster-workspace";
import PortalShell from "@/components/portal/portal-shell";

export default function DutyRostersPage() {
  return (
    <PortalShell>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-9">
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#356cf0]">
            Consulta e edição demonstrativas
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#17233a] sm:text-3xl">
            Escalas de Serviço
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Consulte as designações por data. Na simulação de administrador,
            cadastre manualmente participantes e observações; nenhuma escala é
            gerada automaticamente.
          </p>
        </div>
        <DutyRosterWorkspace />
      </div>
    </PortalShell>
  );
}
