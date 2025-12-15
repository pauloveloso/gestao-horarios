"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Disciplina, Professor, Sala, Turma } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSucesso: () => void; // Para recarregar a grade ao salvar
  dia: string;
  horarioId: string;
  horarioRotulo: string;
  turma: Turma;
  professores: Professor[];
  salas: Sala[];
  disciplinas: Disciplina[];
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
}: Props) {
  const [profId, setProfId] = useState("");
  const [salaId, setSalaId] = useState("");
  const [discId, setDiscId] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  if (!isOpen) return null;

  async function handleSalvar() {
    setErro("");
    setSalvando(true);

    if (!profId || !salaId || !discId) {
      setErro("Preencha todos os campos.");
      setSalvando(false);
      return;
    }

    try {
      // 1. CHAMA A VALIDAÇÃO NO BANCO (Sua função SQL inteligente)
      const { data: conflitos, error: erroValidacao } = await supabase.rpc(
        "verificar_conflito",
        {
          p_dia: dia,
          p_horario_id: horarioId,
          p_professor_id: profId,
          p_sala_id: salaId,
          p_turma_id: turma.id,
        }
      );

      if (erroValidacao) throw erroValidacao;

      // 2. SE TIVER CONFLITO, MOSTRA O ERRO E PARA
      if (conflitos && conflitos.length > 0) {
        setErro(`ERRO: ${conflitos[0].descricao}`); // Mostra a mensagem exata do banco
        setSalvando(false);
        return;
      }

      // 3. SE NÃO TIVER ERRO, SALVA!
      const { error: erroInsert } = await supabase.from("grade_aulas").insert({
        dia_semana: dia,
        horario_id: horarioId,
        turma_id: turma.id,
        professor_id: profId,
        sala_id: salaId,
        disciplina_id: discId,
      });

      if (erroInsert) throw erroInsert;

      // Sucesso!
      onSucesso();
      onClose();
      // Limpa os campos
      setProfId("");
      setSalaId("");
      setDiscId("");
    } catch (err: any) {
      console.error(err);
      setErro("Erro técnico ao salvar. Veja o console.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-blue-900 border-b pb-2">
          Adicionar Aula
        </h2>

        <div className="mb-4 bg-gray-100 p-3 rounded text-sm text-gray-700">
          <p>
            <strong>Turma:</strong> {turma.codigo}
          </p>
          <p>
            <strong>Quando:</strong> {dia} às {horarioRotulo}
          </p>
        </div>

        {erro && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded border border-red-200">
            {erro}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Disciplina
            </label>
            <select
              className="w-full border p-2 rounded"
              value={discId}
              onChange={(e) => setDiscId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {disciplinas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Professor
            </label>
            <select
              className="w-full border p-2 rounded"
              value={profId}
              onChange={(e) => setProfId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sala
            </label>
            <select
              className="w-full border p-2 rounded"
              value={salaId}
              onChange={(e) => setSalaId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {salas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} ({s.tipo || "Sala"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {salvando ? "Validando..." : "Salvar Aula"}
          </button>
        </div>
      </div>
    </div>
  );
}
