"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UsuarioSistema } from "@/types/database";

export interface CursoSimples {
  id: string | number;
  nome: string;
}

interface UserContextData {
  user: UsuarioSistema | null;
  loading: boolean;
  isAdmin: boolean;
  isDirecao: boolean;
  isComissao: boolean;
  isCoordenador: boolean;
  isProfessorTAE: boolean;
  hasAccessAtLeast: (level: UsuarioSistema["nivel_acesso"]) => boolean;
  isRealAdmin: boolean;
  visualizarComoProfessor: boolean;
  toggleVisualizacaoProfessor: () => void;
  visaoSimulada: UsuarioSistema["nivel_acesso"];
  cursoSimuladoId: string | null;
  cursosDisponiveis: CursoSimples[];
  mudarVisaoSimulada: (nivel: UsuarioSistema["nivel_acesso"]) => void;
  mudarCursoSimulado: (cursoId: string | null) => void;
}

const UserContext = createContext<UserContextData>({
  user: null,
  loading: true,
  isAdmin: false,
  isDirecao: false,
  isComissao: false,
  isCoordenador: false,
  isProfessorTAE: false,
  hasAccessAtLeast: () => false,
  isRealAdmin: false,
  visualizarComoProfessor: false,
  toggleVisualizacaoProfessor: () => {},
  visaoSimulada: "ADMINISTRADOR",
  cursoSimuladoId: null,
  cursosDisponiveis: [],
  mudarVisaoSimulada: () => {},
  mudarCursoSimulado: () => {},
});

