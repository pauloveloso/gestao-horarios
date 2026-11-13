"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { BotaoExportarPDF } from "./components/BotaoExportarPDF";
import { PDFPublicoDocument } from "./components/PDFPublicoDocument";
import { Download, CalendarDays, Inbox, ArrowLeft, Lock, ChevronDown, ChevronRight } from "lucide-react";

function ordenarAulasPorModulo(aulas: any[]) {
  const ordem: Record<string, number> = {
    MODULO_1: 1,
    MODULO_2: 2,
    MODULO_3: 3,
    INTEGRAL: 4,
  };
  return [...aulas].sort(
    (a, b) =>
      (ordem[a.modulo || "INTEGRAL"] ?? 4) -
      (ordem[b.modulo || "INTEGRAL"] ?? 4),
  );
}

function agruparAulasCompartilhadas(aulas: any[], tipoFiltro: string, idSelecionado: string) {
  if (tipoFiltro === "PROFESSOR") return ordenarAulasPorModulo(aulas);

  const grupos = new Map<string, any[]>();
  for (const aula of aulas) {
    const chave = `${aula.dia_semana}|${aula.slot_horario_id}|${aula.turma_id}|${aula.disciplina_id}|${aula.modulo || "INTEGRAL"}`;
    grupos.set(chave, [...(grupos.get(chave) || []), aula]);
  }

  const aulasAgrupadas = Array.from(grupos.entries()).flatMap(([chave, grupo]) => {
    if (tipoFiltro === "ESPACO" && !grupo.some((aula) => String(aula.espaco_id) === String(idSelecionado))) {
      return [];
    }

    const professoresIds = Array.from(new Set(grupo.map((aula) => aula.professor_id)));
    const professoresDefinidos = new Set(
      grupo.filter((aula) => aula.professor_id != null).map((aula) => String(aula.professor_id)),
    );
    if (professoresDefinidos.size < 2) return grupo;

    const salasIds = Array.from(new Set(grupo.map((aula) => aula.espaco_id).filter((id) => id != null)));
    return [{
      ...grupo[0],
      id: `compartilhada-${chave}`,
      professor_ids: professoresIds,
      espaco_ids: salasIds,
      ...(tipoFiltro === "ESPACO" ? { espaco_id: idSelecionado } : {}),
    }];
  });
  return ordenarAulasPorModulo(aulasAgrupadas);
}

