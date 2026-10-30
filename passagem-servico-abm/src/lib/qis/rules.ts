import { isRegisteredMilitaryName } from "@/data/participant-options";
import { isQisWeekPeriod } from "@/lib/qis/date-utils";
import { type QisContent, type QisSchedule } from "@/lib/qis/types";

export function validateQisForPublication(
  content: QisContent,
  signedPdfName: string,
) {
  const periodError = validateQisPeriod(content);
  if (periodError) return periodError;

  const responsibleError = validateQisResponsibleName(
    content.responsible,
    true,
  );
  if (responsibleError) return responsibleError;

  if (
    content.rows.some(
      (row) =>
        row.kind === "break" &&
        (!row.time.trim() || !row.breakLabel.trim()),
    )
  ) {
    return "Informe o horário e a descrição de cada faixa de intervalo.";
  }

  const activityRows = content.rows.filter(
    (row) =>
      row.kind === "activity" &&
      Object.values(row.activities).some((activity) =>
        Object.values(activity).some((value) => value.trim()),
      ),
  );
  if (
    !activityRows.some((row) =>
      Object.values(row.activities).some((activity) => activity.theme.trim()),
    )
  ) {
    return "Adicione ao menos uma atividade antes de simular a publicação.";
  }

  if (activityRows.some((row) => !row.time.trim())) {
    return "Informe a faixa horária de cada linha com atividade.";
  }

  if (!signedPdfName.trim().toLowerCase().endsWith(".pdf")) {
    return "Informe um nome fictício de PDF terminado em .pdf para simular a publicação.";
  }

  return "";
}

export function validateQisResponsibleName(
  name: string,
  required = false,
) {
  if (!name.trim() && !required) return "";
  if (!isRegisteredMilitaryName(name)) {
    return "Selecione um militar cadastrado como responsável pelo QIS.";
  }
  return "";
}

export function validateQisPeriod(
  content: Pick<QisContent, "periodStart" | "periodEnd">,
) {
  if (!isQisWeekPeriod(content.periodStart, content.periodEnd)) {
    return "O período do QIS deve ser uma semana completa, de segunda a sexta-feira.";
  }

  return "";
}

export function createPublishedQisVersion(
  schedule: QisSchedule,
  content: QisContent,
  signedPdfName: string,
  publishedAt = new Date().toISOString(),
): QisSchedule {
  const version = schedule.version + 1;

  return {
    ...schedule,
    status: "published",
    version,
    updatedAt: publishedAt,
    content,
    publishedVersions: [
      ...schedule.publishedVersions,
      {
        version,
        publishedAt,
        signedPdfName: signedPdfName.trim(),
        content: structuredClone(content),
      },
    ],
  };
}
