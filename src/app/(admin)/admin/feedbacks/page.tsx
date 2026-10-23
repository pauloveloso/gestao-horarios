"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  MessageSquarePlus,
  Bug,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  ChevronDown,
  X,
  ImageIcon,
  User,
  Calendar,
  Shield,
  Inbox,
} from "lucide-react";

type TipoFeedback = "BUG" | "SUGESTAO" | "MELHORIA" | "OUTRO";
type StatusFeedback = "ABERTO" | "EM_ANALISE" | "RESOLVIDO" | "DESCARTADO";

interface Feedback {
  id: string;
  tipo: TipoFeedback;
  titulo: string | null;
  descricao: string;
  imagem_url: string | null;
  usuario_id: string | null;
  usuario_nome: string | null;
  usuario_email: string | null;
  nivel_acesso: string | null;
  status: StatusFeedback;
  criado_em: string;
}

const TIPO_CONFIG: Record<
  TipoFeedback,
  { label: string; icon: React.ReactNode; cor: string; bg: string; border: string }
> = {
  BUG: {
    label: "Bug / Erro",
    icon: <Bug className="w-3.5 h-3.5" />,
    cor: "text-red-700",
    bg: "bg-red-100",
    border: "border-red-200",
  },
  SUGESTAO: {
    label: "Sugestão",
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    cor: "text-amber-700",
    bg: "bg-amber-100",
    border: "border-amber-200",
  },
  MELHORIA: {
    label: "Melhoria",
    icon: <MessageSquarePlus className="w-3.5 h-3.5" />,
    cor: "text-blue-700",
    bg: "bg-blue-100",
    border: "border-blue-200",
  },
  OUTRO: {
    label: "Outro",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    cor: "text-gray-600",
    bg: "bg-gray-100",
    border: "border-gray-200",
  },
};

const STATUS_CONFIG: Record<
  StatusFeedback,
  { label: string; icon: React.ReactNode; cor: string; bg: string; border: string }
> = {
  ABERTO: {
    label: "Aberto",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    cor: "text-orange-700",
    bg: "bg-orange-100",
    border: "border-orange-200",
  },
  EM_ANALISE: {
    label: "Em Análise",
    icon: <Clock className="w-3.5 h-3.5" />,
    cor: "text-blue-700",
    bg: "bg-blue-100",
    border: "border-blue-200",
  },
  RESOLVIDO: {
    label: "Resolvido",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    cor: "text-green-700",
    bg: "bg-green-100",
    border: "border-green-200",
  },
  DESCARTADO: {
    label: "Descartado",
    icon: <X className="w-3.5 h-3.5" />,
    cor: "text-gray-500",
    bg: "bg-gray-100",
    border: "border-gray-200",
  },
};

const TODOS_STATUS: StatusFeedback[] = [
  "ABERTO",
  "EM_ANALISE",
  "RESOLVIDO",
  "DESCARTADO",
];

