"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tabela = "professores" | "disciplinas" | "salas" | "turmas";

interface ConfigAba {
  titulo: string;
  label: string;
  temExtra: boolean;
  labelExtra?: string;
}

export default function CadastrosPage() {
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState<Tabela>("professores");
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ESTADOS DO FORMULÁRIO
  const [nome, setNome] = useState("");
  const [extra, setExtra] = useState("");

  // ESTADO DE EDIÇÃO (Se tiver algo aqui, estamos editando)
  const [itemEditando, setItemEditando] = useState<any | null>(null);

  useEffect(() => {
    const adminToken = localStorage.getItem("usuario_admin");
    if (adminToken !== "true") {
      router.push("/login");
    }
  }, []);

  // Quando troca de aba, limpa tudo
  useEffect(() => {
    carregarLista();
    cancelarEdicao();
  }, [abaAtiva]);

  function cancelarEdicao() {
    setItemEditando(null);
    setNome("");
    setExtra("");
  }

  async function carregarLista() {
    setLoading(true);
    const campoOrdem = abaAtiva === "turmas" ? "codigo" : "nome";
    const { data } = await supabase
      .from(abaAtiva)
      .select("*")
      .order(campoOrdem);
    if (data) setLista(data);
    setLoading(false);
  }

  function handlePreencherEdicao(item: any) {
    setItemEditando(item);
    // Preenche os campos baseados no tipo de tabela
    if (abaAtiva === "turmas") {
      setNome(item.codigo);
      setExtra(item.curso || "");
    } else {
      setNome(item.nome);
      if (abaAtiva === "salas") setExtra(item.tipo || "");
    }

    // Leva a tela para o topo para ver o formulário
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome) return;

    // Monta o objeto de dados
    const payload: any = {};
    if (abaAtiva === "turmas") {
      payload.codigo = nome;
      if (extra) payload.curso = extra;
    } else {
      payload.nome = nome;
      if (abaAtiva === "salas" && extra) payload.tipo = extra;
    }

    let error;

    if (itemEditando) {
      // === MODO ATUALIZAR ===
      const response = await supabase
        .from(abaAtiva)
        .update(payload)
        .eq("id", itemEditando.id);
      error = response.error;
    } else {
      // === MODO CRIAR ===
      const response = await supabase.from(abaAtiva).insert(payload);
      error = response.error;
    }

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      cancelarEdicao(); // Limpa o form e sai do modo edição
      carregarLista(); // Recarrega a tabela
    }
  }

  async function handleDeletar(id: string) {
    if (
      !confirm("Tem certeza? Se este item estiver em uso na grade, dará erro.")
    )
      return;
    const { error } = await supabase.from(abaAtiva).delete().eq("id", id);
    if (error) {
      alert(
        "Não foi possível excluir. Verifique se este item já tem aulas vinculadas na grade."
      );
    } else {
      // Se deletou o item que estava sendo editado, limpa o form
      if (itemEditando && itemEditando.id === id) {
        cancelarEdicao();
      }
      carregarLista();
    }
  }

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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-blue-900">⚙️ Administração</h1>
          <Link
            href="/"
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
          >
            ← Voltar para Grade
          </Link>
        </div>

        {/* ABAS */}
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

        {/* FORMULÁRIO */}
        <div
          className={`p-6 rounded-lg shadow-sm border mb-8 transition-colors ${
            itemEditando
              ? "bg-orange-50 border-orange-200"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2
              className={`text-lg font-bold ${
                itemEditando ? "text-orange-700" : "text-gray-700"
              }`}
            >
              {itemEditando
                ? `✏️ Editando: ${itemEditando.nome || itemEditando.codigo}`
                : `Novo Cadastro em ${atual.titulo}`}
            </h2>
            {itemEditando && (
              <button
                onClick={cancelarEdicao}
                className="text-sm text-gray-500 hover:underline"
              >
                Cancelar Edição
              </button>
            )}
          </div>

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
              className={`text-white px-6 py-2 rounded font-bold w-full md:w-auto transition-colors ${
                itemEditando
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {itemEditando ? "Atualizar" : "Salvar"}
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
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 group ${
                      itemEditando?.id === item.id ? "bg-orange-50" : ""
                    }`}
                  >
                    <td className="p-4 text-gray-800 font-medium">
                      {item.nome || item.codigo}
                    </td>
                    {atual.temExtra && (
                      <td className="p-4 text-gray-600">
                        {item.tipo || item.curso || "-"}
                      </td>
                    )}
                    <td className="p-4 text-right">
                      {/* BOTÃO EDITAR */}
                      <button
                        onClick={() => handlePreencherEdicao(item)}
                        className="text-orange-400 hover:text-orange-600 font-bold px-2 py-1 rounded hover:bg-orange-50 mr-2"
                        title="Editar"
                      >
                        ✏️
                      </button>

                      {/* BOTÃO EXCLUIR */}
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
