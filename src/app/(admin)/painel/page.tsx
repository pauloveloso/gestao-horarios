"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useMasterData } from "../components/MasterDataContext";
import { useUser } from "../components/UserContext";
import { RefreshCw, Users, Building, ShieldAlert, AlertTriangle, Sparkles, List, Calendar, Clock } from "lucide-react";

export default function DashboardPage() {
  const { user, isCoordenador } = useUser();
  const { dadosMestres, carregando: carregandoMestre } = useMasterData();
  const [carregandoAulas, setCarregandoAulas] = useState(true);

  const [versoes, setVersoes] = useState<any[]>([]);
  const [versaoSelecionada, setVersaoSelecionada] = useState<string>("");

  const [metricas, setMetricas] = useState({
    totalAulas: 0,
    semProfessor: 0,
    semSala: 0,
    totalConflitos: 0,
  });

  const [choquesCriticos, setChoquesCriticos] = useState<any[]>([]);
  const [alertasSecundarios, setAlertasSecundarios] = useState<any[]>([]);

  // Dados do Professor/TAE
  const [professorVinculado, setProfessorVinculado] = useState<any>(null);
  const [aulasProfessor, setAulasProfessor] = useState<any[]>([]);
  const [reservasProfessor, setReservasProfessor] = useState<any[]>([]);

  useEffect(() => {
    async function carregarVersoes() {
      const { data } = await supabase
        .from("versoes_grade")
        .select("*")
        .order("data_inicio_vigencia", { ascending: false });

      if (data && data.length > 0) {
        setVersoes(data);
        const rascunho = data.find((v) => v.status === "RASCUNHO");
        if (rascunho) {
          setVersaoSelecionada(rascunho.id);
        } else {
          const hoje = new Date().toISOString().split("T")[0];
          const ativa =
            data.find((v) => v.status === "PUBLICADA" && v.data_inicio_vigencia <= hoje) || data[0];
          setVersaoSelecionada(ativa.id);
        }
      } else {
        setCarregandoAulas(false);
      }
    }
    carregarVersoes();
  }, []);

  useEffect(() => {
    if (versaoSelecionada && dadosMestres) {
      if (user?.nivel_acesso === "PROFESSOR_TAE") {
        carregarDadosProfessor();
      } else {
        carregarDadosEDiagnosticar();
      }
    }
  }, [versaoSelecionada, dadosMestres, user]);

  /*const carregarDadosProfessor = async () => {
    setCarregandoAulas(true);
    try {
      const nomeUsuario = user?.nome?.trim().toLowerCase() || "";
      const prof = dadosMestres?.professores?.find(p =>
        p.nome?.trim().toLowerCase() === nomeUsuario
      );
      setProfessorVinculado(prof || null);

      if (prof) {
        const { data: aulas } = await supabase
          .from("aulas")
          .select("*")
          .eq("versao_id", versaoSelecionada)
          .eq("professor_id", prof.id);
        setAulasProfessor(aulas || []);
      }

      const hoje = new Date().toISOString().split("T")[0];
      const { data: reservas } = await supabase
        .from("reservas_espacos")
        .select("*")
        .eq("criado_por", user?.id)
        .gte("data_reserva", hoje)
        .order("data_reserva", { ascending: true })
        .limit(5);
      setReservasProfessor(reservas || []);
    } finally {
      setCarregandoAulas(false);
    }
  };*/

  const carregarDadosProfessor = async () => {
  setCarregandoAulas(true);
  try {
    // Função auxiliar para remover acentos, TODOS os espaços e deixar minúsculo
    const limparString = (str) => {
      return str
        ? str.normalize("NFD")
             .replace(/[\u0300-\u036f]/g, "") // Remove os acentos
             .replace(/\s+/g, "")             // Remove todos os espaços em branco
             .toLowerCase()                   // Converte para letras minúsculas
        : "";
    };

    const nomeUsuarioLimpo = limparString(user?.nome);

    const prof = dadosMestres?.professores?.find(p =>
      limparString(p.nome) === nomeUsuarioLimpo
    );

    setProfessorVinculado(prof || null);

    if (prof) {
      const { data: aulas } = await supabase
        .from("aulas")
        .select("*")
        .eq("versao_id", versaoSelecionada)
        .eq("professor_id", prof.id);
      setAulasProfessor(aulas || []);
    }

    const hoje = new Date().toISOString().split("T")[0];
    const { data: reservas } = await supabase
      .from("reservas_espacos")
      .select("*")
      .eq("criado_por", user?.id)
      .gte("data_reserva", hoje)
      .order("data_reserva", { ascending: true })
      .limit(5);
    setReservasProfessor(reservas || []);
  } finally {
    setCarregandoAulas(false);
  }
};

  const carregarDadosEDiagnosticar = async () => {
    if (!dadosMestres) return;
    setCarregandoAulas(true);
    try {
      const { data: aulas } = await supabase
        .from("aulas")
        .select("*")
        .eq("versao_id", versaoSelecionada)
        .limit(5000);

      if (!aulas || !dadosMestres.slots) return;

      let aulasParaDiagnostico = aulas;

      if (user?.nivel_acesso === "COORDENADOR" && user.curso_id) {
        const turmasDoCurso = (dadosMestres.turmas || [])
          .filter(t => String(t.curso_id) === String(user.curso_id))
          .map(t => String(t.id));
        aulasParaDiagnostico = aulas.filter(a => turmasDoCurso.includes(String(a.turma_id)));
      }

      diagnosticarGrade(
        aulasParaDiagnostico,
        dadosMestres.turmas || [],
        dadosMestres.professores || [],
        dadosMestres.disciplinas || [],
        dadosMestres.espacos || [],
        dadosMestres.slots,
      );
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setCarregandoAulas(false);
    }
  };

  const getNome = (lista: any[], id: string, campo: string = "nome") => {
    const item = lista.find((i) => String(i.id) === String(id));
    return item ? item[campo] || item.codigo : "Desconhecido";
  };

  const diagnosticarGrade = (
    aulas: any[],
    turmas: any[],
    professores: any[],
    disciplinas: any[],
    espacos: any[],
    slots: any[],
  ) => {
    const aulasAlocadas = aulas.filter(
      (a) => a.dia_semana && a.slot_horario_id && a.turma_id && a.disciplina_id,
    );

    let semProf = 0;
    let semSala = 0;
    let criticos: any[] = [];
    let secundarios: any[] = [];

    const formatarHorario = (dia: string, slotId: string) => {
      const slot = slots.find((s) => String(s.id) === String(slotId));
      return `${dia} às ${slot ? slot.hora_inicio.substring(0, 5) : ""}`;
    };

    aulasAlocadas.forEach((aulaAtual, index) => {
      if (!aulaAtual.professor_id) semProf++;
      if (!aulaAtual.espaco_id) semSala++;

      if (aulaAtual.professor_id) {
        const prof = professores.find(
          (p) => String(p.id) === String(aulaAtual.professor_id),
        );
        if (
          prof &&
          String(prof.dia_planejamento).toUpperCase() ===
            String(aulaAtual.dia_semana).toUpperCase()
        ) {
          secundarios.push({
            tipo: "Dia de Planejamento",
            msg: `Professor(a) ${prof.nome} está alocado(a) no dia de planejamento (${aulaAtual.dia_semana}).`,
            local: `Turma ${getNome(turmas, aulaAtual.turma_id, "codigo")} - ${getNome(disciplinas, aulaAtual.disciplina_id)}`,
          });
        }
      }

      for (let i = index + 1; i < aulasAlocadas.length; i++) {
        const outraAula = aulasAlocadas[i];
        if (
          aulaAtual.dia_semana === outraAula.dia_semana &&
          String(aulaAtual.slot_horario_id) === String(outraAula.slot_horario_id)
        ) {
          const horarioStr = formatarHorario(aulaAtual.dia_semana, aulaAtual.slot_horario_id);

          if (
            aulaAtual.espaco_id &&
            String(aulaAtual.espaco_id) === String(outraAula.espaco_id) &&
            String(aulaAtual.turma_id) !== String(outraAula.turma_id)
          ) {
            criticos.push({
              tipo: "Choque de Sala",
              msg: `${getNome(espacos, aulaAtual.espaco_id)} ocupada por duas turmas.`,
              detalhe: `${getNome(turmas, aulaAtual.turma_id, "codigo")} e ${getNome(turmas, outraAula.turma_id, "codigo")} (${horarioStr})`,
            });
          }
          if (
            aulaAtual.professor_id &&
            String(aulaAtual.professor_id) === String(outraAula.professor_id) &&
            String(aulaAtual.turma_id) !== String(outraAula.turma_id)
          ) {
            criticos.push({
              tipo: "Choque de Professor",
              msg: `Prof(a). ${getNome(professores, aulaAtual.professor_id)} em duas turmas.`,
              detalhe: `${getNome(turmas, aulaAtual.turma_id, "codigo")} e ${getNome(turmas, outraAula.turma_id, "codigo")} (${horarioStr})`,
            });
          }
          if (
            String(aulaAtual.turma_id) === String(outraAula.turma_id) &&
            String(aulaAtual.disciplina_id) !== String(outraAula.disciplina_id)
          ) {
            criticos.push({
              tipo: "Choque na Turma",
              msg: `Turma ${getNome(turmas, aulaAtual.turma_id, "codigo")} com duas matérias.`,
              detalhe: `${getNome(disciplinas, aulaAtual.disciplina_id)} e ${getNome(disciplinas, outraAula.disciplina_id)} (${horarioStr})`,
            });
          }
        }
      }
    });

    const criticosUnicos = Array.from(new Set(criticos.map((c) => JSON.stringify(c)))).map((s) => JSON.parse(s));
    const secUnicos = Array.from(new Set(secundarios.map((c) => JSON.stringify(c)))).map((s) => JSON.parse(s));

    setChoquesCriticos(criticosUnicos);
    setAlertasSecundarios(secUnicos);
    setMetricas({
      totalAulas: aulasAlocadas.length,
      semProfessor: semProf,
      semSala: semSala,
      totalConflitos: criticosUnicos.length,
    });
  };

  const agruparPorTipo = (lista: any[]) => {
    return lista.reduce((acc: any, curr: any) => {
      if (!acc[curr.tipo]) acc[curr.tipo] = [];
      acc[curr.tipo].push(curr);
      return acc;
    }, {});
  };

  const criticosAgrupados = agruparPorTipo(choquesCriticos);
  const alertasAgrupados = agruparPorTipo(alertasSecundarios);
  const carregandoGlobal = carregandoMestre || carregandoAulas;

  if (carregandoGlobal && !versaoSelecionada) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }


  const renderCoordenadorView = () => {
    const nomeCurso = user?.curso_id
      ? getNome(dadosMestres?.cursos || [], user.curso_id)
      : null;

    const turmasDoCurso = (dadosMestres?.turmas || [])
      .filter((t: any) => user?.curso_id && String(t.curso_id) === String(user.curso_id));

    return (
      <>
        {/* Banner do curso */}
        {nomeCurso && (
          <div className="bg-blue-900 rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-blue-300 font-black uppercase tracking-widest">Seu Curso</p>
              <h2 className="text-white font-black text-lg leading-tight">{nomeCurso}</h2>
              <p className="text-blue-300 text-xs mt-0.5">{turmasDoCurso.length} turma(s) cadastrada(s)</p>
            </div>
          </div>
        )}

        {!user?.curso_id && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800 font-medium">
              Seu perfil de Coordenador ainda não está vinculado a um curso. Solicite ao administrador que realize essa configuração em <strong>Usuários do Sistema</strong>.
            </p>
          </div>
        )}

        {/* Métricas do curso */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-[10px] font-black uppercase text-gray-400">Aulas Alocadas</span>
            <div className="text-3xl font-black text-blue-800">{metricas.totalAulas}</div>
            <p className="text-[10px] text-gray-400 mt-1">no seu curso</p>
          </div>
          <div className={`p-5 rounded-xl border shadow-sm ${metricas.totalConflitos > 0 ? "bg-red-50 border-red-100" : "bg-white border-gray-100"}`}>
            <span className="text-[10px] font-black uppercase text-gray-400">Choques Críticos</span>
            <div className={`text-3xl font-black ${metricas.totalConflitos > 0 ? "text-red-600" : "text-gray-800"}`}>
              {metricas.totalConflitos}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">impedimentos físicos</p>
          </div>
          <div className={`p-5 rounded-xl border shadow-sm ${metricas.semProfessor > 0 ? "bg-yellow-50 border-yellow-100" : "bg-white border-gray-100"}`}>
            <span className="text-[10px] font-black uppercase text-gray-400">Sem Professor</span>
            <div className="text-3xl font-black text-gray-800">{metricas.semProfessor}</div>
            <p className="text-[10px] text-gray-400 mt-1">vagas abertas</p>
          </div>
          <div className={`p-5 rounded-xl border shadow-sm ${metricas.semSala > 0 ? "bg-orange-50 border-orange-100" : "bg-white border-gray-100"}`}>
            <span className="text-[10px] font-black uppercase text-gray-400">Sem Sala</span>
            <div className="text-3xl font-black text-gray-800">{metricas.semSala}</div>
            <p className="text-[10px] text-gray-400 mt-1">aulas sem espaço</p>
          </div>
        </div>

        {/* Atalhos de relatório */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/relatorios/professores"
            className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-5 group cursor-pointer"
          >
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-black text-gray-800 group-hover:text-blue-700 transition-colors text-lg">Carga Horária Docente</h3>
              <p className="text-sm text-gray-500 mt-0.5">Distribuição de aulas e horas dos professores do seu curso.</p>
            </div>
          </Link>

          <Link
            href="/relatorios/ocupacao-salas"
            className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:border-green-300 hover:shadow-md transition-all flex items-center gap-5 group cursor-pointer"
          >
            <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors shrink-0">
              <Building className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-black text-gray-800 group-hover:text-green-700 transition-colors text-lg">Ocupação de Salas</h3>
              <p className="text-sm text-gray-500 mt-0.5">Espaços utilizados pelas turmas do seu curso.</p>
            </div>
          </Link>
        </div>

        {/* Choques e alertas filtrados por curso */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-bold text-gray-700 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" /> Impedimentos Físicos
              </h2>
              <span className="bg-red-100 text-red-700 font-black text-xs px-2 py-1 rounded-full">{choquesCriticos.length}</span>
            </div>
            <div className="h-[400px] overflow-y-auto custom-scrollbar">
              {choquesCriticos.length === 0 ? (
                <div className="p-10 text-center text-gray-400 h-full flex flex-col items-center justify-center">
                  <Building className="w-10 h-10 mb-3 text-green-400 opacity-70" />
                  <p className="font-medium">Nenhum choque detectado no seu curso.</p>
                </div>
              ) : (
                Object.keys(criticosAgrupados).sort().map((tipo, tIdx) => (
                  <div key={tIdx} className="border-b border-gray-100 last:border-0">
                    <div className="bg-red-50/50 px-4 py-2 text-xs font-black text-red-800 uppercase tracking-widest border-b border-red-100/50 sticky top-0 z-10 backdrop-blur-sm flex justify-between items-center">
                      <span>{tipo}</span>
                      <span className="bg-white text-red-600 px-2 py-0.5 rounded-full border border-red-200 text-[10px]">{criticosAgrupados[tipo].length}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {criticosAgrupados[tipo].map((choque: any, idx: number) => (
                        <div key={idx} className="p-4 hover:bg-red-50/30 transition-colors">
                          <p className="font-bold text-gray-800 text-sm">{choque.msg}</p>
                          <p className="text-[11px] font-bold text-red-600 mt-1 uppercase tracking-wider">{choque.detalhe}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-bold text-gray-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" /> Alertas de Planejamento
              </h2>
              <span className="bg-yellow-100 text-yellow-700 font-black text-xs px-2 py-1 rounded-full">{alertasSecundarios.length}</span>
            </div>
            <div className="h-[400px] overflow-y-auto custom-scrollbar">
              {alertasSecundarios.length === 0 ? (
                <div className="p-10 text-center text-gray-400 h-full flex flex-col items-center justify-center">
                  <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                  <p className="font-medium">Nenhum alerta no seu curso.</p>
                </div>
              ) : (
                Object.keys(alertasAgrupados).sort().map((tipo, tIdx) => (
                  <div key={tIdx} className="border-b border-gray-100 last:border-0">
                    <div className="bg-yellow-50/50 px-4 py-2 text-xs font-black text-yellow-800 uppercase tracking-widest border-b border-yellow-100/50 sticky top-0 z-10 backdrop-blur-sm flex justify-between items-center">
                      <span>{tipo}</span>
                      <span className="bg-white text-yellow-600 px-2 py-0.5 rounded-full border border-yellow-200 text-[10px]">{alertasAgrupados[tipo].length}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {alertasAgrupados[tipo].map((alerta: any, idx: number) => (
                        <div key={idx} className="p-4 hover:bg-yellow-50/30 transition-colors">
                          <p className="font-bold text-gray-800 text-sm">{alerta.msg}</p>
                          <p className="text-[11px] text-gray-500 font-bold mt-1 uppercase italic">{alerta.local}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderProfessorView = () => {
    const DIAS = ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA"];
    const LABELS_DIAS: Record<string, string> = {
      SEGUNDA: "Segunda", TERCA: "Terça", QUARTA: "Quarta", QUINTA: "Quinta", SEXTA: "Sexta",
    };

    // Pega todos os slots e ordena por hora
    const slots = [...(dadosMestres?.slots || [])].sort((a: any, b: any) =>
      a.hora_inicio > b.hora_inicio ? 1 : -1
    );

    // Cria índice: { "dia-slotId": aula }
    const aulasPorCelula: Record<string, any> = {};
    aulasProfessor.forEach(a => {
      aulasPorCelula[`${a.dia_semana}-${a.slot_horario_id}`] = a;
    });

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Tabela semanal — ocupa 2/3 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-green-700" />
            <h2 className="font-black text-green-800 text-sm uppercase tracking-wide">Meu Horário Semanal</h2>
          </div>

          {!professorVinculado ? (
            <div className="text-center py-10">
              <div className="bg-gray-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-700">Perfil não vinculado</h3>
              <p className="text-gray-500 mt-1 text-xs max-w-xs mx-auto">
                Nenhum professor encontrado com o nome <b>{user?.nome}</b>. Contate o administrador.
              </p>
            </div>
          ) : aulasProfessor.length === 0 ? (
            <div className="text-center py-10">
              <div className="bg-green-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-7 h-7 text-green-500" />
              </div>
              <h3 className="font-bold text-gray-700">Sem aulas alocadas</h3>
              <p className="text-gray-500 mt-1 text-xs max-w-xs mx-auto">
                Nenhuma aula cadastrada nesta versão da grade.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-green-900 text-white">
                    <th className="px-2 py-2 text-left font-black text-[10px] uppercase tracking-wider w-20 border-r border-green-700">
                      Horário
                    </th>
                    {DIAS.map(dia => (
                      <th key={dia} className="px-2 py-2 text-center font-black text-[10px] uppercase tracking-wider border-r border-green-700 last:border-r-0">
                        {LABELS_DIAS[dia]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot: any, idx: number) => (
                    <tr key={slot.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-2 py-1.5 border-r border-b border-gray-100 whitespace-nowrap align-middle">
                        <div className="font-black text-gray-700 text-[10px]">{slot.hora_inicio.substring(0, 5)}</div>
                        <div className="text-[9px] text-gray-400">{slot.hora_fim.substring(0, 5)}</div>
                      </td>
                      {DIAS.map(dia => {
                        const aula = aulasPorCelula[`${dia}-${slot.id}`];
                        return (
                          <td key={dia} className="px-1.5 py-1.5 border-r border-b border-gray-100 last:border-r-0 align-top">
                            {aula ? (
                              <div className="bg-green-50 border border-green-200 rounded p-1.5">
                                <div className="font-black text-green-900 text-[10px] leading-tight">
                                  {getNome(dadosMestres?.disciplinas || [], aula.disciplina_id)}
                                </div>
                                <div className="text-[9px] text-green-700 font-bold mt-0.5 uppercase">
                                  {getNome(dadosMestres?.turmas || [], aula.turma_id, "codigo")}
                                </div>
                                <div className="text-[9px] text-gray-400 mt-0.5 truncate">
                                  {aula.espaco_id ? getNome(dadosMestres?.espacos || [], aula.espaco_id) : "—"}
                                </div>
                              </div>
                            ) : (
                              <div className="min-h-[44px]" />
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

        {/* Minhas Reservas — ocupa 1/3 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-700" />
              <h2 className="font-black text-indigo-800 text-sm uppercase tracking-wide">Próximas Reservas</h2>
            </div>
            <Link href="/reservas" className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded text-[10px] font-bold transition-colors">
              + Nova
            </Link>
          </div>
          <div className="p-3">
            {reservasProfessor.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-xs mb-3">Nenhuma reserva futura.</p>
                <Link href="/reservas" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-block">
                  Fazer Reserva
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {reservasProfessor.map((r: any) => {
                  const slot = dadosMestres?.slots?.find((s: any) => String(s.id) === String(r.slot_horario_id));
                  const [ano, mes, dia] = r.data_reserva.split("-");
                  return (
                    <div key={r.id} className="p-2.5 border border-gray-100 rounded-lg bg-gray-50 hover:border-indigo-200 transition-colors">
                      <div className="flex justify-between items-center mb-1">
                        <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {dia}/{mes}/{ano}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500">
                          {slot?.hora_inicio.substring(0, 5)}
                        </span>
                      </div>
                      <div className="font-bold text-gray-800 text-xs truncate">{r.disciplina_evento}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 truncate flex items-center gap-1">
                        <Building className="w-2.5 h-2.5 shrink-0" />
                        {getNome(dadosMestres?.espacos || [], r.espaco_id)}
                      </div>
                    </div>
                  );
                })}
                <Link href="/minhas-reservas" className="block text-center text-indigo-600 hover:text-indigo-800 text-xs font-bold mt-3">
                  Ver Todas →
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 relative">
      {carregandoGlobal && versaoSelecionada && (
        <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <div className="bg-green-900 p-4 shadow-sm rounded-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-base font-black uppercase tracking-tight text-white">
            Dashboard Institucional
          </h1>
          <p className="text-[10px] text-green-200 font-medium uppercase tracking-wider mt-1">
            {user?.nivel_acesso === "PROFESSOR_TAE" ? "Meu Painel Pessoal" : "Visão estratégica da grade de horários"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {versoes.length > 0 && (
            <select
              value={versaoSelecionada}
              onChange={(e) => setVersaoSelecionada(e.target.value)}
              className="bg-white text-green-800 border border-transparent rounded-lg p-2 text-xs font-bold outline-none cursor-pointer hover:border-green-300 transition-all shadow-sm max-w-full sm:max-w-auto"
            >
              {versoes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome} - {v.semestre} {v.status === "RASCUNHO" ? "(Rascunho)" : ""}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={user?.nivel_acesso === "PROFESSOR_TAE" ? carregarDadosProfessor : carregarDadosEDiagnosticar}
            className="bg-green-500 hover:bg-green-400 text-white px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto h-9"
          >
            <RefreshCw className="w-4 h-4" /> ATUALIZAR DADOS
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-800">Olá, {user?.nome || 'Usuário'}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Seu perfil atual de acesso é: <strong className="text-green-700">{user?.nivel_acesso.replace('_', '/')}</strong>
            {user?.nivel_acesso === "COORDENADOR" && user?.curso_id && (
              <span> | Curso: <strong className="text-blue-600">{getNome(dadosMestres?.cursos || [], user.curso_id)}</strong></span>
            )}
          </p>
        </div>
        <Link 
          href="/minhas-reservas"
          className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold transition-colors border border-green-200 text-sm shadow-sm"
        >
          <List className="w-4 h-4" />
          {isCoordenador ? "Gestão de Reservas" : "Consulta Reservas"}
        </Link>
      </div>

      {user?.nivel_acesso === "PROFESSOR_TAE" ? (
        renderProfessorView()
      ) : user?.nivel_acesso === "COORDENADOR" ? (
        renderCoordenadorView()
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <span className="text-[10px] font-black uppercase text-gray-400">Total Alocado</span>
              <div className="text-3xl font-black text-green-800">{metricas.totalAulas}</div>
            </div>
            <div className={`p-5 rounded-xl border shadow-sm ${metricas.totalConflitos > 0 ? "bg-red-50 border-red-100" : "bg-white border-gray-100"}`}>
              <span className="text-[10px] font-black uppercase text-gray-400">Choques Críticos</span>
              <div className={`text-3xl font-black ${metricas.totalConflitos > 0 ? "text-red-600" : "text-gray-800"}`}>
                {metricas.totalConflitos}
              </div>
            </div>
            <div className={`p-5 rounded-xl border shadow-sm ${metricas.semProfessor > 0 ? "bg-yellow-50 border-yellow-100" : "bg-white border-gray-100"}`}>
              <span className="text-[10px] font-black uppercase text-gray-400">Vagas (Sem Prof)</span>
              <div className="text-3xl font-black text-gray-800">{metricas.semProfessor}</div>
            </div>
            <div className={`p-5 rounded-xl border shadow-sm ${metricas.semSala > 0 ? "bg-orange-50 border-orange-100" : "bg-white border-gray-100"}`}>
              <span className="text-[10px] font-black uppercase text-gray-400">Sem Espaço</span>
              <div className="text-3xl font-black text-gray-800">{metricas.semSala}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user?.nivel_acesso !== "COMISSAO" && (
              <Link
                href="/relatorios/professores"
                className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-5 group cursor-pointer"
              >
                <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-black text-gray-800 group-hover:text-blue-700 transition-colors text-lg">Carga Horária Docente</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Acompanhamento completo de distribuição de aulas e horas.</p>
                </div>
              </Link>
            )}

            <Link
              href="/relatorios/ocupacao-salas"
              className={`bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:border-green-300 hover:shadow-md transition-all flex items-center gap-5 group cursor-pointer ${user?.nivel_acesso === "COMISSAO" ? "md:col-span-2" : ""}`}
            >
              <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors shrink-0">
                <Building className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-black text-gray-800 group-hover:text-green-700 transition-colors text-lg">Ocupação de Salas</h3>
                <p className="text-sm text-gray-500 mt-0.5">Consolidado físico de espaços e infraestrutura por categoria.</p>
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-bold text-gray-700 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600 inline" /> Impedimentos Físicos
                </h2>
                <span className="bg-red-100 text-red-700 font-black text-xs px-2 py-1 rounded-full">{choquesCriticos.length}</span>
              </div>
              <div className="h-[450px] overflow-y-auto custom-scrollbar bg-white">
                {choquesCriticos.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 font-medium h-full flex flex-col items-center justify-center">
                    <Building className="w-12 h-12 mb-4 mx-auto text-green-500 opacity-80" />
                    Nenhum choque detectado.
                  </div>
                ) : (
                  Object.keys(criticosAgrupados).sort().map((tipo, tIdx) => (
                    <div key={tIdx} className="border-b border-gray-100 last:border-0">
                      <div className="bg-red-50/50 px-4 py-2 text-xs font-black text-red-800 uppercase tracking-widest border-b border-red-100/50 sticky top-0 z-10 backdrop-blur-sm shadow-sm flex justify-between items-center">
                        <span>{tipo}</span>
                        <span className="bg-white text-red-600 px-2 py-0.5 rounded-full border border-red-200 text-[10px]">{criticosAgrupados[tipo].length}</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {criticosAgrupados[tipo].map((choque: any, idx: number) => (
                          <div key={idx} className="p-4 hover:bg-red-50/30 transition-colors">
                            <p className="font-bold text-gray-800 text-sm">{choque.msg}</p>
                            <p className="text-[11px] font-bold text-red-600 mt-1 uppercase tracking-wider">{choque.detalhe}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-bold text-gray-700 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 inline" /> Alertas de Planejamento
                </h2>
                <span className="bg-yellow-100 text-yellow-700 font-black text-xs px-2 py-1 rounded-full">{alertasSecundarios.length}</span>
              </div>
              <div className="h-[450px] overflow-y-auto custom-scrollbar bg-white">
                {alertasSecundarios.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 font-medium h-full flex flex-col items-center justify-center">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nenhum alerta pedagógico.
                  </div>
                ) : (
                  Object.keys(alertasAgrupados).sort().map((tipo, tIdx) => (
                    <div key={tIdx} className="border-b border-gray-100 last:border-0">
                      <div className="bg-yellow-50/50 px-4 py-2 text-xs font-black text-yellow-800 uppercase tracking-widest border-b border-yellow-100/50 sticky top-0 z-10 backdrop-blur-sm shadow-sm flex justify-between items-center">
                        <span>{tipo}</span>
                        <span className="bg-white text-yellow-600 px-2 py-0.5 rounded-full border border-yellow-200 text-[10px]">{alertasAgrupados[tipo].length}</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {alertasAgrupados[tipo].map((alerta: any, idx: number) => (
                          <div key={idx} className="p-4 hover:bg-yellow-50/30 transition-colors">
                            <p className="font-bold text-gray-800 text-sm">{alerta.msg}</p>
                            <p className="text-[11px] text-gray-500 font-bold mt-1 uppercase italic">{alerta.local}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
