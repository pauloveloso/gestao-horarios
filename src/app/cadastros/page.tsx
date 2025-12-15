"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// 1. Definições de Tipos
type Tabela = "professores" | "disciplinas" | "salas" | "turmas";

// Esta interface resolve o erro: dizemos que labelExtra é opcional (?)
interface ConfigAba {
  titulo: string;
  label: string;
  temExtra: boolean;
  labelExtra?: string;
}

export default function CadastrosPage() {
  const [abaAtiva, setAbaAtiva] = useState<Tabela>("professores");
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados do Formulário
  const [nome, setNome] = useState("");
  const [extra, setExtra] = useState(""); // Serve para 'tipo' (sala) ou 'curso' (turma)

  // Carregar dados ao mudar de aba
  useEffect(() => {
    carregarLista();
    setNome("");
    setExtra("");
  }, [abaAtiva]);

  async function carregarLista() {
    setLoading(true);
    const { data } = await supabase
      .from(abaAtiva)
      .select("*")
      .order(abaAtiva === "turmas" ? "codigo" : "nome");
    if (data) setLista(data);
    setLoading(false);
  }

  // Salvar novo item
  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome) return;

    const payload: any = {};

    // Monta o objeto dependendo da tabela
    if (abaAtiva === "turmas") {
      payload.codigo = nome;
      if (extra) payload.curso = extra;
    } else {
      payload.nome = nome;
      if (abaAtiva === "salas" && extra) payload.tipo = extra;
    }

    const { error } = await supabase.from(abaAtiva).insert(payload);

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      setNome("");
      setExtra("");
      carregarLista();
    }
  }

  // Deletar item
  async function handleDeletar(id: string) {
    if (
      !confirm("Tem certeza? Se este item estiver em uso na grade, dará erro.")
    )
      return;

    const { error } = await supabase.from(abaAtiva).delete().eq("id", id);

    if (error) {
      alert(
        "Não foi possível excluir. Verifique se este item já tem aulas cadastradas."
      );
    } else {
      carregarLista();
    }
  }

  // 2. Objeto de Configuração com Tipagem Explícita
  const config: Record<Tabela, ConfigAba> = {
    professores: {
      titulo: "Professores",
      label: "Nome do Professor",
      temExtra: false,
    },
    disciplinas: {
      titulo: "Disciplinas",
      label: "Nome da Disciplina",
      temExtra: false,
    },
    salas: {
      titulo: "Salas",
      label: "Nome/Número da Sala",
      temExtra: true,
      labelExtra: "Tipo (Lab, Sala...)",
    },
    turmas: {
      titulo: "Turmas",
      label: "Código (Ex: 1AGROA)",
      temExtra: true,
      labelExtra: "Nome do Curso",
    },
  };

  const atual = config[abaAtiva];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-blue-900">⚙️ Administração</h1>
          <Link
            href="/"
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
          >
            ← Voltar para Grade
          </Link>
        </div>

        {/* ABAS DE NAVEGAÇÃO */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-300 pb-1">
          {(Object.keys(config) as Tabela[]).map((chave) => (
            <button
              key={chave}
              onClick={() => setAbaAtiva(chave)}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                abaAtiva === chave
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {config[chave].titulo}
            </button>
          ))}
        </div>

        {/* FORMULÁRIO DE CADASTRO */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h2 className="text-lg font-bold text-gray-700 mb-4">
            Novo Cadastro em {atual.titulo}
          </h2>
          <form
            onSubmit={handleSalvar}
            className="flex flex-col md:flex-row gap-4 items-end"
          >
            <div className="flex-1 w-full">
              <label className="block text-sm text-gray-600 mb-1">
                {atual.label}
              </label>
              <input
                type="text"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite aqui..."
                required
              />
            </div>

            {/* Renderização Condicional do Campo Extra */}
            {atual.temExtra && (
              <div className="w-full md:w-1/3">
                <label className="block text-sm text-gray-600 mb-1">
                  {atual.labelExtra}
                </label>
                <input
                  type="text"
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold w-full md:w-auto"
            >
              Salvar
            </button>
          </form>
        </div>

        {/* LISTAGEM */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-semibold">
              <tr>
                <th className="p-4">{atual.label}</th>
                {atual.temExtra && <th className="p-4">{atual.labelExtra}</th>}
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : lista.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-gray-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                lista.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 group">
                    <td className="p-4 text-gray-800 font-medium">
                      {item.nome || item.codigo}
                    </td>
                    {atual.temExtra && (
                      <td className="p-4 text-gray-600">
                        {item.tipo || item.curso || "-"}
                      </td>
                    )}
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeletar(item.id)}
                        className="text-red-400 hover:text-red-600 font-bold px-2 py-1 rounded hover:bg-red-50"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
