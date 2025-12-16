"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useReactToPrint } from "react-to-print";

type Slot = { id: string; rotulo: string; periodo: string };
type ItemLista = { id: string; nome: string; codigo?: string; tipo?: string };

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

export default function RelatoriosPage() {
  const [tipoRelatorio, setTipoRelatorio] = useState<
    "turma" | "professor" | "sala"
  >("turma");
  const [idSelecionado, setIdSelecionado] = useState("");
  const [listaItens, setListaItens] = useState<ItemLista[]>([]);
  const [horarios, setHorarios] = useState<Slot[]>([]);
  const [aulas, setAulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Relatorio_${tipoRelatorio}_${idSelecionado}`,
  });

  useEffect(() => {
    async function carregarLista() {
      setLoading(true);
      setIdSelecionado("");
      setAulas([]);

      let tabela = "";
      let ordem = "nome";

      if (tipoRelatorio === "turma") {
        tabela = "turmas";
        ordem = "codigo";
      }
      if (tipoRelatorio === "professor") {
        tabela = "professores";
      }
      if (tipoRelatorio === "sala") {
        tabela = "salas";
      }

      const { data } = await supabase.from(tabela).select("*").order(ordem);

      if (horarios.length === 0) {
        const { data: slots } = await supabase
          .from("slots_horarios")
          .select("*")
          .order("ordem");
        if (slots) setHorarios(slots);
      }

      if (data) setListaItens(data);
      setLoading(false);
    }
    carregarLista();
  }, [tipoRelatorio]);

  useEffect(() => {
    async function buscarGrade() {
      if (!idSelecionado) return;

      let colunaFiltro = "";
      if (tipoRelatorio === "turma") colunaFiltro = "turma_id";
      if (tipoRelatorio === "professor") colunaFiltro = "professor_id";
      if (tipoRelatorio === "sala") colunaFiltro = "sala_id";

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
        .eq(colunaFiltro, idSelecionado);

      if (data) setAulas(data);
    }
    buscarGrade();
  }, [idSelecionado, tipoRelatorio]);

  const getAula = (dia: string, horarioId: string) => {
    return aulas.find(
      (a) => a.dia_semana === dia && a.horario_id === horarioId
    );
  };

  const getItemAtual = () => listaItens.find((i) => i.id === idSelecionado);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 5mm;
          }
          body {
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* HEADER FIXO E CENTRALIZADO */}
      <header className="bg-white border-b px-6 py-4 flex flex-col md:flex-row md:justify-center items-center shadow-sm no-print gap-4 md:relative">
        {/* ESQUERDA */}
        <div className="flex items-center gap-4 md:absolute md:left-6">
          <Link
            href="/"
            className="text-gray-500 hover:text-blue-600 font-bold text-xl"
          >
            ← Voltar
          </Link>
          <h1 className="text-xl font-bold text-blue-900 border-l pl-4 border-gray-300">
            📊 Relatórios
          </h1>
        </div>

        {/* CENTRO (Painel de Controle) */}
        <div className="flex gap-4 items-center bg-gray-100 p-2 rounded-lg z-10">
          {/* Seletor Tipo (Fixo 140px) */}
          <div className="flex flex-col w-[140px]">
            <label className="text-[10px] uppercase font-bold text-gray-500">
              Tipo de Visão
            </label>
            <select
              className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer w-full"
              value={tipoRelatorio}
              onChange={(e) => setTipoRelatorio(e.target.value as any)}
            >
              <option value="turma">Por Turma</option>
              <option value="professor">Por Professor</option>
              <option value="sala">Por Sala/Lab</option>
            </select>
          </div>

          <div className="w-px h-8 bg-gray-300"></div>

          {/* Seletor Item (FIXO 350px - Não muda de tamanho) */}
          <div className="flex flex-col w-[350px]">
            <label className="text-[10px] uppercase font-bold text-gray-500">
              Selecione:
            </label>
            <select
              className="bg-transparent font-bold text-blue-700 outline-none cursor-pointer w-full truncate"
              value={idSelecionado}
              onChange={(e) => setIdSelecionado(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Escolha --</option>
              {listaItens.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome || i.codigo} {i.tipo ? `(${i.tipo})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* DIREITA */}
        {idSelecionado && (
          <div className="md:absolute md:right-6">
            <button
              onClick={() => handlePrint && handlePrint()}
              className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-black flex items-center gap-2 font-medium"
            >
              🖨️ Imprimir PDF
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 p-4 md:p-8 overflow-auto" ref={componentRef}>
        {!idSelecionado ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 border-4 border-dashed rounded-xl no-print">
            <span className="text-4xl mb-2">👆</span>
            <p>Selecione um item acima para gerar o relatório.</p>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 min-w-[800px]">
            <div className="text-center mb-6 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-900 uppercase">
                {tipoRelatorio === "turma" && "Horário da Turma"}
                {tipoRelatorio === "professor" && "Horário Docente"}
                {tipoRelatorio === "sala" && "Ocupação de Sala"}
              </h2>
              <h3 className="text-xl text-blue-800 font-bold mt-1">
                {getItemAtual()?.nome || getItemAtual()?.codigo}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Gerado em: {new Date().toLocaleDateString()}
              </p>
            </div>

            <table className="w-full table-fixed border-collapse border border-gray-800">
              <thead>
                <tr className="bg-gray-200 text-black text-sm uppercase">
                  <th className="p-2 border border-gray-800 w-24">Horário</th>
                  {DIAS_SEMANA.map((dia) => (
                    <th key={dia} className="p-2 border border-gray-800">
                      {dia}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horarios.map((slot) => (
                  <tr key={slot.id}>
                    <td className="p-2 border border-gray-800 bg-gray-50 text-center font-bold text-xs">
                      {slot.rotulo}
                      <div className="text-[9px] text-gray-500 font-normal mt-1">
                        {slot.periodo}
                      </div>
                    </td>

                    {DIAS_SEMANA.map((dia) => {
                      const aula = getAula(dia, slot.id);
                      return (
                        <td
                          key={dia}
                          className="p-1 border border-gray-800 h-20 align-top"
                        >
                          {aula ? (
                            <div className="h-full flex flex-col justify-center text-center text-xs p-1">
                              <strong className="block text-sm mb-1 text-black">
                                {aula.disciplina?.nome}
                              </strong>

                              <span className="text-gray-700 block">
                                {tipoRelatorio === "turma"
                                  ? aula.professor?.nome
                                  : tipoRelatorio === "professor"
                                  ? `Turma: ${aula.turma?.codigo}`
                                  : tipoRelatorio === "sala"
                                  ? `Prof: ${aula.professor?.nome}`
                                  : ""}
                              </span>

                              <span className="text-[10px] text-gray-500 mt-1 bg-gray-100 rounded px-1 inline-block mx-auto">
                                {tipoRelatorio === "turma"
                                  ? aula.sala?.nome
                                  : tipoRelatorio === "professor"
                                  ? aula.sala?.nome
                                  : tipoRelatorio === "sala"
                                  ? `Turma: ${aula.turma?.codigo}`
                                  : ""}
                              </span>
                            </div>
                          ) : (
                            <div className="h-full bg-gray-50/30"></div>
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
    </div>
  );
}