// Helper for hierarchy
const accessLevels = {
  PROFESSOR_TAE: 1,
  COORDENADOR: 2,
  COMISSAO: 3,
  DIRECAO: 4,
  ADMINISTRADOR: 5,
};

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UsuarioSistema | null>(null);
  const [loading, setLoading] = useState(true);

  // Remove o nick do email que o Google Workspace pode colar ao final do full_name
  // Ex: "Paulo Veloso Santos Junior paulo.junior" => "Paulo Veloso Santos Junior"
  const limparNome = (nome: string | undefined): string => {
    if (!nome) return "Usuário";
    // Remove qualquer sufixo no padrão "palavra.palavra" no final da string
    return nome.replace(/\s+[a-z0-9]+\.[a-z0-9]+\s*$/i, "").trim();
  };

  useEffect(() => {
    let mounted = true;

    const carregarPerfil = async (session: any) => {
      if (!session?.user) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        // Fetch user profile from usuarios_sistema
        const { data: profile, error } = await supabase
          .from("usuarios_sistema")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Erro ao buscar perfil:", error);
        }

        if (mounted) {
          if (profile) {
            setUser(profile as UsuarioSistema);
          } else {
            // Fallback se a trigger atrasar ou houver erro leve
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              nome: limparNome(session.user.user_metadata?.full_name),
              nivel_acesso: "PROFESSOR_TAE", // default
              criado_em: new Date().toISOString()
            });
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Erro inesperado em carregarPerfil:", err);
        if (mounted) {
          // Fallback para evitar travamento da tela de loading
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            nome: limparNome(session.user.user_metadata?.full_name),
            nivel_acesso: "PROFESSOR_TAE", // default
            criado_em: new Date().toISOString()
          });
          setLoading(false);
        }
      }
    };

    // 1. Escuta mudanças de auth (e o evento INITIAL_SESSION)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Retirado o bloqueio de INITIAL_SESSION. O Supabase enviará INITIAL_SESSION
      // logo após ler o localStorage, garantindo que pegamos o estado correto.
      if (session) {
        carregarPerfil(session);
      } else {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isRealAdmin = !!user && user.nivel_acesso === "ADMINISTRADOR";

  const [visaoSimulada, setVisaoSimulada] = useState<UsuarioSistema["nivel_acesso"]>("ADMINISTRADOR");
  const [cursoSimuladoId, setCursoSimuladoId] = useState<string | null>(null);
  const [cursosDisponiveis, setCursosDisponiveis] = useState<CursoSimples[]>([]);

  // Carrega cursos se o usuário for administrador real
  useEffect(() => {
    if (!isRealAdmin) return;
    const buscarCursos = async () => {
      try {
        const { data, error } = await supabase
          .from("cursos")
          .select("id, nome")
          .order("nome");
        if (!error && data) {
          setCursosDisponiveis(data as CursoSimples[]);
        }
      } catch (e) {
        console.error("Erro ao buscar cursos para simulação:", e);
      }
    };
    buscarCursos();
  }, [isRealAdmin]);

  // Recupera configurações salvas do localStorage
  useEffect(() => {
    try {
      const visaoSalva = localStorage.getItem("sgh_visao_simulada") as UsuarioSistema["nivel_acesso"] | null;
      if (visaoSalva && ["ADMINISTRADOR", "DIRECAO", "COMISSAO", "COORDENADOR", "PROFESSOR_TAE"].includes(visaoSalva)) {
        setVisaoSimulada(visaoSalva);
      } else {
        const salvoProf = localStorage.getItem("sgh_visualizar_como_professor");
        if (salvoProf === "true") {
          setVisaoSimulada("PROFESSOR_TAE");
        }
      }

      const cursoSalvo = localStorage.getItem("sgh_curso_simulado_id");
      if (cursoSalvo) {
        setCursoSimuladoId(cursoSalvo);
      }
    } catch (e) {
      // Ignora erro de acesso ao localStorage
    }
  }, []);

  const mudarVisaoSimulada = (novoNivel: UsuarioSistema["nivel_acesso"]) => {
    setVisaoSimulada(novoNivel);
    try {
      localStorage.setItem("sgh_visao_simulada", novoNivel);
      if (novoNivel === "PROFESSOR_TAE") {
        localStorage.setItem("sgh_visualizar_como_professor", "true");
      } else {
        localStorage.removeItem("sgh_visualizar_como_professor");
      }
    } catch (e) {}
  };

  const mudarCursoSimulado = (cursoId: string | null) => {
    setCursoSimuladoId(cursoId);
    try {
      if (cursoId) {
        localStorage.setItem("sgh_curso_simulado_id", cursoId);
      } else {
        localStorage.removeItem("sgh_curso_simulado_id");
      }
    } catch (e) {}
  };

  // Se mudar para coordenador e não tiver curso selecionado, seleciona o primeiro disponível
  useEffect(() => {
    if (visaoSimulada === "COORDENADOR" && !cursoSimuladoId && cursosDisponiveis.length > 0) {
      mudarCursoSimulado(String(cursosDisponiveis[0].id));
    }
  }, [visaoSimulada, cursoSimuladoId, cursosDisponiveis]);

  const toggleVisualizacaoProfessor = () => {
    if (visaoSimulada === "PROFESSOR_TAE") {
      mudarVisaoSimulada("ADMINISTRADOR");
    } else {
      mudarVisaoSimulada("PROFESSOR_TAE");
    }
  };

  const visualizarComoProfessor = visaoSimulada === "PROFESSOR_TAE";

  const userEfetivo = React.useMemo(() => {
    if (!user) return null;
    if (isRealAdmin && visaoSimulada !== "ADMINISTRADOR") {
      return {
        ...user,
        nivel_acesso: visaoSimulada,
        curso_id: visaoSimulada === "COORDENADOR" ? (cursoSimuladoId || user.curso_id) : user.curso_id,
      };
    }
    return user;
  }, [user, isRealAdmin, visaoSimulada, cursoSimuladoId]);

  const hasAccessAtLeast = (level: UsuarioSistema["nivel_acesso"]) => {
    if (!userEfetivo) return false;
    return accessLevels[userEfetivo.nivel_acesso] >= accessLevels[level];
  };

  const isAdmin = hasAccessAtLeast("ADMINISTRADOR");
  const isDirecao = hasAccessAtLeast("DIRECAO");
  const isComissao = hasAccessAtLeast("COMISSAO");
  const isCoordenador = hasAccessAtLeast("COORDENADOR");
  const isProfessorTAE = hasAccessAtLeast("PROFESSOR_TAE");

  return (
    <UserContext.Provider
      value={{
        user: userEfetivo,
        loading,
        isAdmin,
        isDirecao,
        isComissao,
        isCoordenador,
        isProfessorTAE,
        hasAccessAtLeast,
        isRealAdmin,
        visualizarComoProfessor,
        toggleVisualizacaoProfessor,
        visaoSimulada,
        cursoSimuladoId,
        cursosDisponiveis,
        mudarVisaoSimulada,
        mudarCursoSimulado,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
