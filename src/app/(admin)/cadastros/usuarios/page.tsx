"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "../../components/UserContext";
import { useMasterData } from "../../components/MasterDataContext";
import { UsuarioSistema } from "@/types/database";
import Link from "next/link";

export default function UsuariosPage() {
  const { user: currentUser, isAdmin } = useUser();
  const { dadosMestres } = useMasterData();
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  // Modal de Edição
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioSistema | null>(null);
  const [formEdicao, setFormEdicao] = useState({
    nome: "",
    email: "",
    nivel_acesso: "PROFESSOR_TAE" as UsuarioSistema["nivel_acesso"],
    curso_id: "" as string | null,
  });
  const [salvandoModal, setSalvandoModal] = useState(false);

  const niveis = [
    { value: "PROFESSOR_TAE", label: "Professor / TAE" },
    { value: "COORDENADOR", label: "Coordenador" },
    { value: "COMISSAO", label: "Comissão de Horários" },
    { value: "DIRECAO", label: "Direção" },
    { value: "ADMINISTRADOR", label: "Administrador" },
  ];

  const carregarUsuarios = async () => {
    if (!isAdmin) return;
    const { data, error } = await supabase
      .from("usuarios_sistema")
      .select("*")
      .order("nome");

    if (data) setUsuarios(data);
    if (error) console.error("Erro ao carregar usuarios", error);
    setCarregando(false);
  };

  useEffect(() => {
    carregarUsuarios();
  }, [isAdmin]);

  // Alteração direta na tabela (nível)
  const alterarNivel = async (id: string, novoNivel: string) => {
    setSalvandoId(id);
    try {
      const { error } = await supabase
        .from("usuarios_sistema")
        .update({ nivel_acesso: novoNivel })
        .eq("id", id);

      if (error) throw error;

      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, nivel_acesso: novoNivel as any } : u
        )
      );
    } catch (error) {
      alert("Erro ao alterar nível de acesso. Verifique se você é administrador.");
      console.error(error);
    } finally {
      setSalvandoId(null);
    }
  };

  // Alteração direta na tabela (curso)
  const alterarCurso = async (id: string, novoCursoId: string | null) => {
    setSalvandoId(id);
    try {
      const { error } = await supabase
        .from("usuarios_sistema")
        .update({ curso_id: novoCursoId })
        .eq("id", id);

      if (error) throw error;

      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, curso_id: novoCursoId } : u
        )
      );
    } catch (error) {
      alert("Erro ao vincular curso. Verifique se você é administrador.");
      console.error(error);
    } finally {
      setSalvandoId(null);
    }
  };

  // Abrir Modal de Edição
  const abrirModalEditar = (u: UsuarioSistema) => {
    setUsuarioEditando(u);
    setFormEdicao({
      nome: u.nome || "",
      email: u.email || "",
      nivel_acesso: u.nivel_acesso,
      curso_id: u.curso_id || "",
    });
    setModalEditarAberto(true);
  };

  // Salvar Edição Completa pelo Modal
  const salvarEdicaoModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;

    setSalvandoModal(true);
    try {
      const payload: Partial<UsuarioSistema> = {
        nome: formEdicao.nome.trim() || null,
        email: formEdicao.email.trim(),
        nivel_acesso: formEdicao.nivel_acesso,
        curso_id: formEdicao.nivel_acesso === "COORDENADOR" ? (formEdicao.curso_id || null) : null,
      };

      const { error } = await supabase
        .from("usuarios_sistema")
        .update(payload)
        .eq("id", usuarioEditando.id);

      if (error) throw error;

      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === usuarioEditando.id ? { ...u, ...payload } : u
        )
      );
      setModalEditarAberto(false);
      setUsuarioEditando(null);
    } catch (error: any) {
      alert("Erro ao salvar alterações: " + (error?.message || "Tente novamente."));
      console.error(error);
    } finally {
      setSalvandoModal(false);
    }
  };

  // Excluir Usuário
  const excluirUsuario = async (u: UsuarioSistema) => {
    if (currentUser?.id === u.id) {
      alert("Você não pode excluir a sua própria conta de usuário logada.");
      return;
    }

    const confirmou = confirm(
      `Tem certeza de que deseja excluir o usuário "${u.nome || u.email}"?\n\nEle perderá o acesso e suas preferências cadastradas no sistema.`
    );
    if (!confirmou) return;

    setSalvandoId(u.id);
    try {
      const { error } = await supabase
        .from("usuarios_sistema")
        .delete()
        .eq("id", u.id);

      if (error) {
        throw error;
      }

      setUsuarios((prev) => prev.filter((item) => item.id !== u.id));
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      alert(
        "Erro ao excluir usuário: " +
          (error.message ||
            "Certifique-se de que a política de DELETE no Supabase está ativa e você tem permissão.")
      );
    } finally {
      setSalvandoId(null);
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    const nome = (u.nome || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const nivel = (u.nivel_acesso || "").toLowerCase();
    return nome.includes(termo) || email.includes(termo) || nivel.includes(termo);
  });

  if (!isAdmin) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-red-100 max-w-md">
          <span className="text-5xl opacity-50 mb-4 block">⛔</span>
          <h2 className="text-xl font-black text-gray-800 mb-2">Acesso Negado</h2>
          <p className="text-gray-500 font-medium text-sm">
            Esta página é restrita a administradores do sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-green-900 p-4 shadow-sm rounded-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-base font-black uppercase tracking-tight flex items-center gap-3">
            Gestão de Usuários
          </h1>
          <p className="text-[10px] text-green-200 font-medium uppercase tracking-wider mt-1">
            Controle de Perfis, Edição e Acesso (RBAC)
          </p>
        </div>
        <Link
          href="/painel"
          className="bg-green-800 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase transition-colors border border-green-700/50 flex items-center gap-2"
        >
          <span>⬅</span> Voltar ao Painel
        </Link>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <p className="text-sm text-gray-500 font-medium max-w-xl">
            Abaixo estão listados todos os usuários registrados no sistema. Como administrador, você pode editar informações, vincular cursos ou excluir acessos.
          </p>
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all"
            />
          </div>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 uppercase text-[10px] font-black text-gray-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Nível de Acesso</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {usuariosFiltrados.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isSalvando = salvandoId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{u.nome || "Não informado"}</span>
                          {isCurrent && (
                            <span className="text-[9px] bg-green-100 text-green-700 font-black px-1.5 py-0.5 rounded tracking-wide">
                              VOCÊ
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <select
                            disabled={isSalvando}
                            value={u.nivel_acesso}
                            onChange={(e) => alterarNivel(u.id, e.target.value)}
                            className={`bg-white border rounded p-1.5 text-xs font-bold w-full max-w-[200px] outline-none transition-colors ${
                              isSalvando
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:border-green-400 focus:border-green-600 border-gray-200"
                            }`}
                          >
                            {niveis.map((n) => (
                              <option key={n.value} value={n.value}>
                                {n.label}
                              </option>
                            ))}
                          </select>
                          {u.nivel_acesso === "COORDENADOR" && (
                            <select
                              disabled={isSalvando}
                              value={u.curso_id || ""}
                              onChange={(e) => alterarCurso(u.id, e.target.value || null)}
                              className={`bg-blue-50 border rounded p-1.5 text-xs font-bold w-full max-w-[200px] outline-none transition-colors text-blue-800 ${
                                isSalvando
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:border-blue-400 focus:border-blue-600 border-blue-200"
                              }`}
                            >
                              <option value="">Vincular Curso...</option>
                              {dadosMestres?.cursos?.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nome}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isSalvando ? (
                          <span className="inline-block w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => abrirModalEditar(u)}
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                            title="Editar detalhes do usuário"
                          >
                            <span>✏️</span>
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => excluirUsuario(u)}
                            disabled={isCurrent || isSalvando}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 ${
                              isCurrent
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                            }`}
                            title={
                              isCurrent
                                ? "Você não pode excluir sua própria conta"
                                : "Excluir usuário do sistema"
                            }
                          >
                            <span>🗑️</span>
                            <span>Excluir</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400 font-medium">
                      {busca ? "Nenhum usuário encontrado com os filtros atuais." : "Nenhum usuário cadastrado."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Edição de Usuário */}
      {modalEditarAberto && usuarioEditando && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-black text-gray-800 text-base">Editar Usuário</h3>
                <p className="text-xs text-gray-500 font-medium">Atualize os dados e o perfil de acesso</p>
              </div>
              <button
                onClick={() => setModalEditarAberto(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={salvarEdicaoModal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={formEdicao.nome}
                  onChange={(e) => setFormEdicao({ ...formEdicao, nome: e.target.value })}
                  placeholder="Nome do usuário"
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  E-mail institucional
                </label>
                <input
                  type="email"
                  required
                  value={formEdicao.email}
                  onChange={(e) => setFormEdicao({ ...formEdicao, email: e.target.value })}
                  placeholder="exemplo@ifnmg.edu.br"
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nível de Acesso (RBAC)
                </label>
                <select
                  value={formEdicao.nivel_acesso}
                  onChange={(e) =>
                    setFormEdicao({
                      ...formEdicao,
                      nivel_acesso: e.target.value as UsuarioSistema["nivel_acesso"],
                    })
                  }
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all font-bold"
                >
                  {niveis.map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>

              {formEdicao.nivel_acesso === "COORDENADOR" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Curso Coordenado
                  </label>
                  <select
                    value={formEdicao.curso_id || ""}
                    onChange={(e) => setFormEdicao({ ...formEdicao, curso_id: e.target.value || null })}
                    className="w-full text-xs px-3 py-2 border border-blue-200 bg-blue-50/50 rounded-lg outline-none focus:border-blue-600 text-blue-900 font-bold"
                  >
                    <option value="">Selecione um curso...</option>
                    {dadosMestres?.cursos?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalEditarAberto(false)}
                  disabled={salvandoModal}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoModal}
                  className="px-5 py-2 text-xs font-bold text-white bg-green-700 hover:bg-green-800 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  {salvandoModal && (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  )}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
