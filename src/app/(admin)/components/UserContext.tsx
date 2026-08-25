"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UsuarioSistema } from "@/types/database";

interface UserContextData {
  user: UsuarioSistema | null;
  loading: boolean;
  isAdmin: boolean;
  isDirecao: boolean;
  isComissao: boolean;
  isCoordenador: boolean;
  isProfessorTAE: boolean;
  hasAccessAtLeast: (level: UsuarioSistema["nivel_acesso"]) => boolean;
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
              nome: session.user.user_metadata?.full_name || "Usuário",
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
            nome: session.user.user_metadata?.full_name || "Usuário",
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

  const hasAccessAtLeast = (level: UsuarioSistema["nivel_acesso"]) => {
    if (!user) return false;
    return accessLevels[user.nivel_acesso] >= accessLevels[level];
  };

  const isAdmin = hasAccessAtLeast("ADMINISTRADOR");
  const isDirecao = hasAccessAtLeast("DIRECAO");
  const isComissao = hasAccessAtLeast("COMISSAO");
  const isCoordenador = hasAccessAtLeast("COORDENADOR");
  const isProfessorTAE = hasAccessAtLeast("PROFESSOR_TAE");

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isDirecao,
        isComissao,
        isCoordenador,
        isProfessorTAE,
        hasAccessAtLeast
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
