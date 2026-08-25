"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "../../components/UserContext";
import { UsuarioSistema } from "@/types/database";
import Link from "next/link";

export default function UsuariosPage() {
  const { isAdmin } = useUser();
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const niveis = [
    { value: "PROFESSOR_TAE", label: "Professor / TAE" },
    { value: "COORDENADOR", label: "Coordenador" },
    { value: "COMISSAO", label: "Comissão de Horários" },
    { value: "DIRECAO", label: "Direção" },
    { value: "ADMINISTRADOR", label: "Administrador" },
  ];

  useEffect(() => {
    async function carregarUsuarios() {
      if (!isAdmin) return;
      const { data, error } = await supabase
        .from("usuarios_sistema")
        .select("*")
        .order("nome");

      if (data) setUsuarios(data);
      if (error) console.error("Erro ao carregar usuarios", error);
      setCarregando(false);
    }
    carregarUsuarios();
  }, [isAdmin]);

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
      <div className="bg-green-900 p-4 shadow-sm rounded-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-base font-black uppercase tracking-tight flex items-center gap-3">
            Gestão de Usuários
          </h1>
          <p className="text-[10px] text-green-200 font-medium uppercase tracking-wider mt-1">
            Controle de Perfis e Acesso (RBAC)
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
        <p className="text-sm text-gray-500 mb-6 font-medium">
          Abaixo estão listados todos os usuários que já fizeram login no sistema através do Google Workspace (<i>@ifnmg.edu.br</i>). Como administrador, você pode alterar o nível de acesso de qualquer usuário.
        </p>

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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800">{u.nome || "Não informado"}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        disabled={salvandoId === u.id}
                        value={u.nivel_acesso}
                        onChange={(e) => alterarNivel(u.id, e.target.value)}
                        className={`bg-white border rounded p-1.5 text-xs font-bold w-full max-w-[200px] outline-none transition-colors ${salvandoId === u.id ? 'opacity-50 cursor-not-allowed' : 'hover:border-green-400 focus:border-green-600 border-gray-200'}`}
                      >
                        {niveis.map((n) => (
                          <option key={n.value} value={n.value}>
                            {n.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {salvandoId === u.id ? (
                        <span className="inline-block w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400 font-medium">
                      Nenhum usuário cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
