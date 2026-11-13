"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { classificarGravidadePlanilha } from "./normalizarProblemas";

const formatarHora = (hora: string) => {
  if (!hora) return "";
  return hora.substring(0, 5);
};

const mapearMensagem = (choque: any) => {
  const mensagem = choque.mensagem_customizada || (() => {
    switch (choque.tipo_choque) {
    case "CHOQUE_TURMA":
      return "Choque: Turma já possui aula neste horário.";
    case "CHOQUE_ESPACO":
      return "Choque: Sala/Laboratório já ocupado.";
    case "CHOQUE_DOCENTE":
      return "Choque: Professor já alocado em outra turma.";
    case "DESCANSO_DOCENTE":
      return "Alerta Trabalhista: Sem descanso interjornada (Mín. 10h).";
    case "LIMITE_TURNOS":
      return "Limite: Professor alocado em 3 turnos hoje.";
    case "INDISPONIBILIDADE":
      return "Indisponibilidade: Horário reservado para atendimento especial.";
    case "DIA_PLANEJAMENTO":
      return "Atenção: Dia de planejamento do professor.";
    case "AULAS_GEMINADAS":
      return "Limite: Mais de 2 aulas geminadas desta disciplina.";
    case "EXCESSO_CARGA":
    case "CARGA_HORARIA":
      return "Limite: A carga horária semanal desta disciplina foi excedida.";
    case "FIM_DE_SEMANA":
      return "Atenção: Professor leciona Sexta à noite e Segunda de manhã.";
    default:
      return "Problema detectado.";
    }
  })();

  const gravidade = classificarGravidadePlanilha(choque.tipo_choque);
  const icone = gravidade === "IMPEDITIVO"
    ? "🔴"
    : gravidade === "ALERTA"
      ? "🟡"
      : "⚠️";
  return `${icone} ${mensagem}`;
};

