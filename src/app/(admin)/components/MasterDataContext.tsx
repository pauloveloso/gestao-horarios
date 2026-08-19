"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type MasterData = {
  turmas: any[];
  cursos: any[];
  professores: any[];
  disciplinas: any[];
  espacos: any[];
  slots: any[];
  categorias: any[];
};

type MasterDataContextType = {
  dadosMestres: MasterData | null;
  carregando: boolean;
  erro: string | null;
  recarregarDados: () => Promise<void>;
};

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export function MasterDataProvider({ children }: { children: ReactNode }) {
  const [dadosMestres, setDadosMestres] = useState<MasterData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    try {
      // Chama a função RPC unificada para baixar todos os dicionários numa tacada só
      const { data, error } = await supabase.rpc("get_dados_mestres");
      
      if (error) {
        throw error;
      }

      if (data) {
        setDadosMestres({
          turmas: data.turmas || [],
          cursos: data.cursos || [],
          professores: data.professores || [],
          disciplinas: data.disciplinas || [],
          espacos: data.espacos || [],
          slots: data.slots || [],
          categorias: data.categorias || [],
        });
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados mestres:", err);
      // Se falhar o RPC (por ex. a função ainda não foi criada), vamos tentar
      // carregar da forma tradicional como fallback temporário? Não, precisamos
      // garantir que a RPC exista.
      setErro(err.message || "Falha ao carregar dados mestres do banco.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    let montado = true;
    
    if (montado) {
      carregarDados();
    }

    // Movemos o canal de Professores para cá, assim todo o sistema fica atualizado
    // quando um professor for editado
    const canalProfessores = supabase
      .channel("mestre_professores")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "professores" },
        () => {
          console.log("Detectada mudança em professores, atualizando contexto...");
          supabase
            .from("professores")
            .select("*")
            .order("nome")
            .then(({ data }) => {
              if (data && montado) {
                setDadosMestres((prev) => prev ? { ...prev, professores: data } : null);
              }
            });
        }
      )
      .subscribe();

    return () => {
      montado = false;
      supabase.removeChannel(canalProfessores);
    };
  }, []);

  return (
    <MasterDataContext.Provider value={{ dadosMestres, carregando, erro, recarregarDados: carregarDados }}>
      {children}
    </MasterDataContext.Provider>
  );
}

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error("useMasterData deve ser usado dentro de um MasterDataProvider");
  }
  return context;
}
