export type ModalidadeCurso =
  | "FIC"
  | "INTEGRADO"
  | "SUBSEQUENTE_CONCOMITANTE"
  | "SUPERIOR"
  | "POS_GRADUACAO";

export interface InfoModalidade {
  valor: ModalidadeCurso;
  nomeExibicao: string;
  nomeCompleto: string;
  ordem: number;
}

export const MODALIDADES_CURSO: InfoModalidade[] = [
  {
    valor: "FIC",
    nomeExibicao: "FIC",
    nomeCompleto: "FIC (Formação Inicial e Continuada)",
    ordem: 1,
  },
  {
    valor: "INTEGRADO",
    nomeExibicao: "Integrado",
    nomeCompleto: "Integrado (Ensino Técnico Integrado ao Ensino Médio)",
    ordem: 2,
  },
  {
    valor: "SUBSEQUENTE_CONCOMITANTE",
    nomeExibicao: "Subsequente/Concomitante",
    nomeCompleto:
      "Subsequente/Concomitante (Ensino Técnico Subsequente e/ou Concomitante ao Ensino Médio)",
    ordem: 3,
  },
  {
    valor: "SUPERIOR",
    nomeExibicao: "Superior",
    nomeCompleto: "Superior (Ensino Superior)",
    ordem: 4,
  },
  {
    valor: "POS_GRADUACAO",
    nomeExibicao: "Pós-Graduação",
    nomeCompleto: "Pós-Graduação",
    ordem: 5,
  },
];

export function normalizarModalidade(
  mod: string | null | undefined,
): ModalidadeCurso | string {
  if (!mod) return "SEM MODALIDADE";
  const m = mod.trim().toUpperCase();
  if (
    m === "SUBSEQUENTE" ||
    m === "CONCOMITANTE" ||
    m === "SUBSEQUENTE_CONCOMITANTE"
  ) {
    return "SUBSEQUENTE_CONCOMITANTE";
  }
  return m;
}

export function formatarNomeModalidade(
  mod: string | null | undefined,
): string {
  const norm = normalizarModalidade(mod);
  const info = MODALIDADES_CURSO.find((item) => item.valor === norm);
  return info ? info.nomeExibicao : mod || "SEM MODALIDADE";
}

export function formatarNomeCompletoModalidade(
  mod: string | null | undefined,
): string {
  const norm = normalizarModalidade(mod);
  const info = MODALIDADES_CURSO.find((item) => item.valor === norm);
  return info ? info.nomeCompleto : mod || "SEM MODALIDADE";
}