function BadgeTipo({ tipo }: { tipo: TipoFeedback }) {
  const cfg = TIPO_CONFIG[tipo];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.cor} ${cfg.bg} ${cfg.border}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function BadgeStatus({ status }: { status: StatusFeedback }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.cor} ${cfg.bg} ${cfg.border}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GerenciarFeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<StatusFeedback | "TODOS">(
    "TODOS"
  );
  const [filtroTipo, setFiltroTipo] = useState<TipoFeedback | "TODOS">("TODOS");
  const [feedbackExpandido, setFeedbackExpandido] = useState<string | null>(
    null
  );
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setFeedbacks((data as Feedback[]) || []);
    } catch (err) {
      console.error("Erro ao carregar feedbacks:", err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const atualizarStatus = async (id: string, novoStatus: StatusFeedback) => {
    setAtualizandoId(id);
    try {
      const { error } = await supabase
        .from("feedbacks")
        .update({ status: novoStatus })
        .eq("id", id);

      if (error) throw error;

      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: novoStatus } : f))
      );
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    } finally {
      setAtualizandoId(null);
    }
  };

  const feedbacksFiltrados = feedbacks.filter((f) => {
    if (filtroStatus !== "TODOS" && f.status !== filtroStatus) return false;
    if (filtroTipo !== "TODOS" && f.tipo !== filtroTipo) return false;
    return true;
  });

  // Contagens por status
  const contagens = feedbacks.reduce(
    (acc, f) => {
      acc[f.status] = (acc[f.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
      {/* Cabeçalho padrão do sistema */}
      <div className="bg-green-900 p-4 shadow-sm rounded-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-base font-black uppercase tracking-tight text-white">
            Gerenciar Feedbacks
          </h1>
          <p className="text-[10px] text-green-200 font-medium uppercase tracking-wider mt-1">
            {feedbacks.length} registro{feedbacks.length !== 1 ? "s" : ""} no total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={carregar}
            disabled={carregando}
            className="bg-green-800 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase transition-colors border border-green-700/50 flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <Link
            href="/painel"
            className="bg-green-800 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase transition-colors border border-green-700/50 flex items-center gap-2"
          >
            <span>⬅</span> Voltar ao Painel
          </Link>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TODOS_STATUS.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const count = contagens[s] || 0;
          return (
            <button
              key={s}
              onClick={() =>
                setFiltroStatus((prev) => (prev === s ? "TODOS" : s))
              }
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                filtroStatus === s
                  ? `${cfg.bg} ${cfg.border} shadow-sm`
                  : "bg-white border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className={`text-2xl font-black ${cfg.cor}`}>{count}</div>
              <div
                className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${
                  filtroStatus === s ? cfg.cor : "text-gray-500"
                }`}
              >
                {cfg.icon}
                {cfg.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filtros de tipo */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-black text-gray-400 uppercase tracking-wider mr-1">
          Tipo:
        </span>
        <button
          onClick={() => setFiltroTipo("TODOS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            filtroTipo === "TODOS"
              ? "bg-gray-800 text-white border-gray-700"
              : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
          }`}
        >
          Todos
        </button>
        {(Object.keys(TIPO_CONFIG) as TipoFeedback[]).map((t) => {
          const cfg = TIPO_CONFIG[t];
          return (
            <button
              key={t}
              onClick={() =>
                setFiltroTipo((prev) => (prev === t ? "TODOS" : t))
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                filtroTipo === t
                  ? `${cfg.bg} ${cfg.border} ${cfg.cor}`
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {cfg.icon}
              {cfg.label}
            </button>
          );
        })}

        <span className="ml-auto text-xs text-gray-400 font-medium">
          {feedbacksFiltrados.length} resultado
          {feedbacksFiltrados.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Lista de feedbacks */}
      {carregando ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : feedbacksFiltrados.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center shadow-sm">
          <Inbox className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <p className="font-bold text-gray-400">Nenhum feedback encontrado</p>
          <p className="text-sm text-gray-300 mt-1">
            Tente ajustar os filtros acima.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacksFiltrados.map((fb) => {
            const isExpandido = feedbackExpandido === fb.id;
            const tipoCfg = TIPO_CONFIG[fb.tipo];
            const statusCfg = STATUS_CONFIG[fb.status];

            return (
              <div
                key={fb.id}
                className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${
                  fb.status === "DESCARTADO"
                    ? "opacity-60 border-gray-100"
                    : fb.status === "RESOLVIDO"
                    ? "border-green-100"
                    : fb.status === "EM_ANALISE"
                    ? "border-blue-100"
                    : "border-orange-100"
                }`}
              >
                {/* Cabeçalho do card */}
                <div
                  className="p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50/50 transition-colors select-none"
                  onClick={() =>
                    setFeedbackExpandido(isExpandido ? null : fb.id)
                  }
                >
                  {/* Ícone do tipo */}
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tipoCfg.bg}`}
                  >
                    <span className={tipoCfg.cor}>{tipoCfg.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <BadgeTipo tipo={fb.tipo} />
                      <BadgeStatus status={fb.status} />
                      {fb.imagem_url && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border text-purple-700 bg-purple-50 border-purple-200">
                          <ImageIcon className="w-3 h-3" />
                          Com imagem
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-gray-800 text-sm truncate">
                      {fb.titulo || fb.descricao.substring(0, 80) + (fb.descricao.length > 80 ? "…" : "")}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {fb.usuario_nome || fb.usuario_email || "Anônimo"}
                      </span>
                      {fb.nivel_acesso && (
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {fb.nivel_acesso.replace("_", "/")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatarData(fb.criado_em)}
                      </span>
                    </div>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-transform ${
                      isExpandido ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {/* Conteúdo expandido */}
                {isExpandido && (
                  <div className="border-t border-gray-100">
                    {/* Descrição */}
                    <div className="px-4 py-4">
                      {fb.titulo && (
                        <p className="font-black text-gray-800 mb-2">
                          {fb.titulo}
                        </p>
                      )}
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {fb.descricao}
                      </p>
                    </div>

                    {/* Imagem */}
                    {fb.imagem_url && (
                      <div className="px-4 pb-4">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                          Imagem anexada
                        </p>
                        <div
                          className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-zoom-in max-h-64"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImagemAmpliada(fb.imagem_url);
                          }}
                        >
                          <img
                            src={fb.imagem_url}
                            alt="Screenshot anexado ao feedback"
                            className="w-full max-h-64 object-contain"
                          />
                        </div>
                      </div>
                    )}

                    {/* Ações de status */}
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-gray-400 mr-1">
                        Alterar status:
                      </span>
                      {TODOS_STATUS.filter((s) => s !== fb.status).map((s) => {
                        const cfg = STATUS_CONFIG[s];
                        return (
                          <button
                            key={s}
                            onClick={(e) => {
                              e.stopPropagation();
                              atualizarStatus(fb.id, s);
                            }}
                            disabled={atualizandoId === fb.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border hover:shadow-sm disabled:opacity-50 ${cfg.bg} ${cfg.border} ${cfg.cor} hover:brightness-95`}
                          >
                            {atualizandoId === fb.id ? (
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              cfg.icon
                            )}
                            {cfg.label}
                          </button>
                        );
                      })}

                      <div className="ml-auto text-xs text-gray-400 font-mono truncate">
                        ID: {fb.id.split("-")[0]}...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de imagem ampliada */}
      {imagemAmpliada && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setImagemAmpliada(null)}
        >
          <div className="relative max-w-5xl w-full">
            <button
              onClick={() => setImagemAmpliada(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={imagemAmpliada}
              alt="Imagem do feedback ampliada"
              className="w-full rounded-xl shadow-2xl max-h-[85vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
