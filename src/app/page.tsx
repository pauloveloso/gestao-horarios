"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PDFPublicoDocument } from "./components/PDFPublicoDocument";
import { Download, CalendarDays, Inbox, ArrowLeft, Lock } from "lucide-react";

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

  const relatorioRef = useRef<HTMLDivElement>(null);

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

      const { data } = await supabase
        .from("versoes_grade")
        .select("*")
        .order("data_inicio_vigencia", { ascending: false });

      if (data && data.length > 0) {
        // SEGURANÇA MÁXIMA: Se não estiver logado, extirpa rascunhos da lista
        const versoesFiltradas = isLogado
          ? data
          : data.filter((v) => v.status !== "RASCUNHO");
        setVersoes(versoesFiltradas);

        const hoje = new Date().toISOString().split("T")[0];
        const ativa =
          versoesFiltradas.find(
            (v) => v.status === "PUBLICADA" && v.data_inicio_vigencia <= hoje,
          ) || versoesFiltradas[0];
        if (ativa) setVersaoSelecionada(ativa.id);
      } else {
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

  const getAulasPublico = (diaId: string, slotId: string) => {
    return dados.aulas.filter(
      (a: any) =>
        a.dia_semana === diaId &&
        String(a.slot_horario_id) === String(slotId) &&
        (tipoFiltro === "TURMA"
          ? String(a.turma_id) === String(idSelecionado)
          : tipoFiltro === "PROFESSOR"
            ? String(a.professor_id) === String(idSelecionado)
            : String(a.espaco_id) === String(idSelecionado)),
    );
  };

  const aulasDoFiltro = dados.aulas.filter((a: any) => {
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

            <select
              value={idSelecionado}
              onChange={(e) => setIdSelecionado(e.target.value)}
              className="bg-white text-green-800 border border-transparent rounded-lg p-2 text-xs font-bold outline-none cursor-pointer hover:border-green-300 transition-all w-full sm:w-[250px] truncate h-10 shadow-sm"
            >
              <option value="">Escolha...</option>
              {tipoFiltro === "TURMA" &&
                dados.cursos.map((curso: any, cIdx: number) => {
                  const turmasDoCurso = dados.turmas.filter(
                    (t: any) => String(t.curso_id) === String(curso.id),
                  );
                  if (turmasDoCurso.length === 0) return null;
                  return (
                    <optgroup
                      key={`curso-${curso.id || cIdx}`}
                      label={curso.nome}
                    >
                      {turmasDoCurso.map((t: any, tIdx: number) => (
                        <option key={`turma-${t.id || tIdx}`} value={t.id}>
                          {t.codigo}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              {tipoFiltro === "PROFESSOR" &&
                dados.professores.map((p: any, pIdx: number) => (
                  <option key={`prof-${p.id || pIdx}`} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              {tipoFiltro === "ESPACO" &&
                dados.categorias.map((cat: any, catIdx: number) => {
                  const espacosDaCat = dados.espacos.filter(
                    (e: any) => String(e.categoria_id) === String(cat.id),
                  );
                  if (espacosDaCat.length === 0) return null;
                  return (
                    <optgroup key={`cat-${cat.id || catIdx}`} label={cat.nome}>
                      {espacosDaCat.map((e: any, eIdx: number) => (
                        <option key={`espaco-${e.id || eIdx}`} value={e.id}>
                          {e.nome}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
            </select>

            <div className="flex gap-2 w-full xl:w-auto mt-4 xl:mt-0">
              {(!idSelecionado || turnosOcupados.length === 0 || !isClient) ? (
                <button
                  disabled
                  className="bg-green-500 disabled:bg-gray-700 text-white px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm h-10 min-w-[150px]"
                >
                  <span className="hidden sm:flex items-center"><Download className="w-4 h-4 mr-2" /> BAIXAR PDF</span>
                  <span className="sm:hidden flex items-center"><Download className="w-4 h-4 mr-1" /> PDF</span>
                </button>
              ) : (
                <PDFDownloadLink
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
                  fileName={`Horario_${tituloSeguro}.pdf`}
                  className="bg-green-500 hover:bg-green-400 text-white px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-sm h-10 min-w-[150px] whitespace-nowrap"
                >
                  {({ loading }) =>
                    loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="hidden sm:inline">GERANDO...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">BAIXAR PDF</span>  <span className="sm:hidden">BAIXAR PDF</span>
                      </>
                    )
                  }
                </PDFDownloadLink>
              )}
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
              {infoVersao && (
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mt-1">
                  Vigência: A partir de{" "}
                  {formatarData(infoVersao.data_inicio_vigencia)}
                </p>
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
                                          const prof = dados.professores.find(
                                            (p: any) =>
                                              p.id === aula.professor_id,
                                          );
                                          const sala = dados.espacos.find(
                                            (e: any) => e.id === aula.espaco_id,
                                          );
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
                                                  className="text-[10px] text-gray-800 font-medium leading-[1.1] uppercase"
                                                  title={prof?.nome}
                                                >
                                                  {prof?.nome || "A DEFINIR"}
                                                </span>
                                              )}

                                              {tipoFiltro !== "ESPACO" && (
                                                <span
                                                  className="text-[10px] text-gray-600 leading-[1.1] uppercase"
                                                  title={sala?.nome}
                                                >
                                                  {sala?.nome || "S/S"}
                                                </span>
                                              )}
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
