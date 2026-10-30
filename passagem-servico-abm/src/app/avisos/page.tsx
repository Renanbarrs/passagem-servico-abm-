import AnnouncementsWorkspace from "@/components/announcements/announcements-workspace";
import PortalShell from "@/components/portal/portal-shell";

export default function AnnouncementsPage() {
  return (
    <PortalShell>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-9">
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#356cf0]">
            Mural demonstrativo
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#17233a] sm:text-3xl">
            Avisos e Determinações
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Consulte, pesquise e filtre publicações de exemplo ou crie uma
            publicação fictícia para testar o mural.
          </p>
        </div>
        <AnnouncementsWorkspace />
      </div>
    </PortalShell>
  );
}