export default function HomePage() {
  const [carregando, setCarregando] = useState(true);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [logado, setLogado] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [versoes, setVersoes] = useState<any[]>([]);
  const [versaoSelecionada, setVersaoSelecionada] = useState<string>("");
  const [versaoVigenteId, setVersaoVigenteId] = useState<string>("");

  const [dados, setDados] = useState<any>({
    aulas: [],
    turmas: [],
    cursos: [],
    professores: [],
    disciplinas: [],
    espacos: [],
    categorias: [],
    slots: [],
  });

  const [tipoFiltro, setTipoFiltro] = useState<
    "TURMA" | "PROFESSOR" | "ESPACO"
  >("TURMA");
  const [idSelecionado, setIdSelecionado] = useState<string>("");
  const [filtroModulo, setFiltroModulo] = useState<string>("INTEGRAL");
  const [seletorPublicoAberto, setSeletorPublicoAberto] = useState(false);
  const [grupoPublicoExpandidoId, setGrupoPublicoExpandidoId] = useState<string | null>(null);
  const seletorPublicoRef = useRef<HTMLDivElement>(null);
  const menuPublicoRef = useRef<HTMLDivElement>(null);
  const [posicaoMenuPublico, setPosicaoMenuPublico] = useState({ top: 0, left: 0, width: 250, maxHeight: 320 });

  const relatorioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!seletorPublicoAberto) return;
    const fecharAoClicarFora = (event: PointerEvent) => {
      if (
        !seletorPublicoRef.current?.contains(event.target as Node) &&
        !menuPublicoRef.current?.contains(event.target as Node)
      ) setSeletorPublicoAberto(false);
    };
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSeletorPublicoAberto(false);
    };
    document.addEventListener("pointerdown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("pointerdown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [seletorPublicoAberto]);

  const alternarSeletorPublico = () => {
    if (seletorPublicoAberto) {
      setSeletorPublicoAberto(false);
      return;
    }
    const campo = seletorPublicoRef.current;
    if (campo) {
      const rect = campo.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 250), window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const spaceAbove = rect.top - 8;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const opensAbove = spaceBelow < 320 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(320, (opensAbove ? spaceAbove : spaceBelow) - 8));
      setPosicaoMenuPublico({
        top: opensAbove ? Math.max(8, rect.top - maxHeight - 4) : rect.bottom + 4,
        left,
        width,
        maxHeight,
      });
    }
    setSeletorPublicoAberto(true);
  };

  const diasSemana = [
    { id: "SEGUNDA", nome: "SEGUNDA" },
    { id: "TERCA", nome: "TERÇA" },
    { id: "QUARTA", nome: "QUARTA" },
    { id: "QUINTA", nome: "QUINTA" },
    { id: "SEXTA", nome: "SEXTA" },
  ];

  useEffect(() => {
    async function carregarVersoes() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const isLogado = !!session;
      setLogado(isLogado);

      let restringirVersoes = !session;
      if (session?.user?.id) {
        const { data: perfil, error: erroPerfil } = await supabase
          .from("usuarios_sistema")
          .select("nivel_acesso")
          .eq("id", session.user.id)
          .maybeSingle();

        // Sem perfil confirmado, aplica o acesso restrito usado pelo Professor/TAE.
        restringirVersoes =
          !!erroPerfil || !perfil || perfil.nivel_acesso === "PROFESSOR_TAE";
      }

      let queryVersoes = supabase
        .from("versoes_grade")
        .select("*")
        .order("data_inicio_vigencia", { ascending: false });
      if (restringirVersoes) {
        queryVersoes = queryVersoes.in("status", ["PUBLICADA", "ARQUIVADA"]);
      }
      const { data } = await queryVersoes;

      if (data && data.length > 0) {
        setVersoes(data);

        const hoje = new Date().toISOString().split("T")[0];

        // Versão vigente = mais recente PUBLICADA com data_inicio_vigencia <= hoje
        const vigente = data.find(
          (v) => v.status === "PUBLICADA" && v.data_inicio_vigencia <= hoje,
        );
        if (vigente) setVersaoVigenteId(String(vigente.id));

        // Prévia = PUBLICADA com data_inicio_vigencia > hoje (futura), visível para todos.
        const previa = data.find(
          (v) => v.status === "PUBLICADA" && v.data_inicio_vigencia > hoje,
        );

        // Seleciona prévia por padrão se existir; senão, a vigente
        const padrao = previa || vigente || data[0];
        if (padrao) setVersaoSelecionada(String(padrao.id));
      } else {
        setVersoes([]);
        setVersaoSelecionada("");
        setCarregando(false);
      }
    }
    carregarVersoes();
  }, []);

  useEffect(() => {
    if (!versaoSelecionada) return;
    async function carregarTudo() {
      setCarregando(true);
      try {
        const [
          { data: aulas },
          { data: turmas },
          { data: cursos },
          { data: professores },
          { data: disciplinas },
          { data: espacos },
          { data: categorias },
          { data: slots },
        ] = await Promise.all([
          supabase
            .from("aulas")
            .select("*")
            .eq("versao_id", versaoSelecionada)
            .limit(5000),
          supabase.from("turmas").select("*").order("codigo").limit(2000),
          supabase.from("cursos").select("*").order("nome"),
          supabase.from("professores").select("*").order("nome").limit(1000),
          supabase.from("disciplinas").select("*").order("nome").limit(5000),
          supabase.from("espacos").select("*").order("nome").limit(1000),
          supabase.from("categorias_espacos").select("*").order("nome"),
          supabase.from("slots_horarios").select("*").order("hora_inicio"),
        ]);
        setDados({
          aulas: aulas || [],
          turmas,
          cursos,
          professores,
          disciplinas,
          espacos,
          categorias,
          slots,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setCarregando(false);
      }
    }
    carregarTudo();
  }, [versaoSelecionada]);

  const formatarHora = (hora: string) => (hora ? hora.substring(0, 5) : "");
  const formatarData = (dataStr: string) => {
    if (!dataStr) return "";
    const data = new Date(dataStr);
    return new Date(
      data.getTime() + data.getTimezoneOffset() * 60000,
    ).toLocaleDateString("pt-BR");
  };

  const obterTituloGrade = () => {
    if (!idSelecionado) return "";
    if (tipoFiltro === "TURMA")
      return `TURMA: ${dados.turmas.find((t: any) => t.id === idSelecionado)?.codigo}`;
    if (tipoFiltro === "PROFESSOR")
      return `PROFESSOR(A): ${dados.professores.find((p: any) => p.id === idSelecionado)?.nome}`;
    if (tipoFiltro === "ESPACO")
      return `ESPAÇO: ${dados.espacos.find((e: any) => e.id === idSelecionado)?.nome}`;
    return "";
  };

  const infoVersao = versoes.find(
    (v) => String(v.id) === String(versaoSelecionada),
  );

  const hoje = new Date().toISOString().split("T")[0];
  const isPrevia =
    infoVersao?.status === "PUBLICADA" &&
    infoVersao?.data_inicio_vigencia > hoje;
  const isRascunho = infoVersao?.status === "RASCUNHO";

  // Detecta se o item selecionado permite filtro por módulo
  const turmaAtualObj =
    tipoFiltro === "TURMA"
      ? dados.turmas.find((t: any) => String(t.id) === String(idSelecionado))
      : null;
  const cursoAtualObj = turmaAtualObj
    ? dados.cursos?.find((c: any) => String(c.id) === String(turmaAtualObj?.curso_id))
    : null;
  const isIntegrado = (cursoAtualObj?.modalidade || "").toUpperCase() === "INTEGRADO";
  // Habilita o filtro de módulo:
  // - TURMA: apenas quando o curso é INTEGRADO
  // - PROFESSOR / ESPACO: sempre (podem ter aulas de turmas integradas)
  const habilitarFiltroModulo =
    (tipoFiltro === "TURMA" && isIntegrado) ||
    tipoFiltro === "PROFESSOR" ||
    tipoFiltro === "ESPACO";

  const getAulasPublico = (diaId: string, slotId: string) => {
    const aulasFiltradas = dados.aulas.filter(
      (a: any) =>
        a.dia_semana === diaId &&
        String(a.slot_horario_id) === String(slotId) &&
        (
          filtroModulo === "TODOS_HORARIOS"
            ? true
            : tipoFiltro === "TURMA"
            ? (filtroModulo === "INTEGRAL"
                ? (a.modulo || "INTEGRAL") === "INTEGRAL"
                : (a.modulo || "INTEGRAL") === filtroModulo ||
                  (a.modulo || "INTEGRAL") === "INTEGRAL")
            : (filtroModulo === "INTEGRAL"
                ? true
                : (a.modulo || "INTEGRAL") === filtroModulo ||
                  (a.modulo || "INTEGRAL") === "INTEGRAL")
        ) &&
        (tipoFiltro === "TURMA"
          ? String(a.turma_id) === String(idSelecionado)
          : tipoFiltro === "PROFESSOR"
            ? String(a.professor_id) === String(idSelecionado)
            : String(a.espaco_id) === String(idSelecionado)),
    );
    if (tipoFiltro === "PROFESSOR") return ordenarAulasPorModulo(aulasFiltradas);

    const aulasParaAgrupar = dados.aulas.filter(
      (a: any) =>
        a.dia_semana === diaId &&
        String(a.slot_horario_id) === String(slotId) &&
        (filtroModulo === "TODOS_HORARIOS" ||
          (tipoFiltro === "TURMA" && filtroModulo === "INTEGRAL"
            ? (a.modulo || "INTEGRAL") === "INTEGRAL"
            : filtroModulo === "INTEGRAL" ||
              (a.modulo || "INTEGRAL") === filtroModulo ||
              (a.modulo || "INTEGRAL") === "INTEGRAL")) &&
        (tipoFiltro === "TURMA"
          ? String(a.turma_id) === String(idSelecionado)
          : true),
    );
    return agruparAulasCompartilhadas(aulasParaAgrupar, tipoFiltro, idSelecionado);
  };

  const aulasDoFiltro = dados.aulas.filter((a: any) => {
    const matchModulo =
      filtroModulo === "TODOS_HORARIOS"
        ? true
        : tipoFiltro === "TURMA"
        ? (filtroModulo === "INTEGRAL"
            ? (a.modulo || "INTEGRAL") === "INTEGRAL"
            : (a.modulo || "INTEGRAL") === filtroModulo ||
              (a.modulo || "INTEGRAL") === "INTEGRAL")
        : (filtroModulo === "INTEGRAL"
            ? true
            : (a.modulo || "INTEGRAL") === filtroModulo ||
              (a.modulo || "INTEGRAL") === "INTEGRAL");
    if (!matchModulo) return false;
    if (tipoFiltro === "TURMA")
      return String(a.turma_id) === String(idSelecionado);
    if (tipoFiltro === "PROFESSOR")
      return String(a.professor_id) === String(idSelecionado);
    return String(a.espaco_id) === String(idSelecionado);
  });

  const slotsOcupadosIds = new Set(
    aulasDoFiltro.map((a: any) => String(a.slot_horario_id)),
  );

  const todosTurnos = [
    {
      nome: "MANHÃ",
      slots: dados.slots.filter((s: any) => s.hora_inicio < "12:00"),
    },
    {
      nome: "TARDE",
      slots: dados.slots.filter(
        (s: any) => s.hora_inicio >= "12:00" && s.hora_inicio < "18:00",
      ),
    },
    {
      nome: "NOITE",
      slots: dados.slots.filter((s: any) => s.hora_inicio >= "18:00"),
    },
  ];

  const turnosOcupados = todosTurnos
    .filter((turno) =>
      turno.slots.some((slot: any) => slotsOcupadosIds.has(String(slot.id))),
    )
    .map((turno) => {
      return {
        ...turno,
        slots: turno.slots.filter((slot: any, index: number) => {
          if (index < 4) return true;
          return slotsOcupadosIds.has(String(slot.id));
        }),
      };
    });

  const gerarPDF = async () => {
    // Legacy function removed
  };

  const tituloSeguro = obterTituloGrade()
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase() || "horarios";

  if (carregando && !versaoSelecionada) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-10">
      <header className="bg-green-800 text-white p-6 shadow-md print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter">
                SGH{" "}
                <span className="font-light not-italic text-green-200">
                  | IFNMG
                </span>
              </h1>
              <div className="flex items-center gap-2 w-full xl:w-auto">
                <span className="text-xs font-bold text-green-200 whitespace-nowrap uppercase tracking-wider hidden sm:block">
                  Semestre/Ano:
                </span>
                {versoes.length > 0 && (
                  <select
                    value={versaoSelecionada}
                    onChange={(e) => setVersaoSelecionada(e.target.value)}
                    className="bg-white text-green-800 border border-transparent rounded-lg p-2 text-xs font-bold outline-none cursor-pointer hover:border-green-300 transition-all shadow-sm max-w-full xl:max-w-xs"
                  >
                    {versoes.map((v, idx) => {
                      const hoje = new Date().toISOString().split("T")[0];
                      let sufixo = "";

                      if (v.status === "RASCUNHO") {
                        sufixo = "(Rascunho)";
                      } else if (v.status === "ARQUIVADA") {
                        sufixo = "(Arquivada)";
                      } else if (v.status === "PUBLICADA") {
                        if (v.data_inicio_vigencia > hoje) {
                          sufixo = "(Prévia)";
                        } else {
                          const atual = versoes.find(
                            (ver) =>
                              ver.status === "PUBLICADA" &&
                              ver.data_inicio_vigencia <= hoje,
                          );
                          sufixo =
                            atual && atual.id === v.id
                              ? "(Atual)"
                              : "(Arquivada)";
                        }
                      }

                      return (
                        <option
                          key={`versao-${v.id || idx}`}
                          value={v.id}
                          className="bg-white text-gray-800"
                        >
                          {v.nome} - {v.semestre} {sufixo}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap xl:flex-nowrap items-center justify-center gap-4 bg-green-900/40 p-4 rounded-xl border border-green-700/50 w-full xl:w-auto">
            <div className="hidden xl:block w-px h-8 bg-green-700/50 mx-2"></div>

            <div className="flex bg-green-950 rounded-lg p-1">
              {(["TURMA", "PROFESSOR", "ESPACO"] as const).map((t) => (
                <button
                  key={`btn-filtro-${t}`}
                  onClick={() => {
                    setTipoFiltro(t);
                    setIdSelecionado("");
                    setFiltroModulo("INTEGRAL"); // reseta o módulo ao trocar o tipo
                    setSeletorPublicoAberto(false);
                    setGrupoPublicoExpandidoId(null);
                  }}
                  className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${tipoFiltro === t ? "bg-green-600 text-white shadow-sm" : "text-green-400 hover:text-white"}`}
                >
                  {t === "TURMA"
                    ? "Turmas"
                    : t === "PROFESSOR"
                      ? "Professores"
                      : "Salas"}
                </button>
              ))}
            </div>

            {tipoFiltro === "PROFESSOR" ? (
              <select
                value={idSelecionado}
                onChange={(e) => setIdSelecionado(e.target.value)}
                className="bg-white text-green-800 border border-transparent rounded-lg p-2 text-xs font-bold outline-none cursor-pointer hover:border-green-300 transition-all w-full sm:w-[250px] truncate h-10 shadow-sm"
              >
                <option value="">Escolha...</option>
                {dados.professores.map((p: any, pIdx: number) => (
                  <option key={`prof-${p.id || pIdx}`} value={p.id}>{p.nome}</option>
                ))}
              </select>
            ) : (
              <div className="relative w-full sm:w-[250px]" ref={seletorPublicoRef}>
                <button
                  type="button"
                  aria-expanded={seletorPublicoAberto}
                  onClick={alternarSeletorPublico}
                  className="bg-white text-green-800 border border-transparent rounded-lg p-2 text-xs font-bold outline-none cursor-pointer hover:border-green-300 transition-all w-full truncate h-10 shadow-sm flex items-center justify-between gap-1"
                >
                  <span className="truncate">
                    {tipoFiltro === "TURMA"
                      ? dados.turmas.find((turma: any) => String(turma.id) === String(idSelecionado))?.codigo || "Escolha..."
                      : dados.espacos.find((espaco: any) => String(espaco.id) === String(idSelecionado))?.nome || "Escolha..."}
                  </span>
                  <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${seletorPublicoAberto ? "rotate-180" : ""}`} />
                </button>
                {seletorPublicoAberto && createPortal(
                  <div
                    ref={menuPublicoRef}
                    className="fixed z-[1000] overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-xl"
                    style={{
                      top: `${posicaoMenuPublico.top}px`,
                      left: `${posicaoMenuPublico.left}px`,
                      width: `${posicaoMenuPublico.width}px`,
                      maxHeight: `${posicaoMenuPublico.maxHeight}px`,
                    }}
                  >
                    <button
                      type="button"
                      className="block w-full rounded px-3 py-2 text-left text-xs text-gray-700 hover:bg-green-50"
                      onClick={() => {
                        setIdSelecionado("");
                        setSeletorPublicoAberto(false);
                      }}
                    >
                      Escolha...
                    </button>
                    {tipoFiltro === "TURMA" ? (
                      dados.cursos.map((curso: any, cIdx: number) => {
                        const turmasDoCurso = dados.turmas.filter(
                          (turma: any) => String(turma.curso_id) === String(curso.id),
                        );
                        if (turmasDoCurso.length === 0) return null;
                        const expandido = grupoPublicoExpandidoId === String(curso.id);
                        return (
                          <div key={`curso-${curso.id || cIdx}`} className="border-t border-gray-100">
                            <button
                              type="button"
                              aria-expanded={expandido}
                              className="flex w-full items-center gap-1 rounded px-3 py-2 text-left text-xs font-bold text-gray-800 hover:bg-green-50"
                              onClick={() => setGrupoPublicoExpandidoId(expandido ? null : String(curso.id))}
                            >
                              {expandido ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                              <span className="flex-1">{curso.nome}</span>
                              <span className="text-[10px] font-normal text-gray-500">{turmasDoCurso.length}</span>
                            </button>
                            {expandido && (
                              <div className="pb-1 pl-6">
                                {turmasDoCurso.map((turma: any, tIdx: number) => (
                                  <button
                                    key={`turma-${turma.id || tIdx}`}
                                    type="button"
                                    aria-selected={String(idSelecionado) === String(turma.id)}
                                    className={`block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-green-50 ${String(idSelecionado) === String(turma.id) ? "font-bold text-green-800" : "text-gray-700"}`}
                                    onClick={() => {
                                      setIdSelecionado(String(turma.id));
                                      setSeletorPublicoAberto(false);
                                    }}
                                  >
                                    {turma.codigo}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <>
                        {dados.categorias.map((categoria: any, catIdx: number) => {
                          const espacosDaCategoria = dados.espacos.filter(
                            (espaco: any) => String(espaco.categoria_id) === String(categoria.id),
                          );
                          if (espacosDaCategoria.length === 0) return null;
                          const expandida = grupoPublicoExpandidoId === String(categoria.id);
                          return (
                            <div key={`categoria-${categoria.id || catIdx}`} className="border-t border-gray-100">
                              <button
                                type="button"
                                aria-expanded={expandida}
                                className="flex w-full items-center gap-1 rounded px-3 py-2 text-left text-xs font-bold text-gray-800 hover:bg-green-50"
                                onClick={() => setGrupoPublicoExpandidoId(expandida ? null : String(categoria.id))}
                              >
                                {expandida ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                                <span className="flex-1">{categoria.nome}</span>
                                <span className="text-[10px] font-normal text-gray-500">{espacosDaCategoria.length}</span>
                              </button>
                              {expandida && (
                                <div className="pb-1 pl-6">
                                  {espacosDaCategoria.map((espaco: any, eIdx: number) => (
                                    <button
                                      key={`espaco-${espaco.id || eIdx}`}
                                      type="button"
                                      aria-selected={String(idSelecionado) === String(espaco.id)}
                                      className={`block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-green-50 ${String(idSelecionado) === String(espaco.id) ? "font-bold text-green-800" : "text-gray-700"}`}
                                      onClick={() => {
                                        setIdSelecionado(String(espaco.id));
                                        setSeletorPublicoAberto(false);
                                      }}
                                    >
                                      {espaco.nome}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {(() => {
                          const espacosSemCategoria = dados.espacos.filter((espaco: any) => !espaco.categoria_id);
                          if (espacosSemCategoria.length === 0) return null;
                          const expandida = grupoPublicoExpandidoId === "__SEM_CATEGORIA__";
                          return (
                            <div className="border-t border-gray-100">
                              <button
                                type="button"
                                aria-expanded={expandida}
                                className="flex w-full items-center gap-1 rounded px-3 py-2 text-left text-xs font-bold text-gray-800 hover:bg-green-50"
                                onClick={() => setGrupoPublicoExpandidoId(expandida ? null : "__SEM_CATEGORIA__")}
                              >
                                {expandida ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                                <span className="flex-1">Outros / Sem Categoria</span>
                                <span className="text-[10px] font-normal text-gray-500">{espacosSemCategoria.length}</span>
                              </button>
                              {expandida && (
                                <div className="pb-1 pl-6">
                                  {espacosSemCategoria.map((espaco: any, eIdx: number) => (
                                    <button
                                      key={`espaco-sem-cat-${espaco.id || eIdx}`}
                                      type="button"
                                      aria-selected={String(idSelecionado) === String(espaco.id)}
                                      className={`block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-green-50 ${String(idSelecionado) === String(espaco.id) ? "font-bold text-green-800" : "text-gray-700"}`}
                                      onClick={() => {
                                        setIdSelecionado(String(espaco.id));
                                        setSeletorPublicoAberto(false);
                                      }}
                                    >
                                      {espaco.nome}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>,
                  document.body,
                )}
              </div>
            )}

            <select
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value)}
              disabled={!habilitarFiltroModulo}
              className={`border border-transparent rounded-lg p-2 text-xs font-bold outline-none transition-all w-full sm:w-auto h-10 shadow-sm ${
                habilitarFiltroModulo
                  ? "bg-white text-green-800 cursor-pointer hover:border-green-300"
                  : "bg-green-900/40 text-green-500 cursor-not-allowed opacity-60"
              }`}
              title={habilitarFiltroModulo ? "Filtrar por Módulo / Trimestre" : "Disponível apenas para turmas de cursos Integrados"}
            >
              <option value="INTEGRAL">Anual / Semestral</option>
              <option value="MODULO_1">1º Trimestre (M1)</option>
              <option value="MODULO_2">2º Trimestre (M2)</option>
              <option value="MODULO_3">3º Trimestre (M3)</option>
              <option value="TODOS_HORARIOS">Todos os horários</option>
            </select>

            <div className="flex gap-2 w-full xl:w-auto mt-4 xl:mt-0">
              <BotaoExportarPDF
                disabled={!idSelecionado || turnosOcupados.length === 0}
                fileName={`Horario_${tituloSeguro}.pdf`}
                document={
                  <PDFPublicoDocument
                    dados={dados}
                    turnosOcupados={turnosOcupados}
                    diasSemana={diasSemana}
                    tipoFiltro={tipoFiltro}
                    idSelecionado={idSelecionado}
                    titulo={obterTituloGrade()}
                    dataVigencia={formatarData(infoVersao?.data_inicio_vigencia)}
                  />
                }
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto mt-6 p-2 relative">
        {carregando && idSelecionado && (
          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {!idSelecionado ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-gray-300 border-4 border-dashed border-gray-100 rounded-3xl">
            <CalendarDays className="w-24 h-24 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-black text-gray-400 text-center px-4">
              Selecione uma opção acima para visualizar o horário.
            </p>
          </div>
        ) : (
          <div className="bg-white p-4">
            <div className="text-center py-4 bg-white border-b border-gray-400 mb-4">
              <h2 className="text-2xl font-black text-black uppercase tracking-wide">
                IFNMG - Campus Januária | Quadro de Horário
              </h2>
              <h3 className="text-xl font-bold text-black uppercase mt-1">
                {obterTituloGrade()}
              </h3>
              {infoVersao && !isPrevia && !isRascunho && (
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                  Vigência: A partir de{" "}
                  {formatarData(infoVersao.data_inicio_vigencia)}
                </p>
              )}

              {/* Banner de PRÉVIA com destaque */}
              {isPrevia && (
                <div className="mt-3 inline-flex flex-col sm:flex-row items-center gap-3 bg-amber-50 border-2 border-amber-400 rounded-xl px-5 py-3 shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 text-xl">⚠️</span>
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-widest text-amber-700">
                        PRÉVIA — Horários ainda não vigentes
                      </p>
                      <p className="text-sm font-bold text-amber-900">
                        Entra em vigor em:{" "}
                        <span className="underline underline-offset-2">
                          {formatarData(infoVersao.data_inicio_vigencia)}
                        </span>
                      </p>
                    </div>
                  </div>
                  {versaoVigenteId && (
                    <button
                      onClick={() => setVersaoSelecionada(versaoVigenteId)}
                      className="flex-shrink-0 bg-green-700 hover:bg-green-600 active:bg-green-800 text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-sm whitespace-nowrap"
                    >
                      Ver horários vigentes
                    </button>
                  )}
                </div>
              )}

              {/* Banner de RASCUNHO — apenas para usuários logados */}
              {isRascunho && (
                <div className="mt-3 inline-flex items-center gap-2 bg-gray-100 border border-gray-400 rounded-lg px-4 py-2">
                  <span className="text-gray-500 text-base">📝</span>
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Rascunho — versão não publicada
                  </p>
                </div>
              )}
            </div>

            {turnosOcupados.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500 my-8">
                <Inbox className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-bold text-gray-700">
                  Nenhum horário cadastrado
                </p>
                <p className="text-sm mt-1">
                  Não foram encontradas aulas para esta seleção na versão atual
                  da grade.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {turnosOcupados.map((turno, tIdx) => (
                  <div
                    key={`turno-${turno.nome}-${tIdx}`}
                    className="bg-white box-border"
                  >
                    <div className="text-center mb-1 border-b border-gray-400 pb-1">
                      <h3 className="font-black text-sm tracking-wide text-black uppercase mt-0.5">
                        TURNO: {turno.nome}
                      </h3>
                    </div>

                    <table className="w-full border-collapse border border-black table-fixed text-black bg-white">
                      <thead>
                        <tr className="bg-gray-200 font-bold h-5">
                          <th className="border border-black py-0 px-1 w-[8%] text-[10px] text-center leading-none uppercase">
                            HORÁRIO
                          </th>
                          {diasSemana.map((dia) => (
                            <th
                              key={`th-${dia.id}`}
                              className="border border-black py-0 px-1 w-[18.4%] text-[10px] text-center leading-none uppercase"
                            >
                              {dia.nome}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {turno.slots.map((slot: any) => {
                          const linhaTemChoque = diasSemana.some(
                            (dia) =>
                              getAulasPublico(dia.id, slot.id).length > 1,
                          );

                          return (
                            <tr key={`slot-${slot.id}`} className="h-auto">
                              <td className="border border-black p-0.5 text-center font-bold bg-gray-100 align-middle text-black text-[10px] leading-tight">
                                {formatarHora(slot.hora_inicio)}
                                <br />
                                {formatarHora(slot.hora_fim)}
                              </td>

                              {diasSemana.map((dia) => {
                                const aulasNoSlot = getAulasPublico(
                                  dia.id,
                                  slot.id,
                                );

                                if (aulasNoSlot.length === 0) {
                                  return (
                                    <td
                                      key={`td-${dia.id}-vazio`}
                                      className="border border-black p-0.5 bg-white"
                                    ></td>
                                  );
                                }

                                const isSplit = aulasNoSlot.length > 1;
                                const isSingleInTallRow =
                                  linhaTemChoque && !isSplit;

                                return (
                                  <td
                                    key={`td-${dia.id}`}
                                    className={`border border-black p-0.5 bg-white ${isSingleInTallRow ? "align-middle" : "align-top"}`}
                                  >
                                    <div className="flex flex-col w-full h-full justify-center items-center text-center gap-0.5">
                                      {aulasNoSlot.map(
                                        (aula: any, aIdx: number) => {
                                          const disc = dados.disciplinas.find(
                                            (d: any) =>
                                              d.id === aula.disciplina_id,
                                          );
                                          const professoresDaAula = (aula.professor_ids || [aula.professor_id])
                                            .map((professorId: any) => dados.professores.find(
                                              (p: any) => String(p.id) === String(professorId),
                                            )?.nome || "A DEFINIR");
                                          const salasDaAula = (aula.espaco_ids || [aula.espaco_id])
                                            .map((espacoId: any) => dados.espacos.find(
                                              (e: any) => String(e.id) === String(espacoId),
                                            )?.nome || "S/S");
                                          const turma = dados.turmas.find(
                                            (t: any) => t.id === aula.turma_id,
                                          );

                                          return (
                                            <div
                                              key={`aula-${aula.id}-${aIdx}`}
                                              className={`flex flex-col justify-center items-center w-full ${isSplit && aIdx > 0 ? "border-t border-dashed border-gray-400 pt-0.5 mt-0.5" : ""}`}
                                            >
                                              <span
                                                className="font-bold text-[11px] leading-[1.1] uppercase text-black"
                                                title={disc?.nome}
                                              >
                                                {disc?.nome}
                                              </span>

                                              {tipoFiltro !== "TURMA" && (
                                                <span
                                                  className="text-[10px] text-gray-800 font-medium leading-[1.1] uppercase"
                                                  title={turma?.codigo}
                                                >
                                                  {turma?.codigo}
                                                </span>
                                              )}

                                              {tipoFiltro !== "PROFESSOR" && (
                                                <span
                                                  className="flex flex-col text-[10px] text-gray-800 font-medium leading-[1.1] uppercase"
                                                  title={professoresDaAula.join("\n")}
                                                >
                                                  {professoresDaAula.map((nome: string, indice: number) => (
                                                    <span key={`${aula.id}-prof-${indice}`}>{nome}</span>
                                                  ))}
                                                </span>
                                              )}

                                              {tipoFiltro !== "ESPACO" && (
                                                <span
                                                  className="flex flex-col text-[10px] text-gray-600 leading-[1.1] uppercase"
                                                  title={salasDaAula.join("\n")}
                                                >
                                                  {salasDaAula.map((nome: string, indice: number) => (
                                                    <span key={`${aula.id}-sala-${indice}`}>{nome}</span>
                                                  ))}
                                                </span>
                                              )}

                                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 leading-tight uppercase mt-0.5">
                                                {aula.modulo === "MODULO_1"
                                                  ? "1º Trim"
                                                  : aula.modulo === "MODULO_2"
                                                    ? "2º Trim"
                                                    : aula.modulo === "MODULO_3"
                                                      ? "3º Trim"
                                                      : "Anual / Semestral"}
                                              </span>
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto p-8 text-center print:hidden border-t border-gray-100 mt-12">
        <div className="flex flex-col items-center gap-4">
          <div className="text-gray-400 text-xs leading-relaxed max-w-md">
            Para gerar um PDF, selecione o filtro desejado e clique no botão de
            Exportação acima.
          </div>
          <Link
            href={logado ? "/painel" : "/login"}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-bold group ${logado ? "bg-green-600 text-white border-green-500 hover:bg-green-700" : "border-gray-200 text-gray-400 hover:text-green-700 hover:border-green-200 hover:bg-green-50"}`}
          >
            <span
              className={logado ? "" : "opacity-60 group-hover:opacity-100"}
            >
              {logado ? <ArrowLeft className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </span>
            {logado ? "Voltar ao Painel de Gestão" : "Acesso Restrito à Gestão"}
          </Link>
        </div>
      </footer>
    </div>
  );
}
