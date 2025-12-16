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

  const [turmaSelecionada, setTurmaSelecionada] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [celulaSelecionada, setCelulaSelecionada] = useState<{
    dia: string;
    horarioId: string;
    horarioRotulo: string;
  } | null>(null);
  const [aulaCopiada, setAulaCopiada] = useState<Aula | null>(null);

  // === ESTADO DE SEGURANÇA ===
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
        professor:professores(nome),
        sala:salas(nome),
        disciplina:disciplinas(nome),
        turma:turmas(codigo)
      `
      )
      .eq("turma_id", turmaSelecionada);

    if (data) setAulas(data as any);
  }

  useEffect(() => {
    carregarGrade();
    setAulaCopiada(null);
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

  async function colarAulaNoSlot(dia: string, horarioId: string) {
    if (!aulaCopiada) return;

    const { data: conflitos, error: erroValidacao } = await supabase.rpc(
      "verificar_conflito",
      {
        p_dia: dia,
        p_horario_id: horarioId,
        p_professor_id:
          aulaCopiada.professor?.id || (aulaCopiada as any).professor_id,
        p_sala_id: aulaCopiada.sala?.id || (aulaCopiada as any).sala_id,
        p_turma_id: turmaSelecionada,
      }
    );

    if (erroValidacao) {
      alert("Erro técnico ao validar.");
      return;
    }

    if (conflitos && conflitos.length > 0) {
      alert(`NÃO FOI POSSÍVEL COLAR:\n${conflitos[0].descricao}`);
      return;
    }

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
    // SÓ PERMITE CLICK SE FOR ADMIN
    if (!isAdmin) return;

    if (aulaCopiada) {
      colarAulaNoSlot(dia, horarioId);
    } else {
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

  // === ESTA FOI A FUNÇÃO QUE FALTOU ANTES ===
  const getTurmaObj = () => {
    return turmas.find((t) => t.id === turmaSelecionada);
  };
  // ===========================================

  if (loading)
    return (
      <div className="p-10 text-center text-xl">Carregando sistema...</div>
    );

  return (
    <main className="min-h-screen bg-white text-gray-800 font-sans flex flex-col">
      {/* HEADER */}
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
          <table className="w-full table-fixed border-collapse border border-gray-300">
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
                    return (
                      <td
                        key={dia}
                        className="p-0.5 border-r border-gray-300 align-top h-20 relative group"
                      >
                        {aula ? (
                          <div
                            className={`w-full h-full p-1.5 rounded flex flex-col justify-between relative transition-all ${
                              aulaCopiada?.id === aula.id
                                ? "bg-yellow-100 border-2 border-yellow-500"
                                : "bg-blue-50 border-l-4 border-blue-600"
                            }`}
                          >
                            {isAdmin && (
                              <div className="absolute top-0 right-0 flex bg-white/90 rounded-bl shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                  onClick={() => setAulaCopiada(aula)}
                                  className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                  title="Copiar"
                                >
                                  📄
                                </button>
                                <button
                                  onClick={() => deletarAula(aula.id)}
                                  className="p-1 text-red-400 hover:text-red-700 hover:bg-red-50"
                                  title="Remover"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}

                            <div className="leading-tight">
                              <strong className="block text-blue-900 text-base font-bold truncate">
                                {aula.disciplina?.nome}
                              </strong>
                            </div>

                            <div className="mt-1 flex flex-col gap-0.5">
                              <span className="text-xs font-medium text-gray-700 truncate">
                                {aula.professor?.nome}
                              </span>
                              <div className="flex justify-between items-end">
                                <span className="text-[11px] bg-white text-gray-600 border border-gray-300 rounded px-1 truncate max-w-[80px]">
                                  {aula.sala?.nome}
                                </span>
                              </div>
                            </div>
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
        />
      )}
    </main>
  );
}