const isCorEscura = (corBase: string) => {
  if (!corBase) return false;
  let hex = corBase.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq < 128;
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
  const [seletorTurmaAberto, setSeletorTurmaAberto] = useState(false);
  const [cursoExpandidoId, setCursoExpandidoId] = useState<string | null>(null);
  const [seletorTurmaAcima, setSeletorTurmaAcima] = useState(false);
  const [alturaMaximaSeletorTurma, setAlturaMaximaSeletorTurma] = useState(288);
  const seletorTurmaRef = useRef<HTMLDivElement>(null);
  const [seletorEspacoAberto, setSeletorEspacoAberto] = useState(false);
  const [categoriaEspacoExpandidaId, setCategoriaEspacoExpandidaId] = useState<string | null>(null);
  const [seletorEspacoAcima, setSeletorEspacoAcima] = useState(false);
  const [alturaMaximaSeletorEspaco, setAlturaMaximaSeletorEspaco] = useState(288);
  const seletorEspacoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!seletorTurmaAberto && !seletorEspacoAberto) return;

    const fecharAoClicarFora = (event: PointerEvent) => {
      if (seletorTurmaAberto && !seletorTurmaRef.current?.contains(event.target as Node)) {
        setSeletorTurmaAberto(false);
      }
      if (seletorEspacoAberto && !seletorEspacoRef.current?.contains(event.target as Node)) {
        setSeletorEspacoAberto(false);
      }
    };
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSeletorTurmaAberto(false);
        setSeletorEspacoAberto(false);
      }
    };

    document.addEventListener("pointerdown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("pointerdown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [seletorTurmaAberto, seletorEspacoAberto]);
  
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

  const problemasCriticos = problemas.filter(
    (problema: any) =>
      classificarGravidadePlanilha(problema.tipo_choque) === "IMPEDITIVO",
  );
  const problemasAlertas = problemas.filter(
    (problema: any) =>
      classificarGravidadePlanilha(problema.tipo_choque) === "ALERTA",
  );
  const temCritico = problemasCriticos.length > 0;
  const temAlerta = problemasAlertas.length > 0;

  const fundoEscuro = isCorEscura(corHexadecimal);
  const corTexto = fundoEscuro ? "text-white" : "text-gray-900";

  const alternarSeletorTurma = () => {
    if (seletorTurmaAberto) {
      setSeletorTurmaAberto(false);
      return;
    }

    const seletor = seletorTurmaRef.current;
    if (seletor) {
      const seletorRect = seletor.getBoundingClientRect();
      let limiteSuperior = 0;
      let limiteInferior = window.innerHeight;
      let ancestral: HTMLElement | null = seletor.parentElement;
      while (ancestral && ancestral !== document.body) {
        const overflowY = window.getComputedStyle(ancestral).overflowY;
        if (overflowY === "auto" || overflowY === "scroll") {
          const limites = ancestral.getBoundingClientRect();
          limiteSuperior = Math.max(limiteSuperior, limites.top);
          limiteInferior = Math.min(limiteInferior, limites.bottom);
          break;
        }
        ancestral = ancestral.parentElement;
      }

      const espacoAcima = seletorRect.top - limiteSuperior;
      const espacoAbaixo = limiteInferior - seletorRect.bottom;
      const abrirAcima = espacoAbaixo < 288 && espacoAcima > espacoAbaixo;
      const espacoDisponivel = abrirAcima ? espacoAcima : espacoAbaixo;
      setSeletorTurmaAcima(abrirAcima);
      setAlturaMaximaSeletorTurma(Math.max(96, Math.min(288, espacoDisponivel - 12)));
    }
    setSeletorTurmaAberto(true);
  };

  const alternarSeletorEspaco = () => {
    if (seletorEspacoAberto) {
      setSeletorEspacoAberto(false);
      return;
    }

    const seletor = seletorEspacoRef.current;
    if (seletor) {
      const seletorRect = seletor.getBoundingClientRect();
      let limiteSuperior = 0;
      let limiteInferior = window.innerHeight;
      let ancestral: HTMLElement | null = seletor.parentElement;
      while (ancestral && ancestral !== document.body) {
        const overflowY = window.getComputedStyle(ancestral).overflowY;
        if (overflowY === "auto" || overflowY === "scroll") {
          const limites = ancestral.getBoundingClientRect();
          limiteSuperior = Math.max(limiteSuperior, limites.top);
          limiteInferior = Math.min(limiteInferior, limites.bottom);
          break;
        }
        ancestral = ancestral.parentElement;
      }

      const espacoAcima = seletorRect.top - limiteSuperior;
      const espacoAbaixo = limiteInferior - seletorRect.bottom;
      const abrirAcima = espacoAbaixo < 288 && espacoAcima > espacoAbaixo;
      const espacoDisponivel = abrirAcima ? espacoAcima : espacoAbaixo;
      setSeletorEspacoAcima(abrirAcima);
      setAlturaMaximaSeletorEspaco(Math.max(96, Math.min(288, espacoDisponivel - 12)));
    }
    setSeletorEspacoAberto(true);
  };

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
  if (seletorTurmaAberto || seletorEspacoAberto) classeLinha += " z-50 relative";

  return (
    <tr
      id={`linha-${linha.id}`}
      className={classeLinha}
      style={corHexadecimal ? { backgroundColor: corHexadecimal } : {}}
    >
      <td className="p-2 border-r border-gray-300 overflow-visible text-center relative">
        {linha.turma_id === undefined ? (
          ""
        ) : (
          <div className="relative" ref={seletorTurmaRef}>
            <button
              type="button"
              title={
                turmas.find(
                  (t: any) => String(t.id) === String(linha.turma_id),
                )?.codigo || "Selecione..."
              }
              aria-expanded={seletorTurmaAberto}
              onClick={alternarSeletorTurma}
              className={`w-full truncate bg-transparent border-0 border-b border-transparent focus:border-green-500 focus:ring-0 text-[13px] p-1 outline-none font-bold ${corTexto} flex items-center justify-between gap-1 text-left`}
            >
              <span className="truncate">
                {turmas.find((t: any) => String(t.id) === String(linha.turma_id))?.codigo || "Selecione..."}
              </span>
              <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${seletorTurmaAberto ? "rotate-180" : ""}`} />
            </button>
            {seletorTurmaAberto && (
              <div
                className={`absolute left-0 z-50 min-w-56 overflow-y-auto rounded border border-gray-300 bg-white p-1 text-left shadow-lg ${seletorTurmaAcima ? "bottom-full mb-1" : "top-full mt-1"}`}
                style={{ maxHeight: `${alturaMaximaSeletorTurma}px` }}
              >
                <button
                  type="button"
                  className="block w-full rounded px-2 py-1.5 text-left text-[13px] text-gray-900 hover:bg-green-50"
                  onClick={() => {
                    atualizarCampo(linha.id, "turma_id", "");
                    setSeletorTurmaAberto(false);
                  }}
                >
                  Selecione...
                </button>
                {cursos
                  .filter((curso: any) => getCategoriaCurso(curso) === categoriaFiltro)
                  .map((curso: any) => {
                    const turmasDoCurso = turmas
                      .filter((turma: any) => String(turma.curso_id) === String(curso.id))
                      .sort((a: any, b: any) => a.codigo.localeCompare(b.codigo));
                    if (turmasDoCurso.length === 0) return null;
                    const expandido = String(cursoExpandidoId) === String(curso.id);
                    return (
                      <div key={curso.id} className="border-t border-gray-100">
                        <button
                          type="button"
                          aria-expanded={expandido}
                          className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-left text-[13px] font-bold text-gray-900 hover:bg-green-50"
                          onClick={() => setCursoExpandidoId(expandido ? null : String(curso.id))}
                        >
                          {expandido ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                          <span className="flex-1">{curso.nome}</span>
                          <span className="text-[11px] font-normal text-gray-500">{turmasDoCurso.length}</span>
                        </button>
                        {expandido && (
                          <div className="pb-1 pl-5">
                            {turmasDoCurso.map((turma: any) => (
                              <button
                                key={turma.id}
                                type="button"
                                aria-selected={String(linha.turma_id) === String(turma.id)}
                                className={`block w-full rounded px-2 py-1 text-left text-[13px] hover:bg-green-50 ${String(linha.turma_id) === String(turma.id) ? "font-bold text-green-800" : "text-gray-700"}`}
                                onClick={() => {
                                  atualizarCampo(linha.id, "turma_id", String(turma.id));
                                  setSeletorTurmaAberto(false);
                                }}
                              >
                                {turma.codigo}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
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
            className={`w-full truncate bg-transparent border-0 border-b border-transparent focus:border-green-500 focus:ring-0 text-[13px] p-1 outline-none font-bold ${corTexto} disabled:opacity-50`}
          >
            <option value="" className="text-gray-900 bg-white">Selecione...</option>
            {dFiltradas.map((d: any) => (
              <option key={d.id} value={d.id} className="text-gray-900 bg-white">
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
            className={`w-full truncate bg-transparent border-0 border-b border-transparent focus:border-green-500 focus:ring-0 text-[13px] p-1 outline-none font-bold ${corTexto}`}
          >
            <option value="" className="text-gray-900 bg-white">(Nenhum)</option>
            {professores.map((p: any) => (
              <option key={p.id} value={p.id} className="text-gray-900 bg-white">
                {p.nome}
              </option>
            ))}
          </select>
        )}
      </td>

      {categoriaFiltro === "INTEGRADO" && (
        <td className="p-2 border-r border-gray-300 overflow-hidden">
          {linha.id.length > 2 && (
            <select
              title={
                linha.modulo === "MODULO_1"
                  ? "1º Trimestre (Módulo 1)"
                  : linha.modulo === "MODULO_2"
                    ? "2º Trimestre (Módulo 2)"
                    : linha.modulo === "MODULO_3"
                      ? "3º Trimestre (Módulo 3)"
                      : "Anual / Semestral"
              }
              value={linha.modulo || "INTEGRAL"}
              onChange={(e) =>
                atualizarCampo(linha.id, "modulo", e.target.value)
              }
              className={`w-full truncate bg-transparent border-0 border-b border-transparent focus:border-green-500 focus:ring-0 text-[12px] p-1 outline-none font-bold ${corTexto}`}
            >
              <option value="INTEGRAL" className="text-gray-900 bg-white">Anual / Semestral</option>
              <option value="MODULO_1" className="text-gray-900 bg-white">1º Trim (M1)</option>
              <option value="MODULO_2" className="text-gray-900 bg-white">2º Trim (M2)</option>
              <option value="MODULO_3" className="text-gray-900 bg-white">3º Trim (M3)</option>
            </select>
          )}
        </td>
      )}

      <td className="p-2 border-r border-gray-300 overflow-visible relative">
        {linha.id.length > 2 && (
          <div className="relative" ref={seletorEspacoRef}>
            <button
              type="button"
              title={espacos.find((espaco: any) => String(espaco.id) === String(linha.espaco_id))?.nome || "(Nenhum)"}
              aria-expanded={seletorEspacoAberto}
              onClick={alternarSeletorEspaco}
              className={`w-full truncate bg-transparent border-0 border-b border-transparent focus:border-green-500 focus:ring-0 text-[13px] p-1 outline-none font-bold ${corTexto} flex items-center justify-between gap-1 text-left`}
            >
              <span className="truncate">
                {espacos.find((espaco: any) => String(espaco.id) === String(linha.espaco_id))?.nome || "(Nenhum)"}
              </span>
              <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${seletorEspacoAberto ? "rotate-180" : ""}`} />
            </button>
            {seletorEspacoAberto && (
              <div
                className={`absolute left-0 z-50 min-w-56 overflow-y-auto rounded border border-gray-300 bg-white p-1 text-left shadow-lg ${seletorEspacoAcima ? "bottom-full mb-1" : "top-full mt-1"}`}
                style={{ maxHeight: `${alturaMaximaSeletorEspaco}px` }}
              >
                <button
                  type="button"
                  className="block w-full rounded px-2 py-1.5 text-left text-[13px] text-gray-900 hover:bg-green-50"
                  onClick={() => {
                    atualizarCampo(linha.id, "espaco_id", "");
                    setSeletorEspacoAberto(false);
                  }}
                >
                  (Nenhum)
                </button>
                {categorias.map((categoria: any) => {
                  const espacosDaCategoria = espacos
                    .filter((espaco: any) => String(espaco.categoria_id) === String(categoria.id))
                    .sort((a: any, b: any) => a.nome.localeCompare(b.nome));
                  if (espacosDaCategoria.length === 0) return null;
                  const expandida = categoriaEspacoExpandidaId === String(categoria.id);
                  return (
                    <div key={categoria.id} className="border-t border-gray-100">
                      <button
                        type="button"
                        aria-expanded={expandida}
                        className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-left text-[13px] font-bold text-gray-900 hover:bg-green-50"
                        onClick={() => setCategoriaEspacoExpandidaId(expandida ? null : String(categoria.id))}
                      >
                        {expandida ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                        <span className="flex-1">{categoria.nome}</span>
                        <span className="text-[11px] font-normal text-gray-500">{espacosDaCategoria.length}</span>
                      </button>
                      {expandida && (
                        <div className="pb-1 pl-5">
                          {espacosDaCategoria.map((espaco: any) => (
                            <button
                              key={espaco.id}
                              type="button"
                              aria-selected={String(linha.espaco_id) === String(espaco.id)}
                              className={`block w-full rounded px-2 py-1 text-left text-[13px] hover:bg-green-50 ${String(linha.espaco_id) === String(espaco.id) ? "font-bold text-green-800" : "text-gray-700"}`}
                              onClick={() => {
                                atualizarCampo(linha.id, "espaco_id", String(espaco.id));
                                setSeletorEspacoAberto(false);
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
                  const espacosSemCategoria = espacos
                    .filter((espaco: any) => !espaco.categoria_id)
                    .sort((a: any, b: any) => a.nome.localeCompare(b.nome));
                  if (espacosSemCategoria.length === 0) return null;
                  const expandida = categoriaEspacoExpandidaId === "__SEM_CATEGORIA__";
                  return (
                    <div className="border-t border-gray-100">
                      <button
                        type="button"
                        aria-expanded={expandida}
                        className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-left text-[13px] font-bold text-gray-900 hover:bg-green-50"
                        onClick={() => setCategoriaEspacoExpandidaId(expandida ? null : "__SEM_CATEGORIA__")}
                      >
                        {expandida ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                        <span className="flex-1">Outros / Sem Categoria</span>
                        <span className="text-[11px] font-normal text-gray-500">{espacosSemCategoria.length}</span>
                      </button>
                      {expandida && (
                        <div className="pb-1 pl-5">
                          {espacosSemCategoria.map((espaco: any) => (
                            <button
                              key={espaco.id}
                              type="button"
                              aria-selected={String(linha.espaco_id) === String(espaco.id)}
                              className={`block w-full rounded px-2 py-1 text-left text-[13px] hover:bg-green-50 ${String(linha.espaco_id) === String(espaco.id) ? "font-bold text-green-800" : "text-gray-700"}`}
                              onClick={() => {
                                atualizarCampo(linha.id, "espaco_id", String(espaco.id));
                                setSeletorEspacoAberto(false);
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
              </div>
            )}
          </div>
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
            className={`w-full truncate bg-transparent border-0 border-b border-transparent focus:border-green-500 focus:ring-0 text-[13px] p-1 outline-none font-bold ${corTexto}`}
          >
            <option value="" className="text-gray-900 bg-white">Selecione...</option>
            <option value="SEGUNDA" className="text-gray-900 bg-white">Segunda-feira</option>
            <option value="TERCA" className="text-gray-900 bg-white">Terça-feira</option>
            <option value="QUARTA" className="text-gray-900 bg-white">Quarta-feira</option>
            <option value="QUINTA" className="text-gray-900 bg-white">Quinta-feira</option>
            <option value="SEXTA" className="text-gray-900 bg-white">Sexta-feira</option>
            <option value="SABADO" className="text-gray-900 bg-white">Sábado</option>
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
            className={`w-full truncate bg-transparent border-0 border-b border-transparent focus:border-green-500 focus:ring-0 text-[13px] p-1 outline-none font-bold ${corTexto}`}
          >
            <option value="" className="text-gray-900 bg-white">Selecione...</option>
            {slots.map((s: any) => (
              <option key={s.id} value={s.id} className="text-gray-900 bg-white">
                {formatarHora(s.hora_inicio)} -{" "}
                {formatarHora(s.hora_fim)}
              </option>
            ))}
          </select>
        )}
      </td>

      <td className="p-2 text-center">
        {linha.id.length > 2 && (
          <div className="inline-flex items-center justify-center gap-1.5 bg-white/90 px-3 py-1.5 rounded-lg shadow-sm border border-gray-100/50 backdrop-blur-sm transition-colors hover:bg-white">
            {temCritico && (
              <span
                className="font-bold cursor-help text-lg animate-pulse"
                title={problemasCriticos
                  .map((p: any) => mapearMensagem(p))
                  .join("\n")}
              >
                🔴
              </span>
            )}
            {temAlerta && (
              <span
                className="font-bold cursor-help text-lg animate-pulse"
                title={problemasAlertas
                  .map((p: any) => mapearMensagem(p))
                  .join("\n")}
              >
                🟡
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
