"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Aula, Disciplina, Professor, Sala, Turma } from "@/types";

interface NovoHorarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSucesso: () => void;
  dia: string;
  horarioId: string;
  horarioRotulo: string;
  turma: Turma;
  professores: Professor[];
  salas: Sala[];
  disciplinas: Disciplina[];
  // NOVA PROPRIEDADE: AULA PARA EDIÇÃO (OPCIONAL)
  aulaEditando?: Aula | null;
}

export default function NovoHorarioModal({
  isOpen,
  onClose,
  onSucesso,
  dia,
  horarioId,
  horarioRotulo,
  turma,
  professores,
  salas,
  disciplinas,
  aulaEditando,
}: NovoHorarioModalProps) {
  const [professorId, setProfessorId] = useState("");
  const [salaId, setSalaId] = useState("");
  const [disciplinaId, setDisciplinaId] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (aulaEditando) {
        // MODO EDIÇÃO: Preenche com os dados existentes
        setProfessorId(
          (aulaEditando as any).professor_id || aulaEditando.professor?.id || ""
        );
        setSalaId((aulaEditando as any).sala_id || aulaEditando.sala?.id || "");
        setDisciplinaId(
          (aulaEditando as any).disciplina_id ||
            aulaEditando.disciplina?.id ||
            ""
        );
      } else {
        // MODO CRIAÇÃO: Limpa tudo
        setProfessorId("");
        setSalaId("");
        setDisciplinaId("");
      }
      setSalvando(false);
    }
  }, [isOpen, aulaEditando]);

  if (!isOpen) return null;

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    const payload = {
      dia_semana: dia,
      horario_id: horarioId,
      turma_id: turma.id,
      professor_id: professorId,
      sala_id: salaId,
      disciplina_id: disciplinaId,
    };

    let error;

    if (aulaEditando) {
      // === ATUALIZAR (UPDATE) ===
      const response = await supabase
        .from("grade_aulas")
        .update(payload)
        .eq("id", aulaEditando.id);
      error = response.error;
    } else {
      // === CRIAR NOVO (INSERT) ===
      const response = await supabase.from("grade_aulas").insert(payload);
      error = response.error;
    }

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      onSucesso();
      onClose();
    }

    setSalvando(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-blue-900 mb-1">
          {aulaEditando ? "Editar Aula" : "Novo Horário"}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          {dia} às {horarioRotulo} - Turma {turma.codigo}
        </p>

        <form onSubmit={handleSalvar} className="flex flex-col gap-4">
          {/* DISCIPLINA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Disciplina
            </label>
            <select
              required
              className="w-full border border-gray-300 rounded p-2 text-gray-800"
              value={disciplinaId}
              onChange={(e) => setDisciplinaId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {disciplinas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>

          {/* PROFESSOR */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Professor(a)
            </label>
            <select
              required
              className="w-full border border-gray-300 rounded p-2 text-gray-800"
              value={professorId}
              onChange={(e) => setProfessorId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {/* SALA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sala / Lab
            </label>
            <select
              required
              className="w-full border border-gray-300 rounded p-2 text-gray-800"
              value={salaId}
              onChange={(e) => setSalaId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {salas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} {s.tipo ? `(${s.tipo})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className={`flex-1 text-white py-2 rounded font-bold disabled:opacity-50 ${
                aulaEditando
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {salvando ? "Salvando..." : aulaEditando ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
