export interface ProblemaPlanilha {
  tipo_choque: string;
  mensagem_customizada?: string | null;
  [chave: string]: unknown;
}

export type GravidadePlanilha = "IMPEDITIVO" | "ALERTA" | null;

const TIPOS_IMPEDITIVOS = new Set([
  "CHOQUE_TURMA",
  "CHOQUE_ESPACO",
  "CHOQUE_DOCENTE",
  "DESCANSO_DOCENTE",
  "LIMITE_TURNOS",
  "INDISPONIBILIDADE",
]);

const TIPOS_ALERTA = new Set([
  "DIA_PLANEJAMENTO",
  "AULAS_GEMINADAS",
  "EXCESSO_CARGA",
  "CARGA_HORARIA",
  "FIM_DE_SEMANA",
]);

export function classificarGravidadePlanilha(tipo: string): GravidadePlanilha {
  if (TIPOS_IMPEDITIVOS.has(tipo)) return "IMPEDITIVO";
  if (TIPOS_ALERTA.has(tipo)) return "ALERTA";
  return null;
}

export function normalizarProblemasPlanilha(
  problemas: ProblemaPlanilha[],
): ProblemaPlanilha[] {
  const agrupados = new Map<
    string,
    { problema: ProblemaPlanilha; mensagens: Set<string> }
  >();

  for (const problema of problemas) {
    // A carga incompleta é mostrada em outros relatórios, mas não nesta tela.
    if (problema.tipo_choque === "CARGA_INCOMPLETA") continue;

    const grupo = agrupados.get(problema.tipo_choque);
    const mensagem = problema.mensagem_customizada?.trim();
    if (!grupo) {
      agrupados.set(problema.tipo_choque, {
        problema,
        mensagens: new Set(mensagem ? [mensagem] : []),
      });
    } else if (mensagem) {
      grupo.mensagens.add(mensagem);
    }
  }

  return Array.from(agrupados.values(), ({ problema, mensagens }) => {
    if (mensagens.size === 0) return problema;
    return { ...problema, mensagem_customizada: Array.from(mensagens).join(" / ") };
  });
}
