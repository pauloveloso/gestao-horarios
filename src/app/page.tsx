"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Aula,
  Disciplina,
  Professor,
  Sala,
  SlotHorario,
  Turma,
} from "@/types/index";
import NovoHorarioModal from "@/components/NovoHorarioModal";

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

  useEffect(() => {
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
        id, dia_semana, horario_id,
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
  }, [turmaSelecionada]);

  // === NOVA FUNÇÃO DE DELETAR ===
  async function deletarAula(aulaId: string) {
    if (!confirm("Tem certeza que deseja remover esta aula?")) return;

    const { error } = await supabase
      .from("grade_aulas")
      .delete()
      .eq("id", aulaId);

    if (error) {
      alert("Erro ao deletar: " + error.message);
    } else {
      carregarGrade(); // Recarrega a tela
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
    <main className="min-h-screen p-4 md:p-8 bg-gray-50 text-gray-800 font-sans">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-2xl md:text-3xl font-bold text-blue-900 mb-4 md:mb-0">
          🏫 Gestão de Horários
        </h1>

        <div className="w-full md:w-1/3">
          <label className="block text-sm font-semibold text-gray-600 mb-1">
            Visualizar Turma:
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            value={turmaSelecionada}
            onChange={(e) => setTurmaSelecionada(e.target.value)}
          >
            <option value="">-- Selecione uma Turma --</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.codigo} {t.curso ? `- ${t.curso}` : ""}
              </option>
            ))}
          </select>
        </div>
      </header>

      {!turmaSelecionada ? (
        <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">
            Selecione uma turma acima para ver a grade.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto shadow-lg rounded-lg bg-white border border-gray-200">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-blue-800 text-white text-sm uppercase tracking-wider">
                <th className="p-4 text-left border-r border-blue-700 w-32 sticky left-0 bg-blue-800 z-10">
                  Horário
                </th>
                {DIAS_SEMANA.map((dia) => (
                  <th
                    key={dia}
                    className="p-4 border-r border-blue-700 min-w-[180px]"
                  >
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {horarios.map((slot) => (
                <tr
                  key={slot.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="p-3 font-bold text-gray-700 border-r bg-gray-100 text-xs md:text-sm sticky left-0 z-10">
                    <div className="flex flex-col">
                      <span>{slot.rotulo}</span>
                      <span className="text-[10px] text-gray-500 font-normal uppercase mt-1">
                        {slot.periodo}
                      </span>
                    </div>
                  </td>

                  {DIAS_SEMANA.map((dia) => {
                    const aula = getAulaCelular(dia, slot.id);
                    return (
                      <td
                        key={dia}
                        className="p-2 border-r border-gray-100 align-top h-28 relative group"
                      >
                        {aula ? (
                          <div className="bg-blue-50 p-2 rounded-md border-l-4 border-blue-500 h-full flex flex-col shadow-sm relative">
                            {/* BOTÃO DE DELETAR (Só aparece quando passa o mouse) */}
                            <button
                              onClick={() => deletarAula(aula.id)}
                              className="absolute top-1 right-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remover aula"
                            >
                              🗑️
                            </button>

                            <div className="mb-1 pr-4">
                              {" "}
                              {/* Padding Right para não bater no botão deletar */}
                              <strong className="block text-blue-900 text-sm leading-tight">
                                {aula.disciplina?.nome}
                              </strong>
                            </div>
                            <div className="mt-auto">
                              <span className="text-xs text-gray-600 block mb-1">
                                👨‍🏫 {aula.professor?.nome}
                              </span>
                              <div className="text-[10px] bg-white text-gray-500 border rounded px-1 py-0.5 inline-block">
                                📍 {aula.sala?.nome}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() =>
                              abrirModal(dia, slot.id, slot.rotulo)
                            }
                            className="h-full flex items-center justify-center rounded hover:bg-gray-200 transition-colors cursor-pointer border border-transparent hover:border-gray-300"
                          >
                            <span className="text-gray-300 hover:text-gray-500 text-3xl font-light">
                              +
                            </span>
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
