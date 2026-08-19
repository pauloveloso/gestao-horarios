"use client";

import React, { memo } from "react";

const formatarHora = (hora: string) => {
  if (!hora) return "";
  return hora.substring(0, 5);
};

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

interface LinhaPlanilhaProps {
  linha: any;
  turmas: any[];
  cursos: any[];
  disciplinas: any[];
  professores: any[];
  espacos: any[];
  slots: any[];
  categorias: any[];
  problemas: any[];
  dFiltradas: any[];
  corHexadecimal: string;
  categoriaFiltro: string;
  atualizarCampo: (id: string, campo: string, valor: string) => void;
  duplicarLinha: (id: string) => void;
  removerLinha: (id: string) => void;
  getCategoriaCurso: (curso: any) => string;
  linhaSendoEditada: string | null;
}

const LinhaPlanilha = memo(({
  linha,
  turmas,
  cursos,
  disciplinas,
  professores,
  espacos,
  slots,
  categorias,
  problemas,
  dFiltradas,
  corHexadecimal,
  categoriaFiltro,
  atualizarCampo,
  duplicarLinha,
  removerLinha,
  getCategoriaCurso,
  linhaSendoEditada
}: LinhaPlanilhaProps) => {
  
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

  if (linhaSendoEditada === linha.id) {
    classeLinha += " ring-2 ring-orange-500 shadow-md z-50 relative brightness-95 !transition-all !duration-500";
  }

  return (
    <tr
      id={`linha-${linha.id}`}
      className={classeLinha}
      style={corHexadecimal ? { backgroundColor: corHexadecimal } : {}}
    >
      <td className="p-2 border-r border-gray-300 overflow-hidden text-center">
        {linha.turma_id === undefined ? (
          ""
        ) : (
          <select
            title={
              turmas.find(
                (t: any) => String(t.id) === String(linha.turma_id),
              )?.codigo || "Selecione..."
            }
            value={linha.turma_id || ""}
            onChange={(e) =>
              atualizarCampo(linha.id, "turma_id", e.target.value)
            }
            className="w-full truncate bg-transparent border-0 border-b border-transparent focus:border-green-500 focus:ring-0 text-[13px] p-1 outline-none font-bold text-gray-800"
          >
            <option value="">Selecione...</option>
            {cursos
              .filter(
                (c: any) =>
                  getCategoriaCurso(c) === categoriaFiltro,
              )
              .map((curso: any) => (
                <optgroup key={curso.id} label={curso.nome}>
                  {turmas
                    .filter(
                      (t: any) =>
                        String(t.curso_id) === String(curso.id),
                    )
                    .map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.codigo}
                      </option>
                    ))}
                </optgroup>
              ))}
          </select>
        )}
      </td>

      <td className="p-2 border-r border-gray-300 overflow-hidden">
        {linha.id.length > 2 && (
          <select
            disabled={!linha.turma_id}
            title={
              disciplinas.find(
                (d: any) =>
                  String(d.id) === String(linha.disciplina_id),
              )?.nome || "Selecione..."
            }
            value={linha.disciplina_id || ""}
            onChange={(e) =>
              atualizarCampo(
                linha.id,
                "disciplina_id",
                e.target.value,
              )
            }
            className="w-full truncate bg-transparent border-0 border-b border-transparent focus:border-green-500 focus:ring-0 text-[13px] p-1 outline-none font-bold text-gray-800 disabled:opacity-50"
          >
            <option value="">Selecione...</option>
            {dFiltradas.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        )}
      </td>

      <td className="p-2 border-r border-gray-300 overflow-hidden">
        {linha.id.length > 2 && (
          <select
            title={
              professores.find(
                (p: any) =>
                  String(p.id) === String(linha.professor_id),
              )?.nome || "(Nenhum)"
            }
            value={linha.professor_id || ""}
            onChange={(e) =>
              atualizarCampo(
                linha.id,
                "professor_id",
                e.target.value,
              )
            }
            className="w-full truncate bg-transparent border-0 border-b border-transparent focus:border-green-500 focus:ring-0 text-[13px] p-1 outline-none"
          >
            <option value="">(Nenhum)</option>
            {professores.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        )}
      </td>

      <td className="p-2 border-r border-gray-300 overflow-hidden">
        {linha.id.length > 2 && (
          <select
            title={
              espacos.find(
                (e: any) =>
                  String(e.id) === String(linha.espaco_id),
              )?.nome || "(Nenhum)"
            }
            value={linha.espaco_id || ""}
            onChange={(e) =>
              atualizarCampo(linha.id, "espaco_id", e.target.value)
            }
            className="w-full truncate bg-transparent border-0 border-b border-transparent focus:border-green-500 focus:ring-0 text-[13px] p-1 outline-none"
          >
            <option value="">(Nenhum)</option>
            {categorias.map((cat: any) => {
              const espacosDaCat = espacos.filter(
                (e: any) =>
                  String(e.categoria_id) === String(cat.id),
              );
              if (espacosDaCat.length === 0) return null;
              return (
                <optgroup key={cat.id} label={cat.nome}>
                  {espacosDaCat.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </optgroup>
              );
            })}
            {(() => {
              const semCat = espacos.filter(
                (e: any) => !e.categoria_id,
              );
              if (semCat.length === 0) return null;
              return (
                <optgroup label="Outros / Sem Categoria">
                  {semCat.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </optgroup>
              );
            })()}
          </select>
        )}
      </td>

      <td className="p-2 border-r border-gray-300 overflow-hidden">
        {linha.id.length > 2 && (
          <select
            title={linha.dia_semana || "Selecione..."}
            value={linha.dia_semana || ""}
            onChange={(e) =>
              atualizarCampo(linha.id, "dia_semana", e.target.value)
            }
            className="w-full truncate bg-transparent border-0 border-b border-transparent focus:border-green-500 focus:ring-0 text-[13px] p-1 outline-none"
          >
            <option value="">Selecione...</option>
            <option value="SEGUNDA">Segunda-feira</option>
            <option value="TERCA">Terça-feira</option>
            <option value="QUARTA">Quarta-feira</option>
            <option value="QUINTA">Quinta-feira</option>
            <option value="SEXTA">Sexta-feira</option>
            <option value="SABADO">Sábado</option>
          </select>
        )}
      </td>

      <td className="p-2 border-r border-gray-300 overflow-hidden">
        {linha.id.length > 2 && (
          <select
            title={
              slots.find(
                (s: any) =>
                  String(s.id) === String(linha.slot_horario_id),
              )
                ? `${formatarHora(slots.find((s: any) => String(s.id) === String(linha.slot_horario_id))?.hora_inicio)} às ${formatarHora(slots.find((s: any) => String(s.id) === String(linha.slot_horario_id))?.hora_fim)}`
                : "Selecione..."
            }
            value={linha.slot_horario_id || ""}
            onChange={(e) =>
              atualizarCampo(
                linha.id,
                "slot_horario_id",
                e.target.value,
              )
            }
            className="w-full truncate bg-transparent border-0 border-b border-transparent focus:border-green-500 focus:ring-0 text-[13px] p-1 outline-none"
          >
            <option value="">Selecione...</option>
            {slots.map((s: any) => (
              <option key={s.id} value={s.id}>
                {formatarHora(s.hora_inicio)} -{" "}
                {formatarHora(s.hora_fim)}
              </option>
            ))}
          </select>
        )}
      </td>

      <td className="p-2 text-center">
        {linha.id.length > 2 && (
          <div className="flex items-center justify-center gap-1.5">
            {(temCritico || temAlerta) && (
              <span
                className="font-bold cursor-help text-lg animate-pulse"
                title={problemas
                  .map((p: any) => mapearMensagem(p))
                  .join("\n")}
              >
                {temCritico ? "🔴" : "🟡"}
              </span>
            )}
            <button
              onClick={() => duplicarLinha(linha.id)}
              className="text-blue-600/60 hover:text-blue-700 font-bold p-1 rounded text-lg"
              title="Duplicar Linha"
            >
              ⧉
            </button>
            <button
              onClick={() => removerLinha(linha.id)}
              className="text-red-600/60 hover:text-red-700 font-bold p-1 rounded"
              title="Remover Linha"
            >
              ✕
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  if (JSON.stringify(prevProps.linha) !== JSON.stringify(nextProps.linha)) return false;
  if (JSON.stringify(prevProps.problemas) !== JSON.stringify(nextProps.problemas)) return false;
  if (prevProps.categoriaFiltro !== nextProps.categoriaFiltro) return false;
  if (prevProps.linhaSendoEditada !== nextProps.linhaSendoEditada) return false;
  return true;
});

export default LinhaPlanilha;
