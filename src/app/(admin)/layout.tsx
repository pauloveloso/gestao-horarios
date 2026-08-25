"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MasterDataProvider } from "./components/MasterDataContext";
import { UserProvider, useUser } from "./components/UserContext";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: verificandoAuth, isCoordenador, isComissao, isAdmin } = useUser();

  const [menuAberto, setMenuAberto] = useState(false);

  // Os redirects automáticos do useEffect foram removidos para evitar loop infinito
  // Vamos tratar o bloqueio via UI (Renderização Condicional) abaixo.

  const fazerLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ==========================================================================
  // ESTRUTURA DO MENU BASEADA NO RBAC
  // ==========================================================================
  const gruposMenu = [
    {
      titulo: "Visão Geral",
      itens: [{ nome: "Dashboard", href: "/painel", icone: "📊", visible: true }],
      visible: true,
    },
    {
      titulo: "Gestão de Horários",
      itens: [
        { nome: "Lançamentos", href: "/lancamentos", icone: "🗓️", visible: isCoordenador },
        { nome: "Gestão de Versões", href: "/cadastros/versoes", icone: "🔄", visible: isComissao },
        {
          nome: "Visualizar Horários",
          href: "/relatorios/visualizar-horarios",
          icone: "👁️",
          visible: true,
        },
        {
          nome: "Fichas de Matrícula",
          href: "/relatorios/fichas",
          icone: "📑",
          visible: isCoordenador,
        },
        {
          nome: "Quadros de Horários",
          href: "/relatorios/horarios",
          icone: "🗓️",
          visible: isCoordenador,
        },
        {
          nome: "Exportar PDF Integrado",
          href: "/relatorios/pdf-integrado",
          icone: "📄",
          visible: isComissao,
        },
        { nome: "Reserva de Espaços", href: "/reservas", icone: "📅", visible: true },
      ],
      visible: true,
    },
    {
      titulo: "Base de Dados",
      itens: [
        { nome: "Períodos Letivos", href: "/cadastros/periodos", icone: "📅", visible: isComissao },
        { nome: "Cursos e Turmas", href: "/cadastros/cursos", icone: "🎓", visible: isCoordenador },
        { nome: "Disciplinas", href: "/cadastros/disciplinas", icone: "📚", visible: isCoordenador },
        { nome: "Professores", href: "/cadastros/professores", icone: "👨‍🏫", visible: isCoordenador },
        { nome: "Espaços Físicos", href: "/cadastros/espacos", icone: "🏫", visible: isComissao },
      ],
      visible: isCoordenador, // Ocultar o grupo todo se não tiver pelo menos acesso de coordenador
    },
    {
      titulo: "Administração",
      itens: [
        { nome: "Usuários do Sistema", href: "/cadastros/usuarios", icone: "👥", visible: isAdmin },
      ],
      visible: isAdmin,
    },
  ];

  // ==========================================================================
  // BLOQUEIO DE ACESSO DIRETO PELA URL
  // ==========================================================================
  const isRouteAllowed = () => {
    if (pathname === "/painel") return true;
    for (const grupo of gruposMenu) {
      for (const item of grupo.itens) {
        if (pathname === item.href || pathname?.startsWith(item.href + "/")) {
          // Se o grupo está invisível ou o item está invisível, bloqueia
          if (!grupo.visible || !item.visible) return false;
          return true; // Se achou e tá visível, libera
        }
      }
    }
    // Se a rota não estiver mapeada no menu (ex: uma rota obscura), libera por padrão, 
    // assumindo que páginas perigosas já estão mapeadas no menu.
    return true; 
  };

  if (verificandoAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Se não estiver logado, exibe tela para fazer login em vez de redirecionar automaticamente (evita loops)
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 flex-col font-sans p-4">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md w-full">
          <span className="text-5xl mb-4 block">🔒</span>
          <h2 className="text-xl font-black text-gray-800 mb-2">Sessão Expirada ou Inválida</h2>
          <p className="text-gray-500 font-medium text-sm mb-6">
            Você precisa estar logado para acessar o painel de gestão.
          </p>
          <Link href="/login" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm inline-block shadow-sm w-full">
            Ir para a Tela de Login
          </Link>
        </div>
      </div>
    );
  }

  // Bloqueio rígido de domínio
  if (user.email && !user.email.endsWith("@ifnmg.edu.br")) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 flex-col font-sans p-4">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-red-200 max-w-md w-full">
          <span className="text-5xl opacity-80 mb-4 block">⛔</span>
          <h2 className="text-xl font-black text-red-700 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 font-medium text-sm mb-6 bg-red-50 p-3 rounded border border-red-100">
            O e-mail <b>{user.email}</b> não é autorizado. Apenas contas <b>@ifnmg.edu.br</b> são permitidas no sistema.
          </p>
          <button 
            onClick={fazerLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm inline-block shadow-sm w-full"
          >
            Sair e Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!isRouteAllowed()) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 flex-col font-sans">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-red-100 max-w-md">
          <span className="text-5xl opacity-50 mb-4 block">⛔</span>
          <h2 className="text-xl font-black text-gray-800 mb-2">Acesso Negado</h2>
          <p className="text-gray-500 font-medium text-sm mb-6">
            O seu perfil (<strong className="text-green-700">{user.nivel_acesso.replace("_", "/")}</strong>) não tem permissão para acessar esta página.
          </p>
          <Link href="/painel" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm inline-block shadow-sm">
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* OVERLAY PARA MENU MOBILE */}
      {menuAberto && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* SIDEBAR (MENU LATERAL) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-green-900 text-white shadow-2xl md:shadow-none transform transition-transform duration-300 ease-in-out print:hidden flex flex-col ${
          menuAberto ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 bg-green-950 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter text-white">
              SGH{" "}
              <span className="font-light not-italic text-green-400">
                | Admin
              </span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-green-200 mt-1">
              IFNMG - Campus Januária
            </p>
          </div>
          <button
            onClick={() => setMenuAberto(false)}
            className="md:hidden text-green-200 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 border-b border-green-800 bg-green-900/50">
          <p className="text-xs text-green-300 uppercase font-bold mb-1">Logado como</p>
          <p className="font-medium text-sm truncate">{user.nome || user.email}</p>
          <span className="inline-block mt-2 px-2 py-1 bg-green-800 text-[10px] font-black tracking-wider rounded">
            {user.nivel_acesso.replace("_", "/")}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          {gruposMenu.filter(g => g.visible).map((grupo, index) => (
            <div key={index} className="mb-6">
              <h2 className="px-6 text-[10px] font-black uppercase tracking-wider text-green-400 mb-2">
                {grupo.titulo}
              </h2>
              <ul className="space-y-1">
                {grupo.itens.filter(i => i.visible).map((item) => {
                  const ativo =
                    pathname === item.href ||
                    pathname?.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                         href={item.href}
                         onClick={() => setMenuAberto(false)}
                         className={`flex items-center gap-3 px-6 py-2.5 transition-colors relative ${ativo ? "bg-green-800 text-white font-bold" : "text-green-100 hover:bg-green-800/50 hover:text-white font-medium"}`}
                       >
                         {ativo && (
                           <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-400 rounded-r-md"></span>
                         )}
                         <span className="text-lg">{item.icone}</span>
                         <span className="text-sm">{item.nome}</span>
                       </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* RODAPÉ DO MENU COM BOTÃO DE SAIR */}
        <div className="p-4 bg-green-950/50 border-t border-green-800 shrink-0 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-center gap-2 w-full bg-green-800 hover:bg-green-700 text-white py-2 rounded-lg text-xs font-bold transition-colors"
          >
            <span>👁️</span> Visão Pública
          </Link>
          <button
            onClick={fazerLogout}
            className="flex items-center justify-center gap-2 w-full border border-green-700 text-green-300 hover:bg-green-800 hover:text-white py-2 rounded-lg text-xs font-bold transition-colors"
          >
            <span>🚪</span> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="md:hidden bg-white shadow-sm border-b border-gray-200 p-4 flex items-center gap-4 shrink-0 print:hidden">
          <button
            onClick={() => setMenuAberto(true)}
            className="p-2 -ml-2 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <span className="font-black text-green-800 italic">SGH | Admin</span>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 relative p-4 md:p-8">
          <MasterDataProvider>
            {children}
          </MasterDataProvider>
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(74, 222, 128, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(74, 222, 128, 0.4);
        }
      `}</style>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </UserProvider>
  );
}
