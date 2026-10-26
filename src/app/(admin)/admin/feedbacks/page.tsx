"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "../../components/UserContext";
import Link from "next/link";
import {
  MessageSquarePlus,
  Bug,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronDown,
  X,
  ImageIcon,
  User,
  Calendar,
  Shield,
  Inbox,
  Pencil,
  Save,
  XCircle,
  UserCheck,
} from "lucide-react";

// ─── Tipos ─────────────────────────────────────────────────────────────────

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

// ─── Configurações visuais ──────────────────────────────────────────────────

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

// ─── Componentes auxiliares ─────────────────────────────────────────────────

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

// ─── Página principal ───────────────────────────────────────────────────────

export default function FeedbacksPage() {
  const { user, isAdmin } = useUser();

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<StatusFeedback | "TODOS">("TODOS");
  const [filtroTipo, setFiltroTipo] = useState<TipoFeedback | "TODOS">("TODOS");
  const [apenasEuFiltro, setApenasEuFiltro] = useState(false);
  const [feedbackExpandido, setFeedbackExpandido] = useState<string | null>(null);
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  // Estado de edição
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTipo, setEditTipo] = useState<TipoFeedback>("BUG");
  const [editTitulo, setEditTitulo] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  // Imagem na edição
  const [editImagemAtual, setEditImagemAtual] = useState<string | null>(null);
  const [editImagemNovaFile, setEditImagemNovaFile] = useState<File | null>(null);
  const [editImagemNovaPreview, setEditImagemNovaPreview] = useState<string | null>(null);
  const [editRemoverImagem, setEditRemoverImagem] = useState(false);
  const fileEditRef = useRef<HTMLInputElement>(null);

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

  // ── Alterar status (apenas admin) ────────────────────────────────────────
  const atualizarStatus = async (id: string, novoStatus: StatusFeedback) => {
    if (!isAdmin) return;
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

  // ── Iniciar edição ────────────────────────────────────────────────────────
  const iniciarEdicao = (fb: Feedback) => {
    setEditandoId(fb.id);
    setEditTipo(fb.tipo);
    setEditTitulo(fb.titulo || "");
    setEditDescricao(fb.descricao);
    setEditImagemAtual(fb.imagem_url);
    setEditImagemNovaFile(null);
    setEditImagemNovaPreview(null);
    setEditRemoverImagem(false);
    setErroEdicao(null);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditImagemNovaFile(null);
    if (editImagemNovaPreview) URL.revokeObjectURL(editImagemNovaPreview);
    setEditImagemNovaPreview(null);
    setEditRemoverImagem(false);
    setErroEdicao(null);
  };

  const handleEditImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErroEdicao("O arquivo deve ser uma imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErroEdicao("A imagem deve ter no máximo 5MB.");
      return;
    }
    setErroEdicao(null);
    setEditRemoverImagem(false);
    setEditImagemNovaFile(file);
    if (editImagemNovaPreview) URL.revokeObjectURL(editImagemNovaPreview);
    setEditImagemNovaPreview(URL.createObjectURL(file));
  };

  // ── Salvar edição (reseta para ABERTO) ────────────────────────────────────
  const salvarEdicao = async (id: string) => {
    if (!editDescricao.trim()) {
      setErroEdicao("A descrição é obrigatória.");
      return;
    }
    setSalvandoEdicao(true);
    setErroEdicao(null);
    try {
      // 1. Resolve a URL final da imagem
      let imagemUrlFinal: string | null | undefined = undefined; // undefined = não muda

      if (editRemoverImagem) {
        // Remover imagem: zera a URL
        imagemUrlFinal = null;
      } else if (editImagemNovaFile) {
        // Faz upload da nova imagem
        const ext = editImagemNovaFile.name.split(".").pop();
        const nomeArquivo = `feedback_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("feedback-imagens")
          .upload(nomeArquivo, editImagemNovaFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: editImagemNovaFile.type,
          });
        if (uploadError) {
          setErroEdicao("Falha ao enviar imagem: " + uploadError.message);
          setSalvandoEdicao(false);
          return;
        }
        const { data: urlData } = supabase.storage
          .from("feedback-imagens")
          .getPublicUrl(nomeArquivo);
        imagemUrlFinal = urlData?.publicUrl ?? null;
      }
      // Se nenhuma das condições acima, imagemUrlFinal permanece undefined
      // e não incluímos imagem_url no update (mantém a atual)

      const payload: Record<string, any> = {
        tipo: editTipo,
        titulo: editTitulo.trim() || null,
        descricao: editDescricao.trim(),
        status: "ABERTO", // edição sempre reseta para ABERTO
      };
      if (imagemUrlFinal !== undefined) {
        payload.imagem_url = imagemUrlFinal;
      }

      const { error } = await supabase
        .from("feedbacks")
        .update(payload)
        .eq("id", id);
      if (error) throw error;

      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                tipo: editTipo,
                titulo: editTitulo.trim() || null,
                descricao: editDescricao.trim(),
                status: "ABERTO",
                imagem_url: imagemUrlFinal !== undefined ? imagemUrlFinal : f.imagem_url,
              }
            : f
        )
      );

      // Limpeza
      if (editImagemNovaPreview) URL.revokeObjectURL(editImagemNovaPreview);
      setEditImagemNovaFile(null);
      setEditImagemNovaPreview(null);
      setEditRemoverImagem(false);
      setEditandoId(null);
    } catch (err: any) {
      setErroEdicao(err.message || "Erro ao salvar.");
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // ── Filtros ───────────────────────────────────────────────────────────────
  const feedbacksFiltrados = feedbacks.filter((f) => {
    // Feedbacks descartados só são visíveis para administradores
    if (!isAdmin && f.status === "DESCARTADO") return false;
    if (filtroStatus !== "TODOS" && f.status !== filtroStatus) return false;
    if (filtroTipo !== "TODOS" && f.tipo !== filtroTipo) return false;
    if (apenasEuFiltro && f.usuario_id !== user?.id) return false;
    return true;
  });

  // Contagens por status (sobre todos, ou filtrados por "Meus" se ativo)
  // Feedbacks descartados são excluídos da base de contagem para não-admins
  const baseCont = (apenasEuFiltro
    ? feedbacks.filter((f) => f.usuario_id === user?.id)
    : feedbacks
  ).filter((f) => isAdmin || f.status !== "DESCARTADO");
  const contagens = baseCont.reduce(
    (acc, f) => { acc[f.status] = (acc[f.status] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  const meusFeedbacksCount = feedbacks
    .filter((f) => f.usuario_id === user?.id && (isAdmin || f.status !== "DESCARTADO"))
    .length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
      {/* ── Cabeçalho padrão do sistema ── */}
      <div className="bg-green-900 p-4 shadow-sm rounded-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-base font-black uppercase tracking-tight text-white">
            {isAdmin ? "Gerenciar Feedbacks" : "Feedbacks"}
          </h1>
          <p className="text-[10px] text-green-200 font-medium uppercase tracking-wider mt-1">
            {(() => {
              const total = isAdmin
                ? feedbacks.length
                : feedbacks.filter((f) => f.status !== "DESCARTADO").length;
              return `${total} registro${total !== 1 ? "s" : ""} no total`;
            })()}
            {!isAdmin && ` · ${meusFeedbacksCount} enviado${meusFeedbacksCount !== 1 ? "s" : ""} por você`}
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
            <span>⬅</span> Painel
          </Link>
        </div>
      </div>

      {/* ── Cards de métricas por status ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TODOS_STATUS.filter((s) => isAdmin || s !== "DESCARTADO").map((s) => {
          const cfg = STATUS_CONFIG[s];
          const count = contagens[s] || 0;
          return (
            <button
              key={s}
              onClick={() => setFiltroStatus((prev) => (prev === s ? "TODOS" : s))}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                filtroStatus === s
                  ? `${cfg.bg} ${cfg.border} shadow-sm`
                  : "bg-white border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className={`text-2xl font-black ${cfg.cor}`}>{count}</div>
              <div className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${filtroStatus === s ? cfg.cor : "text-gray-500"}`}>
                {cfg.icon}
                {cfg.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Barra de filtros ── */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3 flex flex-wrap gap-2 items-center">
        {/* Filtro Meus feedbacks */}
        <button
          onClick={() => setApenasEuFiltro((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            apenasEuFiltro
              ? "bg-green-700 text-white border-green-700"
              : "bg-gray-50 text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-700"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Meus feedbacks
          {meusFeedbacksCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${apenasEuFiltro ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"}`}>
              {meusFeedbacksCount}
            </span>
          )}
        </button>

        <span className="w-px h-5 bg-gray-200 mx-1" />

        {/* Filtro de tipo */}
        <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Tipo:</span>
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
              onClick={() => setFiltroTipo((prev) => (prev === t ? "TODOS" : t))}
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
          {feedbacksFiltrados.length} resultado{feedbacksFiltrados.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Lista de feedbacks ── */}
      {carregando ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : feedbacksFiltrados.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center shadow-sm">
          <Inbox className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <p className="font-bold text-gray-400">Nenhum feedback encontrado</p>
          <p className="text-sm text-gray-300 mt-1">Tente ajustar os filtros acima.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacksFiltrados.map((fb) => {
            const isExpandido = feedbackExpandido === fb.id;
            const tipoCfg = TIPO_CONFIG[fb.tipo];
            const ehMeu = fb.usuario_id === user?.id;
            const estaEditando = editandoId === fb.id;

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
                {/* ── Cabeçalho do card ── */}
                <div
                  className="p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50/50 transition-colors select-none"
                  onClick={() => !estaEditando && setFeedbackExpandido(isExpandido ? null : fb.id)}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tipoCfg.bg}`}>
                    <span className={tipoCfg.cor}>{tipoCfg.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <BadgeTipo tipo={fb.tipo} />
                      <BadgeStatus status={fb.status} />
                      {ehMeu && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border text-green-700 bg-green-50 border-green-200">
                          <UserCheck className="w-3 h-3" />
                          Meu
                        </span>
                      )}
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
                      {isAdmin && fb.nivel_acesso && (
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
                    className={`w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-transform ${isExpandido ? "rotate-180" : ""}`}
                  />
                </div>

                {/* ── Conteúdo expandido ── */}
                {isExpandido && (
                  <div className="border-t border-gray-100">
                    {estaEditando ? (
                      /* ── Formulário de edição ── */
                      <div className="p-4 space-y-3">
                        <p className="text-xs font-black uppercase tracking-widest text-green-700 flex items-center gap-1">
                          <Pencil className="w-3 h-3" /> Editando seu feedback
                        </p>

                        {/* Tipo */}
                        <div className="flex flex-wrap gap-2">
                          {(Object.keys(TIPO_CONFIG) as TipoFeedback[]).map((t) => {
                            const cfg = TIPO_CONFIG[t];
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setEditTipo(t)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                  editTipo === t
                                    ? `${cfg.bg} ${cfg.border} ${cfg.cor}`
                                    : "bg-gray-50 text-gray-500 border-gray-200"
                                }`}
                              >
                                {cfg.icon}
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Título */}
                        <input
                          type="text"
                          value={editTitulo}
                          onChange={(e) => setEditTitulo(e.target.value)}
                          maxLength={120}
                          placeholder="Título (opcional)"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                        />

                        {/* Descrição */}
                        <textarea
                          value={editDescricao}
                          onChange={(e) => setEditDescricao(e.target.value)}
                          rows={5}
                          required
                          placeholder="Descrição..."
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 resize-none"
                        />

                        {/* ── Imagem ── */}
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                            Imagem / Print
                            <span className="normal-case font-normal text-gray-300 ml-1">(opcional — máx. 5MB)</span>
                          </p>

                          {/* Mostra imagem atual ou nova */}
                          {(editImagemNovaPreview || (editImagemAtual && !editRemoverImagem)) ? (
                            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 mb-2">
                              <img
                                src={editImagemNovaPreview || editImagemAtual!}
                                alt="Preview"
                                className="w-full max-h-48 object-contain"
                              />
                              <div className="absolute top-2 right-2 flex gap-1">
                                {/* Trocar imagem */}
                                <button
                                  type="button"
                                  onClick={() => fileEditRef.current?.click()}
                                  className="bg-white/90 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-600 rounded-full p-1.5 shadow-sm transition-all"
                                  title="Substituir imagem"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                </button>
                                {/* Remover imagem */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditRemoverImagem(true);
                                    setEditImagemNovaFile(null);
                                    if (editImagemNovaPreview) URL.revokeObjectURL(editImagemNovaPreview);
                                    setEditImagemNovaPreview(null);
                                    if (fileEditRef.current) fileEditRef.current.value = "";
                                  }}
                                  className="bg-white/90 hover:bg-red-50 border border-gray-200 hover:border-red-300 text-gray-600 hover:text-red-600 rounded-full p-1.5 shadow-sm transition-all"
                                  title="Remover imagem"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {editImagemNovaPreview && (
                                <div className="absolute bottom-0 left-0 right-0 bg-blue-600/80 text-white text-[10px] py-1 px-2 font-bold">
                                  Nova imagem selecionada
                                </div>
                              )}
                            </div>
                          ) : editRemoverImagem ? (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-2">
                              <X className="w-4 h-4 text-red-500 shrink-0" />
                              <p className="text-xs text-red-700 font-bold flex-1">Imagem será removida ao salvar</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditRemoverImagem(false);
                                }}
                                className="text-xs text-red-600 underline hover:no-underline"
                              >
                                Desfazer
                              </button>
                            </div>
                          ) : null}

                          {/* Botão de adicionar imagem (quando não há nenhuma) */}
                          {!editImagemNovaPreview && !editImagemAtual && !editRemoverImagem && (
                            <button
                              type="button"
                              onClick={() => fileEditRef.current?.click()}
                              className="w-full border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50/30 rounded-xl p-4 text-center transition-all group"
                            >
                              <div className="flex items-center justify-center gap-2 text-gray-400 group-hover:text-green-600 transition-colors text-xs font-bold">
                                <ImageIcon className="w-4 h-4" />
                                Anexar imagem (PNG, JPEG, GIF, WEBP)
                              </div>
                            </button>
                          )}

                          <input
                            ref={fileEditRef}
                            type="file"
                            accept="image/*"
                            onChange={handleEditImagemChange}
                            className="hidden"
                          />
                        </div>

                        {erroEdicao && (
                          <p className="text-xs text-red-600 font-medium">{erroEdicao}</p>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => salvarEdicao(fb.id)}
                            disabled={salvandoEdicao}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                          >
                            {salvandoEdicao ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            Salvar alterações
                          </button>
                          <button
                            onClick={cancelarEdicao}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancelar
                          </button>
                          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 ml-auto">
                            ⚠️ Ao salvar, o status retorna para <strong>Aberto</strong>
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* ── Visualização ── */
                      <>
                        <div className="px-4 py-4">
                          {fb.titulo && (
                            <p className="font-black text-gray-800 mb-2">{fb.titulo}</p>
                          )}
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {fb.descricao}
                          </p>
                        </div>

                        {fb.imagem_url && (
                          <div className="px-4 pb-4">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                              Imagem anexada
                            </p>
                            <div
                              className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-zoom-in max-h-64"
                              onClick={(e) => {
                                e.stopPropagation();
                                setImagemAmpliada(fb.imagem_url);
                              }}
                            >
                              <img
                                src={fb.imagem_url}
                                alt="Screenshot do feedback"
                                className="w-full max-h-64 object-contain"
                              />
                            </div>
                          </div>
                        )}

                        {/* ── Rodapé do card: ações ── */}
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-2">
                          {/* Editar — apenas o próprio, exceto se estiver resolvido/descartado */}
                          {ehMeu && fb.status !== "RESOLVIDO" && fb.status !== "DESCARTADO" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                iniciarEdicao(fb);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-green-50 border border-gray-200 hover:border-green-300 text-gray-700 hover:text-green-700 rounded-lg text-xs font-bold transition-all"
                            >
                              <Pencil className="w-3 h-3" />
                              Editar
                            </button>
                          )}

                          {/* Alterar status — apenas admins */}
                          {isAdmin && (
                            <>
                              <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                                Status:
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
                            </>
                          )}

                          {/* Indicação para não-admin sem ação */}
                          {!isAdmin && !ehMeu && (
                            <p className="text-xs text-gray-400 italic">
                              Somente visualização
                            </p>
                          )}

                          <div className="ml-auto text-xs text-gray-400 font-mono">
                            {fb.id.split("-")[0]}...
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de imagem ampliada ── */}
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
