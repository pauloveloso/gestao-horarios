"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [usuarioNaoAutorizado, setUsuarioNaoAutorizado] = useState<any>(null);

  useEffect(() => {
    // Redireciona caso já esteja logado
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (session.user.email?.endsWith("@ifnmg.edu.br")) {
            router.push("/painel");
          } else {
            setUsuarioNaoAutorizado(session.user);
          }
        }
      } catch (error) {
        console.error("Erro ao verificar sessão no login:", error);
      }
    };
    checkSession();

    // Checa se veio com erro na URL (ex: redirecionado pelo layout por e-mail inválido)
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const erroParam = searchParams.get("erro");
      if (erroParam === "dominio") {
        setErro("Acesso Negado: Apenas contas com e-mail @ifnmg.edu.br são permitidas.");
      }
    }
  }, []);

  const fazerLoginGoogle = async () => {
    setCarregando(true);
    setErro("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/painel`,
          queryParams: {
            prompt: 'select_account'
          }
        },
      });

      if (error) {
        setErro("Houve um erro ao tentar conectar com o Google.");
        setCarregando(false);
      }
    } catch (err) {
      console.error("Erro inesperado no login:", err);
      setErro("Houve um erro inesperado ao tentar conectar com o Google.");
      setCarregando(false);
    }
  };

  const fazerLogout = async () => {
    setCarregando(true);
    await supabase.auth.signOut();
    setUsuarioNaoAutorizado(null);
    setCarregando(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* CABEÇALHO DO LOGIN */}
        <div className="bg-green-800 p-8 text-center">
          <h1 className="text-3xl font-black italic tracking-tighter text-white">
            SGH{" "}
            <span className="font-light not-italic text-green-200">
              | IFNMG
            </span>
          </h1>
          <p className="text-green-100 text-sm mt-2 font-medium">
            Acesso Restrito - Institucional
          </p>
        </div>

        {/* FORMULÁRIO */}
        <div className="p-8 flex flex-col items-center">
          {erro && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-bold text-center border border-red-200 mb-6 w-full">
              {erro}
            </div>
          )}

          {usuarioNaoAutorizado ? (
            <div className="w-full flex flex-col items-center gap-4 text-center">
               <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-bold border border-red-200 w-full">
                  <span className="text-2xl block mb-2">⛔</span>
                  Você está autenticado como <br/><span className="text-black font-black">{usuarioNaoAutorizado.email}</span>, <br/>mas este e-mail não é autorizado.
               </div>
               <p className="text-gray-500 text-xs font-medium">
                 Para acessar o sistema, faça logout desta conta e entre novamente usando sua conta corporativa @ifnmg.edu.br.
               </p>
               <button
                  onClick={fazerLogout}
                  disabled={carregando}
                  className="w-full bg-red-600 border border-red-700 text-white font-black py-3 px-4 rounded-lg shadow-sm hover:bg-red-700 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
               >
                  {carregando ? "SAINDO..." : "SAIR DESTA CONTA"}
               </button>
            </div>
          ) : (
            <>
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-xs font-bold text-center border border-yellow-200 mb-6 w-full">
                ⚠️ O acesso a este sistema é exclusivo para servidores do IFNMG através da conta institucional (@ifnmg.edu.br).
              </div>

              <button
                onClick={fazerLoginGoogle}
                disabled={carregando}
                className="w-full bg-white border-2 border-gray-200 text-gray-700 font-black py-3 px-4 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-3"
              >
                {carregando ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    ENTRAR COM GOOGLE
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* RODAPÉ DO LOGIN */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <Link
            href="/"
            className="text-sm font-bold text-gray-500 hover:text-green-700 transition-colors"
          >
            ← Voltar para Consulta Pública
          </Link>
        </div>
      </div>
    </div>
  );
}
