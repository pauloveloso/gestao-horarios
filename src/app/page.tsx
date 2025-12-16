"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Aula, Disciplina, Professor, Sala, SlotHorario, Turma } from "@/types";
import NovoHorarioModal from "@/components/NovoHorarioModal";
import Link from "next/link";

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

export default function Home() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [horarios, setHorarios] = useState<SlotHorario[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);

  const [conflitos, setConflitos] = useState<Record<string, string>>({});

  const [turmaSelecionada, setTurmaSelecionada] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [celulaSelecionada, setCelulaSelecionada] = useState<{
    dia: string;
    horarioId: string;
    horarioRotulo: string;
  } | null>(null);

  // AULA COPIADA (Para Colar)
  const [aulaCopiada, setAulaCopiada] = useState<Aula | null>(null);
  // AULA EDITANDO (Para Alterar)
  const [aulaEditando, setAulaEditando] = useState<Aula | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminToken = localStorage.getItem("usuario_admin");
    setIsAdmin(adminToken === "true");

    async function carregarDadosBasicos() {
      const { data: listaTurmas } = await supabase
        .from("turmas")
        .select("*")
        .order("codigo");
      const { data: listaHorarios } = await supabase
        .from("slots_horarios")
        .select("*")
        .order("ordem");
      const { data: listaProfs } = await supabase
        .from("professores")
        .select("*")
        .order("nome");
      const { data: listaSalas } = await supabase
        .from("salas")
        .select("*")
        .order("nome");
      const { data: listaDiscip } = await supabase
        .from("disciplinas")
        .select("*")
        .order("nome");

      if (listaTurmas) setTurmas(listaTurmas);
      if (listaHorarios) setHorarios(listaHorarios);
      if (listaProfs) setProfessores(listaProfs);
      if (listaSalas) setSalas(listaSalas);
      if (listaDiscip) setDisciplinas(listaDiscip);

      setLoading(false);
    }
    carregarDadosBasicos();
  }, []);

  async function carregarGrade() {
    if (!turmaSelecionada) return;

    const { data } = await supabase
      .from("grade_aulas")
      .select(
        `
        id, dia_semana, horario_id, professor_id, sala_id, disciplina_id, turma_id,
        professor:professores(nome, id),
        sala:salas(nome, id),
        disciplina:disciplinas(nome, id),
        turma:turmas(codigo)
      `
      )
      .eq("turma_id", turmaSelecionada);

    if (data) {
      setAulas(data as any);

      const { data: dadosConflitos } = await supabase.rpc(
        "buscar_conflitos_turma",
        { p_turma_id: turmaSelecionada }
      );

      const mapaConflitos: Record<string, string> = {};
      if (dadosConflitos) {
        dadosConflitos.forEach((c: any) => {
          mapaConflitos[c.aula_id] = c.descricao;
        });
      }
      setConflitos(mapaConflitos);
    }
  }

  useEffect(() => {
    carregarGrade();
    setAulaCopiada(null);
    setAulaEditando(null);
    setConflitos({});
  }, [turmaSelecionada]);

  function handleLogout() {
    localStorage.removeItem("usuario_admin");
    setIsAdmin(false);
    setAulaCopiada(null);
  }

  async function deletarAula(aulaId: string) {
    if (!confirm("Tem certeza que deseja remover esta aula?")) return;
    const { error } = await supabase
      .from("grade_aulas")
      .delete()
      .eq("id", aulaId);
    if (error) alert("Erro ao deletar: " + error.message);
    else carregarGrade();
  }

  function handleEditarAula(
    aula: Aula,
    dia: string,
    horarioId: string,
    horarioRotulo: string
  ) {
    setAulaEditando(aula);
    setCelulaSelecionada({ dia, horarioId, horarioRotulo });
    setModalOpen(true);
  }

  async function colarAulaNoSlot(dia: string, horarioId: string) {
    if (!aulaCopiada) return;

    const { error: erroInsert } = await supabase.from("grade_aulas").insert({
      dia_semana: dia,
      horario_id: horarioId,
      turma_id: turmaSelecionada,
      professor_id:
        aulaCopiada.professor?.id || (aulaCopiada as any).professor_id,
      sala_id: aulaCopiada.sala?.id || (aulaCopiada as any).sala_id,
      disciplina_id:
        aulaCopiada.disciplina?.id || (aulaCopiada as any).disciplina_id,
    });

    if (erroInsert) {
      alert("Erro ao salvar: " + erroInsert.message);
    } else {
      carregarGrade();
    }
  }

  function handleCelulaClick(dia: string, horarioId: string, rotulo: string) {
    if (!isAdmin) return;
    if (aulaCopiada) {
      colarAulaNoSlot(dia, horarioId);
    } else {
      setAulaEditando(null); // Garante que é um novo cadastro
      abrirModal(dia, horarioId, rotulo);
    }
  }

  function abrirModal(dia: string, horarioId: string, horarioRotulo: string) {
    setCelulaSelecionada({ dia, horarioId, horarioRotulo });
    setModalOpen(true);
  }

  const getAulaCelular = (dia: string, horarioId: string) => {
    return aulas.find(
      (a) => a.dia_semana === dia && a.horario_id === horarioId
    );
  };

  const getTurmaObj = () => turmas.find((t) => t.id === turmaSelecionada);

  if (loading)
    return (
      <div className="p-10 text-center text-xl">Carregando sistema...</div>
    );

  return (
    <main className="min-h-screen bg-white text-gray-800 font-sans flex flex-col">
      <header className="flex justify-between items-center bg-gray-100 px-4 py-3 border-b border-gray-300">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-900 flex items-center gap-2">
            🏫 <span className="hidden md:inline">Gestão de Horários</span>
          </h1>

          {isAdmin ? (
            <div className="flex gap-2">
              <Link
                href="/cadastros"
                className="text-sm bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-50 flex items-center gap-1"
              >
                ⚙️ <span className="hidden sm:inline">Cadastros</span>
              </Link>

              {/* BOTÃO DE RELATÓRIOS */}
              <Link
                href="/relatorios"
                className="text-sm bg-white border border-gray-300 text-blue-700 px-3 py-1 rounded hover:bg-blue-50 flex items-center gap-1 font-bold"
              >
                📊 <span className="hidden sm:inline">Relatórios</span>
              </Link>

              <button
                onClick={handleLogout}
                className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
              >
                Sair
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
            >
              🔒 <span className="hidden sm:inline">Sou Professor</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-700">Turma:</label>
          <select
            className="p-1.5 border border-gray-300 rounded text-sm min-w-[150px] font-medium"
            value={turmaSelecionada}
            onChange={(e) => setTurmaSelecionada(e.target.value)}
          >
            <option value="">-- Selecione --</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.codigo}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* ÁREA DA GRADE */}
      <div className="flex-1 overflow-auto p-2">
        {!turmaSelecionada ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-lg m-4">
            <p className="text-gray-400 text-lg">Selecione uma turma acima.</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="hidden mb-4 text-center border-b pb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                Horário Escolar - {getTurmaObj()?.codigo}
              </h1>
              <p className="text-sm text-gray-500">
                Curso: {getTurmaObj()?.curso}
              </p>
            </div>

            <table className="w-full table-fixed border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-blue-800 text-white text-xs uppercase tracking-wider">
                  <th className="p-2 border-r border-blue-700 w-20 text-center">
                    Horário
                  </th>
                  {DIAS_SEMANA.map((dia) => (
                    <th
                      key={dia}
                      className="p-2 border-r border-blue-700 last:border-0"
                    >
                      {dia}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {horarios.map((slot) => (
                  <tr key={slot.id} className="hover:bg-gray-50">
                    <td className="p-1 border-r border-gray-300 bg-gray-100 text-center align-middle">
                      <div className="flex flex-col justify-center h-full">
                        <span className="font-bold text-gray-800 text-sm">
                          {slot.rotulo}
                        </span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase">
                          {slot.periodo}
                        </span>
                      </div>
                    </td>

                    {DIAS_SEMANA.map((dia) => {
                      const aula = getAulaCelular(dia, slot.id);
                      const msgConflito = aula ? conflitos[aula.id] : null;

                      return (
                        <td
                          key={dia}
                          className="p-0.5 border-r border-gray-300 align-top h-20 relative group"
                        >
                          {aula ? (
                            <div
                              className={`w-full h-full p-1.5 rounded flex flex-col justify-between relative transition-all border-l-4 ${
                                aulaCopiada?.id === aula.id
                                  ? "bg-yellow-100 border-yellow-500"
                                  : msgConflito
                                  ? "bg-red-100 border-red-600 animate-pulse"
                                  : "bg-blue-50 border-blue-600"
                              }`}
                              title={msgConflito || ""}
                            >
                              {isAdmin && (
                                <div className="absolute top-0 right-0 flex bg-white/90 rounded-bl shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                  {/* EDITAR (Lápis) */}
                                  <button
                                    onClick={() =>
                                      handleEditarAula(
                                        aula,
                                        dia,
                                        slot.id,
                                        slot.rotulo
                                      )
                                    }
                                    className="p-1 text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                    title="Editar"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={1.5}
                                      stroke="currentColor"
                                      className="w-4 h-4"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                                      />
                                    </svg>
                                  </button>

                                  {/* COPIAR (Duas Folhas) */}
                                  <button
                                    onClick={() => setAulaCopiada(aula)}
                                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                    title="Copiar"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={1.5}
                                      stroke="currentColor"
                                      className="w-4 h-4"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5"
                                      />
                                    </svg>
                                  </button>

                                  {/* DELETAR (Lixeira) */}
                                  <button
                                    onClick={() => deletarAula(aula.id)}
                                    className="p-1 text-red-400 hover:text-red-700 hover:bg-red-50"
                                    title="Remover"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={1.5}
                                      stroke="currentColor"
                                      className="w-4 h-4"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              )}

                              <div className="leading-tight">
                                <strong
                                  className={`block text-base font-bold truncate ${
                                    msgConflito
                                      ? "text-red-900"
                                      : "text-blue-900"
                                  }`}
                                >
                                  {aula.disciplina?.nome}
                                </strong>
                              </div>

                              <div className="mt-1 flex flex-col gap-0.5">
                                <span
                                  className={`text-xs font-medium truncate ${
                                    msgConflito
                                      ? "text-red-800 font-bold"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {aula.professor?.nome}{" "}
                                  {msgConflito ? "⚠️" : ""}
                                </span>

                                <div className="mt-1 flex w-full">
                                  <span
                                    className={`text-xs w-full text-center bg-white border rounded px-1 truncate ${
                                      msgConflito
                                        ? "border-red-400 text-red-700"
                                        : "border-gray-300 text-gray-600"
                                    }`}
                                  >
                                    {aula.sala?.nome}
                                  </span>
                                </div>
                              </div>

                              {/* MENSAGEM DE ERRO (Tooltip) */}
                              {msgConflito && (
                                <div className="absolute -bottom-8 left-0 z-50 bg-red-800 text-white text-[10px] p-1 rounded opacity-0 group-hover:opacity-100 w-[200px] pointer-events-none transition-opacity shadow-lg">
                                  {msgConflito}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              onClick={() =>
                                handleCelulaClick(dia, slot.id, slot.rotulo)
                              }
                              className={`w-full h-full flex items-center justify-center rounded transition-colors ${
                                isAdmin
                                  ? aulaCopiada
                                    ? "cursor-pointer bg-yellow-50 border-2 border-dashed border-yellow-400 hover:bg-yellow-100"
                                    : "cursor-pointer hover:bg-gray-100"
                                  : "bg-transparent"
                              }`}
                            >
                              {isAdmin &&
                                (aulaCopiada ? (
                                  <span className="text-[10px] text-yellow-700 font-bold uppercase tracking-wider">
                                    Colar
                                  </span>
                                ) : (
                                  <span className="text-gray-200 text-2xl font-light opacity-0 group-hover:opacity-100">
                                    +
                                  </span>
                                ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAdmin && aulaCopiada && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-3 z-50">
          <div className="text-sm">
            <span className="text-yellow-400 font-bold mr-1">COPIANDO:</span>
            <span>{aulaCopiada.disciplina?.nome}</span>
          </div>
          <button
            onClick={() => setAulaCopiada(null)}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-200"
          >
            Cancelar
          </button>
        </div>
      )}

      {modalOpen && celulaSelecionada && getTurmaObj() && (
        <NovoHorarioModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSucesso={carregarGrade}
          dia={celulaSelecionada.dia}
          horarioId={celulaSelecionada.horarioId}
          horarioRotulo={celulaSelecionada.horarioRotulo}
          turma={getTurmaObj()!}
          professores={professores}
          salas={salas}
          disciplinas={disciplinas}
          // PASSANDO A AULA PARA EDIÇÃO
          aulaEditando={aulaEditando}
        />
      )}
    </main>
  );
}
