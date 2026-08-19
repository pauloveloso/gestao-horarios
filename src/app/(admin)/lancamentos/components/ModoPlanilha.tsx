"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import LinhaPlanilha from "./LinhaPlanilha";

export default function ModoPlanilha({
  versaoId,
  aulas,
  choques = [],
  turmas,
  cursos = [],
  professores,
  disciplinas,
  espacos,
  slots,
  categorias = [],
  recarregarAulas,
}: any) {
  const [isProcessando, setIsProcessando] = useState(true);
  const [linhas, setLinhas] = useState<any[]>([]);
  const [linhasVisualizadas, setLinhasVisualizadas] = useState<any[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("");

  const limiteVisualizacaoRef = useRef<number>(30);
  const [linhaSendoEditada, setLinhaSendoEditada] = useState<string | null>(null);
  const timerDestaqueRef = useRef<NodeJS.Timeout | null>(null);
  const linhaSendoEditadaRef = useRef<string | null>(null);

  const aulasRef = useRef(aulas);
  useEffect(() => {
    aulasRef.current = aulas;
  }, [aulas]);

  const linhasRef = useRef(linhas);
  useEffect(() => {
    linhasRef.current = linhas;
  }, [linhas]);

  // ESTADOS DO MODAL DE LIMPEZA GERAL
  const [modalLimpezaAberto, setModalLimpezaAberto] = useState(false);
  const [textoConfirmacao, setTextoConfirmacao] = useState("");
  const [limpando, setLimpando] = useState(false);

  const formatarHora = (hora: string) => {
    if (!hora) return "";
    return hora.substring(0, 5);
  };

  const criarLinhaVazia = () => ({
    id: crypto.randomUUID(),
    turma_id: "",
    disciplina_id: "",
    professor_id: "",
    dia_semana: "",
    slot_horario_id: "",
    espaco_id: "",
  });

  const mapearMensagem = (choque: any) => {
    if (choque.mensagem_customizada) return choque.mensagem_customizada;
    switch (choque.tipo_choque) {
      case "CHOQUE_TURMA":
        return "🔴 Choque: Turma já possui aula neste horário.";
      case "CHOQUE_ESPACO":
        return "🔴 Choque: Sala/Laboratório já ocupado.";
      case "CHOQUE_DOCENTE":
        return "🔴 Choque: Professor já alocado em outra turma.";
      case "DESCANSO_DOCENTE":
        return "🔴 Alerta Trabalhista: Sem descanso interjornada (Mín. 10h).";
      case "LIMITE_TURNOS":
        return "🔴 Limite: Professor alocado em 3 turnos hoje.";
      case "INDISPONIBILIDADE":
        return "🔴 Indisponibilidade: Horário reservado para atendimento especial.";
      case "DIA_PLANEJAMENTO":
        return "🟡 Atenção: Dia de planejamento do professor.";
      case "AULAS_GEMINADAS":
        return "🟡 Limite: Mais de 2 aulas geminadas desta disciplina.";
      case "FIM_DE_SEMANA":
        return "🟡 Atenção: Professor leciona Sexta à noite e Segunda de manhã.";
      default:
        return "⚠️ Problema detectado.";
    }
  };

  const getCategoriaCurso = (curso: any) => {
    const mod = (curso.modalidade || "").trim().toUpperCase();
    return mod ? mod : "SEM MODALIDADE";
  };

  const categoriasDisponiveis = useMemo(() => {
    const cats = new Set<string>();
    cursos.forEach((c: any) => cats.add(getCategoriaCurso(c)));
    const temAulasSemCurso = aulas.some((a: any) => {
      const t = turmas.find(
        (turma: any) => String(turma.id) === String(a.turma_id),
      );
      return (
        !t?.curso_id ||
        !cursos.some((c: any) => String(c.id) === String(t.curso_id))
      );
    });
    if (temAulasSemCurso) cats.add("AULAS ÓRFÃS / ERRO DE CADASTRO");
    return Array.from(cats).sort();
  }, [cursos, aulas, turmas]);

  useEffect(() => {
    if (!categoriaFiltro && categoriasDisponiveis.length > 0) {
      if (categoriasDisponiveis.includes("INTEGRADO"))
        setCategoriaFiltro("INTEGRADO");
      else setCategoriaFiltro(categoriasDisponiveis[0]);
    }
  }, [categoriasDisponiveis, categoriaFiltro]);

  // ========================================================
  // MAPAS DE ALTA PERFORMANCE O(1)
  // ========================================================
  const turmasMap = useMemo(() => new Map(turmas.map((t: any) => [String(t.id), t])), [turmas]);
  const slotsMap = useMemo(() => new Map(slots.map((s: any) => [String(s.id), s])), [slots]);
  const cursosMap = useMemo(() => new Map(cursos.map((c: any) => [String(c.id), c])), [cursos]);

  const disciplinasPorCurso = useMemo(() => {
    const mapa = new Map();
    cursos.forEach((c: any) => {
      const disc = disciplinas
        .filter((d: any) => String(d.curso_id) === String(c.id))
        .sort((a: any, b: any) => a.nome.localeCompare(b.nome));
      mapa.set(String(c.id), disc);
    });
    return mapa;
  }, [cursos, disciplinas]);

  const mapaCoresTurma = useMemo(() => {
    const mapa = new Map();
    turmas.forEach((t: any) => {
      const c = cursosMap.get(String(t.curso_id));
      if (c?.cor_identificacao) mapa.set(String(t.id), c.cor_identificacao);
    });
    return mapa;
  }, [turmas, cursosMap]);

  const mudarCategoria = (cat: string) => {
    setIsProcessando(true);
    limiteVisualizacaoRef.current = 30;
    setLinhasVisualizadas([]);
    setLinhas([]);
    setCategoriaFiltro(cat);
  };

  useEffect(() => {
    if (!categoriaFiltro) return;

    const timer = setTimeout(() => {
      const aulasMapeadas = aulas.map((a: any) => ({ ...a }));
      const mapaDiasOrdenacao: Record<string, number> = {
        SEGUNDA: 1,
        TERCA: 2,
        QUARTA: 3,
        QUINTA: 4,
        SEXTA: 5,
      };

      // Agrupar aulas por turma (O(n))
      const aulasPorTurma = new Map();
      aulasMapeadas.forEach((a: any) => {
        const tid = String(a.turma_id);
        if (!aulasPorTurma.has(tid)) aulasPorTurma.set(tid, []);
        aulasPorTurma.get(tid).push(a);
      });

      const ordenarInterno = (a: any, b: any) => {
        const tA = turmasMap.get(String(a.turma_id));
        const tB = turmasMap.get(String(b.turma_id));
        const nomeA = (tA?.codigo || "").toUpperCase();
        const nomeB = (tB?.codigo || "").toUpperCase();
        if (nomeA !== nomeB) return nomeA.localeCompare(nomeB);
        const diaA = mapaDiasOrdenacao[a.dia_semana] || 99;
        const diaB = mapaDiasOrdenacao[b.dia_semana] || 99;
        if (diaA !== diaB) return diaA - diaB;
        const sA = slotsMap.get(String(a.slot_horario_id));
        const sB = slotsMap.get(String(b.slot_horario_id));
        return (sA?.hora_inicio || "99:99").localeCompare(
          sB?.hora_inicio || "99:99",
        );
      };

      const novasLinhas: any[] = [];
      const cursosOrdenados = [...cursos].sort((a: any, b: any) =>
        (a.nome || "").localeCompare(b.nome || ""),
      );

      if (categoriaFiltro !== "AULAS ÓRFÃS / ERRO DE CADASTRO") {
        const cursosDaCategoria = cursosOrdenados.filter(
          (c: any) => getCategoriaCurso(c) === categoriaFiltro,
        );

        if (categoriaFiltro === "INTEGRADO") {
          cursosDaCategoria.forEach((curso: any) => {
            const turmasDesteCurso = turmas
              .filter((t: any) => String(t.curso_id) === String(curso.id))
              .sort((a: any, b: any) => a.codigo.localeCompare(b.codigo));
            turmasDesteCurso.forEach((turma: any) => {
              const aulasDestaTurma = aulasPorTurma.get(String(turma.id)) || [];
              if (aulasDestaTurma.length > 0) {
                aulasDestaTurma.sort(ordenarInterno);
                novasLinhas.push(...aulasDestaTurma);
                novasLinhas.push(criarLinhaVazia(), criarLinhaVazia());
              }
            });
          });
        } else {
          cursosDaCategoria.forEach((curso: any) => {
            const turmasDesteCurso = turmas.filter((t: any) => String(t.curso_id) === String(curso.id));
            const aulasDesteCurso: any[] = [];
            turmasDesteCurso.forEach((t: any) => {
              aulasDesteCurso.push(...(aulasPorTurma.get(String(t.id)) || []));
            });
            if (aulasDesteCurso.length > 0) {
              aulasDesteCurso.sort(ordenarInterno);
              novasLinhas.push(...aulasDesteCurso);
              novasLinhas.push(criarLinhaVazia(), criarLinhaVazia());
            }
          });
        }
      } else {
        const aulasSemCurso = aulasMapeadas.filter((a: any) => {
          const t = turmasMap.get(String(a.turma_id));
          return !t?.curso_id || !cursosMap.has(String(t.curso_id));
        });
        if (aulasSemCurso.length > 0) {
          aulasSemCurso.sort(ordenarInterno);
          novasLinhas.push(...aulasSemCurso);
        }
      }

      if (novasLinhas.length === 0) {
        for (let i = 0; i < 5; i++) novasLinhas.push(criarLinhaVazia());
      }

      setLinhas((linhasAnteriores) => {
        if (linhasAnteriores.length === novasLinhas.length) {
          let iguais = true;
          for (let i = 0; i < novasLinhas.length; i++) {
            if (JSON.stringify(novasLinhas[i]) !== JSON.stringify(linhasAnteriores[i])) {
              iguais = false;
              break;
            }
          }
          if (iguais) return linhasAnteriores;
        }

        let limite = Math.max(30, limiteVisualizacaoRef.current);
        if (linhaSendoEditadaRef.current) {
          const alvo = linhaSendoEditadaRef.current;
          const idx = novasLinhas.findIndex((l: any) => l.id === alvo);
          if (idx !== -1) limite = Math.max(limite, idx + 20);
          
          // Rola para a nova posição após a renderização
          setTimeout(() => {
            const el = document.getElementById(`linha-${alvo}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Conta 1 segundo APÓS a rolagem para remover o destaque
            if (timerDestaqueRef.current) clearTimeout(timerDestaqueRef.current);
            timerDestaqueRef.current = setTimeout(() => {
              setLinhaSendoEditada(null);
              if (linhaSendoEditadaRef.current === alvo) {
                linhaSendoEditadaRef.current = null;
              }
            }, 1000);
          }, 150);
        }

        limiteVisualizacaoRef.current = limite;
        setLinhasVisualizadas(novasLinhas.slice(0, limite));
        return novasLinhas;
      });
      setIsProcessando(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [aulas, turmas, cursos, slots, categoriaFiltro]);

  // Efeito global para limpar o destaque ao clicar em qualquer lugar
  useEffect(() => {
    const handleGlobalClick = () => {
      // Qualquer clique na tela desativa o destaque imediatamente
      setLinhaSendoEditada(null);
      linhaSendoEditadaRef.current = null;
    };
    
    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, []);

  // Efeito de renderização progressiva: adiciona linhas em blocos até terminar
  useEffect(() => {
    if (!isProcessando && linhasVisualizadas.length < linhas.length) {
      const timer = setTimeout(() => {
        setLinhasVisualizadas((prev) => {
          const nextChunk = linhas.slice(prev.length, prev.length + 50);
          const newLength = prev.length + nextChunk.length;
          limiteVisualizacaoRef.current = newLength;
          return [...prev, ...nextChunk];
        });
      }, 30); // Intervalo curto para não travar a interface
      return () => clearTimeout(timer);
    }
  }, [linhas, linhasVisualizadas.length, isProcessando]);

  const adicionarLinha = useCallback(() => {
    const nova = criarLinhaVazia();
    setLinhas((prev) => [...prev, nova]);
    setLinhasVisualizadas((prev) => [...prev, nova]);
  }, []);

  const duplicarLinha = useCallback((id_original: string) => {
    const linhaParaCopiar = linhasRef.current.find((l: any) => l.id === id_original);
    if (!linhaParaCopiar) return;
    
    const novaLinha = { ...linhaParaCopiar, id: crypto.randomUUID() };
    
    setLinhas((prev) => {
      const idx = prev.findIndex((l: any) => l.id === id_original);
      if (idx === -1) return prev;
      const n = [...prev];
      n.splice(idx + 1, 0, novaLinha);
      return n;
    });
    setLinhasVisualizadas((prev) => {
      const idx = prev.findIndex((l: any) => l.id === id_original);
      if (idx === -1) return prev;
      const n = [...prev];
      n.splice(idx + 1, 0, novaLinha);
      return n;
    });

    if (
      novaLinha.turma_id &&
      novaLinha.disciplina_id &&
      novaLinha.dia_semana &&
      novaLinha.slot_horario_id
    ) {
      salvarLinhaNoBanco(novaLinha);
    }
  }, []);

  const atualizarCampo = useCallback(async (id: string, campo: string, valor: string) => {
    const linhaAtual = linhasRef.current.find((l: any) => l.id === id);
    if (!linhaAtual) return;

    // Destacar a linha atualizada apenas se afetar a ordenação
    if (campo === "dia_semana" || campo === "slot_horario_id") {
      setLinhaSendoEditada(id);
      linhaSendoEditadaRef.current = id;
    }
    
    const linhaAtualizada = { ...linhaAtual, [campo]: valor };
    if (campo === "turma_id") linhaAtualizada.disciplina_id = "";
    
    setLinhas((prev) => {
      return prev.map((linha: any) => (linha.id === id ? linhaAtualizada : linha));
    });
    setLinhasVisualizadas((prev) => {
      return prev.map((linha: any) => (linha.id === id ? linhaAtualizada : linha));
    });

    if (
      linhaAtualizada.turma_id &&
      linhaAtualizada.disciplina_id &&
      linhaAtualizada.dia_semana &&
      linhaAtualizada.slot_horario_id
    ) {
      await salvarLinhaNoBanco(linhaAtualizada);
    }
  }, []);

  const salvarLinhaNoBanco = async (linha: any) => {
    const payload = {
      id: linha.id,
      versao_id: versaoId,
      turma_id: linha.turma_id,
      disciplina_id: linha.disciplina_id,
      professor_id: linha.professor_id === "" ? null : linha.professor_id,
      espaco_id: linha.espaco_id === "" ? null : linha.espaco_id,
      dia_semana: linha.dia_semana,
      slot_horario_id: linha.slot_horario_id,
    };
    const jaExiste = aulasRef.current.some((a: any) => String(a.id) === String(linha.id));
    
    let error;
    if (jaExiste) {
      const { error: e } = await supabase.from("aulas").update(payload).eq("id", linha.id);
      error = e;
    } else {
      const { error: e } = await supabase.from("aulas").insert(payload);
      error = e;
    }

    if (error) {
      console.error("Erro no salvar ModoPlanilha:", error, payload);
      alert("Falha ao salvar na planilha: " + error.message + "\nDetalhes: " + JSON.stringify(error));
    } else {
      recarregarAulas();
    }
  };

  const removerLinha = useCallback(async (id: string) => {
    setLinhas((prev) => prev.filter((l: any) => l.id !== id));
    setLinhasVisualizadas((prev) => prev.filter((l: any) => l.id !== id));
    const { error } = await supabase.from("aulas").delete().eq("id", id);
    if (!error) recarregarAulas();
  }, []);

  // FUNÇÃO PARA LIMPAR TODAS AS AULAS DA CATEGORIA SELECIONADA
  const limparCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    const textoEsperado = `LIMPAR ${categoriaFiltro}`;

    if (textoConfirmacao !== textoEsperado) {
      alert(`Frase incorreta. Digite exatamente: ${textoEsperado}`);
      return;
    }

    setLimpando(true);

    // 1. Encontra todos os cursos da categoria atual
    const cursosDaCategoria = cursos.filter(
      (c: any) => getCategoriaCurso(c) === categoriaFiltro,
    );
    const idsCursos = cursosDaCategoria.map((c: any) => String(c.id));

    // 2. Encontra todas as turmas que pertencem a esses cursos
    const turmasDaCategoria = turmas.filter((t: any) =>
      idsCursos.includes(String(t.curso_id)),
    );
    const idsTurmas = turmasDaCategoria.map((t: any) => String(t.id));

    // 3. Deleta apenas as aulas dessas turmas nesta versão de grade
    if (idsTurmas.length > 0) {
      const { error } = await supabase
        .from("aulas")
        .delete()
        .eq("versao_id", versaoId)
        .in("turma_id", idsTurmas);

      if (error) {
        alert("Erro ao limpar a categoria: " + error.message);
      } else {
        setModalLimpezaAberto(false);
        setTextoConfirmacao("");
        recarregarAulas();
      }
    } else {
      alert("Não há turmas cadastradas para esta categoria.");
    }

    setLimpando(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap gap-2">
        {categoriasDisponiveis.map((cat) => (
          <button
            key={cat}
            onClick={() => mudarCategoria(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all border ${
              categoriaFiltro === cat
                ? "bg-green-700 text-white border-green-700 shadow-sm"
                : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-800"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200">
        <div>
          <h2 className="font-bold text-gray-700 text-lg">
            Planilha: <span className="text-green-700">{categoriaFiltro}</span>
          </h2>
          <p className="text-sm text-gray-500">
            {isProcessando
              ? "A processar..."
              : `${linhas.length} linha(s) exibida(s)`}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {categoriaFiltro && (
            <button
              onClick={() => {
                setTextoConfirmacao("");
                setModalLimpezaAberto(true);
              }}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white rounded shadow-sm text-xs font-black transition-colors uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>🗑️</span> Esvaziar {categoriaFiltro}
            </button>
          )}

          <button
            onClick={adicionarLinha}
            className="bg-green-600 text-white px-4 py-2 rounded shadow-sm text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-2 justify-center"
          >
            <span className="text-lg leading-none">+</span> Adicionar Linha
            Vazia
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] relative bg-white">
        {isProcessando ? (
          <div className="flex items-center justify-center h-48 flex-col gap-3">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-500 font-medium">
              Desenhando grade...
            </span>
          </div>
        ) : (
          <table className="w-full border-collapse table-fixed min-w-[1200px]">
            <thead className="sticky top-0 z-[100] shadow-md">
                  <tr className="bg-green-800 text-white text-sm uppercase tracking-wider text-center">
                    <th className="p-3 border-r border-green-700 w-[14%] font-black">
                      Turma
                    </th>
                    <th className="p-3 border-r border-green-700 w-[22%] font-black">
                      Disciplina
                    </th>
                    <th className="p-3 border-r border-green-700 w-[20%] font-black">
                      Professor
                    </th>
                    <th className="p-3 border-r border-green-700 w-[11%] font-black">
                      Sala
                    </th>
                    <th className="p-3 border-r border-green-700 w-[11%] font-black">
                      Dia
                    </th>
                    <th className="p-3 border-r border-green-700 w-[12%] font-black">
                      Horário
                    </th>
                    <th className="p-3 w-[10%] font-black">Ação</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-left">
                  {linhasVisualizadas.map((linha: any) => {
                    const temDado =
                      linha.turma_id ||
                      linha.disciplina_id ||
                      linha.professor_id ||
                      linha.dia_semana ||
                      linha.slot_horario_id;
                    const estaCompleta =
                      linha.turma_id &&
                      linha.disciplina_id &&
                      linha.dia_semana &&
                      linha.slot_horario_id;
                    const linhaRascunho = temDado && !estaCompleta;
                    const corHexadecimal =
                      mapaCoresTurma.get(String(linha.turma_id)) || "";

                    const problemas = choques.filter(
                      (c: any) =>
                        c.id_aula_foco === linha.id &&
                        c.tipo_choque !== "CARGA_INCOMPLETA" &&
                        c.tipo_choque !== "EXCESSO_CARGA",
                    );

                    const temCritico = problemas.some((c: any) =>
                      [
                        "CHOQUE_TURMA",
                        "CHOQUE_ESPACO",
                        "CHOQUE_DOCENTE",
                        "DESCANSO_DOCENTE",
                        "LIMITE_TURNOS",
                        "INDISPONIBILIDADE",
                      ].includes(c.tipo_choque),
                    );
                    const temAlerta = problemas.some((c: any) =>
                      [
                        "DIA_PLANEJAMENTO",
                        "AULAS_GEMINADAS",
                        "FIM_DE_SEMANA",
                      ].includes(c.tipo_choque),
                    );

                    let classeLinha =
                      "border-b border-gray-200 transition-all group hover:brightness-95 ";
                    if (temCritico)
                      classeLinha +=
                        " outline outline-2 outline-offset-[-2px] outline-red-600 z-0 relative";
                    else if (temAlerta)
                      classeLinha +=
                        " outline outline-2 outline-offset-[-2px] outline-yellow-400 z-0 relative";
                    else if (linhaRascunho)
                      classeLinha += " border-l-4 border-l-yellow-400";

                    const tObj = turmasMap.get(String(linha.turma_id));
                    const dFiltradas = tObj?.curso_id
                      ? disciplinasPorCurso.get(String(tObj.curso_id)) || []
                      : [];

                    return (
                      <LinhaPlanilha
                        key={linha.id}
                        linha={linha}
                        turmas={turmas}
                        cursos={cursos}
                        disciplinas={disciplinas}
                        professores={professores}
                        espacos={espacos}
                        slots={slots}
                        categorias={categorias}
                        problemas={problemas}
                        dFiltradas={dFiltradas}
                        corHexadecimal={corHexadecimal}
                        categoriaFiltro={categoriaFiltro}
                        atualizarCampo={atualizarCampo}
                        duplicarLinha={duplicarLinha}
                        removerLinha={removerLinha}
                        getCategoriaCurso={getCategoriaCurso}
                        linhaSendoEditada={linhaSendoEditada}
                      />
                    );
                  })}
                </tbody>
              </table>
        )}
        {!isProcessando && linhasVisualizadas.length < linhas.length && (
          <div className="p-4 text-center text-gray-400 text-sm animate-pulse font-medium">
            Carregando mais linhas silenciosamente...
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE LIMPEZA GERAL (MODO PLANILHA) */}
      {modalLimpezaAberto && (
        <div className="fixed inset-0 bg-red-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border-4 border-red-600">
            <form onSubmit={limparCategoria}>
              <div className="bg-red-600 text-white px-6 py-4 flex items-center gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h3 className="font-black text-xl leading-tight">
                    PERIGO: LIMPEZA EM MASSA
                  </h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-gray-700 font-medium">
                  Você está prestes a excluir{" "}
                  <strong className="text-red-600">TODAS AS AULAS</strong> de{" "}
                  <strong className="text-red-600">TODAS AS TURMAS</strong> que
                  pertencem ao grupo <strong>{categoriaFiltro}</strong> nesta
                  versão da grade.
                </p>
                <p className="text-sm text-gray-500 bg-red-50 p-2 rounded border border-red-100">
                  Isso afetará múltiplos cursos ao mesmo tempo. A ação não pode
                  ser desfeita.
                </p>

                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-black text-gray-700 mb-2">
                    Para confirmar a exclusão, digite exatamente:
                  </label>
                  <div className="bg-gray-100 p-3 rounded text-center select-none mb-3 border border-dashed border-gray-300">
                    <span className="font-mono font-black text-lg text-red-600 tracking-wider">
                      LIMPAR {categoriaFiltro}
                    </span>
                  </div>
                  <input
                    required
                    type="text"
                    value={textoConfirmacao}
                    onChange={(e) =>
                      setTextoConfirmacao(e.target.value.toUpperCase())
                    }
                    placeholder={`LIMPAR ${categoriaFiltro}`}
                    className="w-full border-2 border-red-200 focus:border-red-600 rounded-lg p-3 text-center text-lg font-mono font-bold outline-none text-red-600"
                    autoComplete="off"
                    autoCorrect="off"
                  />
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setModalLimpezaAberto(false);
                    setTextoConfirmacao("");
                  }}
                  className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    textoConfirmacao !== `LIMPAR ${categoriaFiltro}` || limpando
                  }
                  className="bg-red-600 text-white px-6 py-2 rounded font-black shadow hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {limpando ? "Apagando..." : "Sim, Destruir Tudo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
