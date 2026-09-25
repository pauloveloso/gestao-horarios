"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "../components/UserContext";
import { Calendar, Trash2, Search, ArrowLeft, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useMasterData } from "../components/MasterDataContext";

export default function MinhasReservasPage() {
  const { user, isCoordenador } = useUser();
  const { dadosMestres, carregando: carregandoMestre } = useMasterData();
  const [reservas, setReservas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState("");
  const [reservaEmEdicao, setReservaEmEdicao] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [excluindoLote, setExcluindoLote] = useState(false);
  const [formReserva, setFormReserva] = useState({
    nome_solicitante: "",
    turma_curso: "",
    disciplina_evento: "",
  });

  const carregarReservas = async () => {
    setCarregando(true);
    try {
      let query = supabase
        .from("reservas_espacos")
        .select("*")
        .order("data_reserva", { ascending: false });

      if (!isCoordenador) {
        query = query.eq("criado_por", user?.id);
      }

      const { data } = await query;
      setReservas(data || []);
    } catch (error) {
      console.error("Erro ao carregar reservas:", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      carregarReservas();
    }
  }, [user?.id, isCoordenador]);

  const iniciarEdicao = (r: any) => {
    setReservaEmEdicao(r);
    setFormReserva({
      nome_solicitante: r.nome_solicitante || "",
      turma_curso: r.turma_curso || "",
      disciplina_evento: r.disciplina_evento || "",
    });
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservaEmEdicao) return;
    setSalvando(true);
    try {
      const payload = {
        nome_solicitante: formReserva.nome_solicitante,
        turma_curso: formReserva.turma_curso,
        disciplina_evento: formReserva.disciplina_evento,
      };

      await supabase
        .from("reservas_espacos")
        .update(payload)
        .eq("id", reservaEmEdicao.id);

      setReservas(
        reservas.map((r) =>
          r.id === reservaEmEdicao.id ? { ...r, ...payload } : r
        )
      );
      setReservaEmEdicao(null);
    } catch (error) {
      alert("Erro ao salvar alterações.");
    } finally {
      setSalvando(false);
    }
  };

  const excluirReserva = async (id: string, criadoPor: string) => {
    if (!isCoordenador && criadoPor !== user?.id) {
      alert("Você só tem permissão para excluir suas próprias reservas.");
      return;
    }
    
    if (!window.confirm("Tem certeza que deseja excluir esta reserva?")) return;

    try {
      await supabase.from("reservas_espacos").delete().eq("id", id);
      setReservas(reservas.filter((r) => r.id !== id));
    } catch (error) {
      alert("Erro ao excluir reserva.");
    }
  };

  const formatarHorario = (slotId: string) => {
    if (!dadosMestres?.slots) return "Desconhecido";
    const slot = dadosMestres.slots.find((s: any) => String(s.id) === String(slotId));
    if (!slot) return "Desconhecido";
    return `${slot.hora_inicio.substring(0, 5)} às ${slot.hora_fim.substring(0, 5)}`;
  };

  const nomeEspaco = (espacoId: string) => {
    if (!dadosMestres?.espacos) return "Espaço Desconhecido";
    const espaco = dadosMestres.espacos.find((e: any) => String(e.id) === String(espacoId));
    return espaco ? espaco.nome : "Espaço Desconhecido";
  };

  const formatarData = (dataStr: string) => {
    const [ano, mes, dia] = dataStr.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const reservasFiltradas = reservas
    .filter(
      (r) =>
        r.disciplina_evento?.toLowerCase().includes(termoBusca.toLowerCase()) ||
        r.nome_solicitante?.toLowerCase().includes(termoBusca.toLowerCase()) ||
        nomeEspaco(r.espaco_id).toLowerCase().includes(termoBusca.toLowerCase())
    )
    .sort((a, b) => {
      const localA = nomeEspaco(a.espaco_id);
      const localB = nomeEspaco(b.espaco_id);
      if (localA < localB) return -1;
      if (localA > localB) return 1;

      if (a.data_reserva < b.data_reserva) return -1;
      if (a.data_reserva > b.data_reserva) return 1;

      const slotA = dadosMestres?.slots?.find((s: any) => String(s.id) === String(a.slot_horario_id));
      const slotB = dadosMestres?.slots?.find((s: any) => String(s.id) === String(b.slot_horario_id));
      
      const horaA = slotA?.hora_inicio || "00:00:00";
      const horaB = slotB?.hora_inicio || "00:00:00";
      
      if (horaA < horaB) return -1;
      if (horaA > horaB) return 1;
      
      return 0;
    });

  const idsPermitidos = reservasFiltradas
    .filter(r => isCoordenador || r.criado_por === user?.id)
    .map(r => r.id);

  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (selecionados.length === idsPermitidos.length && idsPermitidos.length > 0) {
      setSelecionados([]);
    } else {
      setSelecionados(idsPermitidos);
    }
  };

  const excluirEmLote = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir as ${selecionados.length} reservas selecionadas?`)) return;
    
    setExcluindoLote(true);
    try {
      await supabase.from("reservas_espacos").delete().in("id", selecionados);
      setReservas(reservas.filter((r) => !selecionados.includes(r.id)));
      setSelecionados([]);
    } catch (error) {
      alert("Erro ao excluir reservas em lote.");
    } finally {
      setExcluindoLote(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10 flex flex-col h-screen overflow-hidden">
      {reservaEmEdicao && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 bg-indigo-800 text-white flex justify-between items-center">
              <h3 className="font-black text-lg">Editar Reserva</h3>
              <button
                onClick={() => setReservaEmEdicao(null)}
                className="text-white/70 hover:text-white font-bold text-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={salvarEdicao} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                  Nome do Solicitante *
                </label>
                <input
                  required
                  type="text"
                  value={formReserva.nome_solicitante}
                  onChange={(e) =>
                    setFormReserva({ ...formReserva, nome_solicitante: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:border-indigo-600 outline-none text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                    Turma / Curso *
                  </label>
                  <input
                    required
                    type="text"
                    value={formReserva.turma_curso}
                    onChange={(e) =>
                      setFormReserva({ ...formReserva, turma_curso: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:border-indigo-600 outline-none text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                    Evento / Disciplina *
                  </label>
                  <input
                    required
                    type="text"
                    value={formReserva.disciplina_evento}
                    onChange={(e) =>
                      setFormReserva({ ...formReserva, disciplina_evento: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:border-indigo-600 outline-none text-gray-900"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setReservaEmEdicao(null)}
                  className="w-1/3 py-2.5 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="w-2/3 py-2.5 rounded-lg font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* BARRA DE TÍTULOS SUPERIOR - PADRÃO OCUPAÇÃO DE SALAS */}
      <div className="bg-green-900 p-4 shadow-sm rounded-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 mx-3 md:mx-auto max-w-7xl w-full mt-2">
        <div>
          <h1 className="text-base font-black uppercase tracking-tight text-white">
            {isCoordenador ? "Gestão de Todas as Reservas" : "Consulta Reservas"}
          </h1>
          <p className="text-[10px] text-green-200 font-medium uppercase tracking-wider mt-1">
            Histórico e Gerenciamento de Agendamentos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/painel"
            className="bg-green-800 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase transition-colors border border-green-700/50 flex items-center gap-2"
          >
            <span>⬅</span> Voltar ao Painel
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto mt-6 p-4 w-full flex-1 flex flex-col min-h-0">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <h2 className="font-black text-gray-800 text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                Lista de Reservas
              </h2>
              {selecionados.length > 0 && (
                <button
                  onClick={excluirEmLote}
                  disabled={excluindoLote}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{excluindoLote ? "Excluindo..." : `Excluir (${selecionados.length})`}</span>
                </button>
              )}
            </div>
            
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Buscar por evento, espaço ou pessoa..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-white p-0">
            {carregando || carregandoMestre ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : reservasFiltradas.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-bold text-lg">Nenhuma reserva encontrada</p>
                <p className="text-sm">
                  {termoBusca
                    ? "Tente limpar a busca para ver todas."
                    : "Você ainda não possui reservas cadastradas."}
                </p>
                <Link
                  href="/reservas"
                  className="mt-6 inline-block bg-green-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-green-700 transition-colors"
                >
                  Fazer Nova Reserva
                </Link>
              </div>
            ) : (
              <div className="min-w-full inline-block align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider w-10">
                        <input
                          type="checkbox"
                          checked={selecionados.length === idsPermitidos.length && idsPermitidos.length > 0}
                          onChange={toggleTodos}
                          disabled={idsPermitidos.length === 0}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                        Data e Horário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                        Local
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                        Evento / Disciplina
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                        Solicitante
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {reservasFiltradas.map((r) => (
                      <tr key={r.id} className={`hover:bg-green-50/30 transition-colors ${selecionados.includes(r.id) ? 'bg-green-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selecionados.includes(r.id)}
                            onChange={() => toggleSelecionado(r.id)}
                            disabled={!isCoordenador && r.criado_por !== user?.id}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">
                            {formatarData(r.data_reserva)}
                          </div>
                          <div className="text-xs font-medium text-gray-500 mt-0.5">
                            {formatarHorario(r.slot_horario_id)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="bg-blue-50 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-100">
                            {nomeEspaco(r.espaco_id)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-800">
                            {r.disciplina_evento}
                          </div>
                          {r.turma_curso && (
                            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">
                              {r.turma_curso}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {r.nome_solicitante}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {(isCoordenador || r.criado_por === user?.id) && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => iniciarEdicao(r)}
                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1 font-bold"
                              >
                                <Pencil className="w-4 h-4" /> Editar
                              </button>
                              <button
                                onClick={() => excluirReserva(r.id, r.criado_por)}
                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1 font-bold"
                              >
                                <Trash2 className="w-4 h-4" /> Excluir
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
