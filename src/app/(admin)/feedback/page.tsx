"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "../components/UserContext";
import Link from "next/link";
import {
  MessageSquarePlus,
  Upload,
  X,
  CheckCircle2,
  Loader2,
  ImageIcon,
  Bug,
  Lightbulb,
  AlertCircle,
  Clipboard,
} from "lucide-react";
import Image from "next/image";

type TipoFeedback = "BUG" | "SUGESTAO" | "MELHORIA" | "OUTRO";

const TIPOS: { value: TipoFeedback; label: string; icon: React.ReactNode; cor: string }[] = [
  {
    value: "BUG",
    label: "Erro / Problema",
    icon: <Bug className="w-4 h-4" />,
    cor: "text-red-600 bg-red-50 border-red-200",
  },
  {
    value: "SUGESTAO",
    label: "Sugestão",
    icon: <Lightbulb className="w-4 h-4" />,
    cor: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    value: "MELHORIA",
    label: "Melhoria",
    icon: <MessageSquarePlus className="w-4 h-4" />,
    cor: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    value: "OUTRO",
    label: "Outro",
    icon: <AlertCircle className="w-4 h-4" />,
    cor: "text-gray-600 bg-gray-50 border-gray-200",
  },
];

export default function FeedbackPage() {
  const { user } = useUser();

  const [tipo, setTipo] = useState<TipoFeedback>("BUG");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processarArquivoImagem = (file: File) => {
    // Valida tipo
    if (!file.type.startsWith("image/")) {
      setErro("O arquivo deve ser uma imagem (PNG, JPEG, GIF, WEBP).");
      return;
    }

    // Valida tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErro("A imagem deve ter no máximo 5MB.");
      return;
    }

    setErro(null);
    setImagemFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processarArquivoImagem(file);
  };

  const colarImagemClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) {
        setErro("Seu navegador não suporta leitura direta da área de transferência pelo botão. Pressione Ctrl+V diretamente na página.");
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split("/")[1] || "png";
          const file = new File([blob], `captura_${Date.now()}.${ext}`, { type: imageType });
          processarArquivoImagem(file);
          return;
        }
      }
      setErro("Nenhuma imagem encontrada na área de transferência. Tire um print ou copie uma imagem primeiro.");
    } catch (err: any) {
      console.warn("Falha ao ler área de transferência:", err);
      setErro("Não foi possível acessar a área de transferência. Verifique a permissão do navegador ou use o atalho Ctrl+V.");
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processarArquivoImagem(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const removerImagem = () => {
    setImagemFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      setErro("A descrição é obrigatória.");
      return;
    }

    setEnviando(true);
    setErro(null);

    try {
      let imagemUrl: string | null = null;

      // 1. Upload da imagem se existir
      if (imagemFile) {
        const ext = imagemFile.name.split(".").pop();
        const nomeArquivo = `feedback_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("feedback-imagens")
          .upload(nomeArquivo, imagemFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: imagemFile.type,
          });

        if (uploadError) {
          // Se não houver bucket configurado, continua sem imagem e avisa
          console.warn("Upload de imagem falhou:", uploadError.message);
        } else {
          const { data: urlData } = supabase.storage
            .from("feedback-imagens")
            .getPublicUrl(nomeArquivo);
          imagemUrl = urlData?.publicUrl ?? null;
        }
      }

      // 2. Insere o feedback no banco
      const { error: insertError } = await supabase
        .from("feedbacks")
        .insert({
          tipo,
          titulo: titulo.trim() || null,
          descricao: descricao.trim(),
          imagem_url: imagemUrl,
          usuario_id: user?.id ?? null,
          usuario_nome: user?.nome ?? null,
          usuario_email: user?.email ?? null,
          nivel_acesso: user?.nivel_acesso ?? null,
        });

      if (insertError) throw insertError;

      // 3. Limpa o formulário e exibe sucesso
      setSucesso(true);
      setTitulo("");
      setDescricao("");
      setTipo("BUG");
      removerImagem();
    } catch (err: any) {
      console.error("Erro ao enviar feedback:", err);
      setErro(err.message || "Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const tipoAtual = TIPOS.find((t) => t.value === tipo)!;

  if (sucesso) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">
            Feedback Enviado!
          </h2>
          <p className="text-gray-500 mb-8 max-w-sm">
            Obrigado, <strong>{user?.nome}</strong>! Sua mensagem foi registrada e será analisada pela equipe de desenvolvimento.
          </p>
          <button
            onClick={() => setSucesso(false)}
            className="bg-green-700 hover:bg-green-600 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-sm"
          >
            Enviar outro feedback
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4 md:p-6">
      {/* Cabeçalho padrão do sistema */}
      <div className="bg-green-900 p-4 shadow-sm rounded-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-base font-black uppercase tracking-tight text-white">
            Enviar Feedback
          </h1>
          <p className="text-[10px] text-green-200 font-medium uppercase tracking-wider mt-1">
            Reporte problemas ou envie sugestões de melhoria
          </p>
        </div>
        <Link
          href="/painel"
          className="bg-green-800 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase transition-colors border border-green-700/50 flex items-center gap-2"
        >
          <span>⬅</span> Voltar ao Painel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tipo de feedback */}
          <div className="p-6 border-b border-gray-100">
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
              Tipo de Feedback
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                    tipo === t.value
                      ? t.cor + " border-current shadow-sm scale-[1.02]"
                      : "border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Solicitante (somente leitura) */}
          <div className="px-6 py-4 bg-gray-50/60 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0">
              {(user?.nome || user?.email || "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">
                {user?.nome || user?.email}
              </p>
              <p className="text-xs text-gray-400">
                {user?.email} &middot;{" "}
                <span className="font-semibold text-green-700">
                  {user?.nivel_acesso?.replace("_", "/")}
                </span>
              </p>
            </div>
            <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full font-medium">
              Solicitante
            </span>
          </div>

          {/* Título (opcional) */}
          <div className="p-6 border-b border-gray-100">
            <label
              htmlFor="feedback-titulo"
              className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2"
            >
              Título <span className="text-gray-400 normal-case font-normal">(opcional)</span>
            </label>
            <input
              id="feedback-titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={120}
              placeholder={`Ex: ${tipo === "BUG" ? "Erro ao salvar lançamento de módulo" : tipo === "SUGESTAO" ? "Adicionar exportação em Excel" : tipo === "MELHORIA" ? "Melhorar filtros do relatório" : "Outra observação"}`}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
            />
          </div>

          {/* Descrição */}
          <div className="p-6 border-b border-gray-100">
            <label
              htmlFor="feedback-descricao"
              className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2"
            >
              Descrição <span className="text-red-500">*</span>
            </label>
            <textarea
              id="feedback-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              rows={6}
              placeholder={
                tipo === "BUG"
                  ? "Descreva o que aconteceu, quando ocorre e como reproduzir o problema..."
                  : tipo === "SUGESTAO"
                  ? "Descreva sua sugestão em detalhes. Qual problema resolve? Como funcionaria?"
                  : tipo === "MELHORIA"
                  ? "Descreva o que poderia ser melhorado e como ficaria melhor..."
                  : "Descreva sua observação..."
              }
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all resize-none"
            />
            <p className="text-right text-xs text-gray-400 mt-1">
              {descricao.length} caracteres
            </p>
          </div>

          {/* Upload de imagem */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500">
                Print / Captura de Tela{" "}
                <span className="text-gray-400 normal-case font-normal">(opcional — máx. 5MB)</span>
              </label>
              {!previewUrl && (
                <button
                  type="button"
                  onClick={colarImagemClipboard}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Colar print da área de transferência"
                >
                  <Clipboard className="w-3.5 h-3.5 text-green-700" />
                  <span>Colar Imagem</span>
                </button>
              )}
            </div>

            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group">
                <img
                  src={previewUrl}
                  alt="Preview da imagem anexada"
                  className="w-full max-h-64 object-contain"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={colarImagemClipboard}
                    className="bg-white/95 hover:bg-green-50 border border-gray-200 hover:border-green-300 text-gray-700 hover:text-green-700 rounded-lg px-2.5 py-1 text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                    title="Substituir por imagem da área de transferência"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Colar outra</span>
                  </button>
                  <button
                    type="button"
                    onClick={removerImagem}
                    className="bg-white/95 hover:bg-red-50 border border-gray-200 hover:border-red-300 text-gray-600 hover:text-red-600 rounded-lg p-1.5 shadow-sm transition-all cursor-pointer"
                    title="Remover imagem"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs py-1 px-3 truncate">
                  {imagemFile?.name}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50/20 rounded-xl p-6 text-center transition-all">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <ImageIcon className="w-10 h-10 text-gray-300" />
                  <div>
                    <p className="font-bold text-sm text-gray-600">
                      Anexe uma captura de tela do problema ou sugestão
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">PNG, JPEG, GIF, WEBP (máx. 5MB)</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={colarImagemClipboard}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Clipboard className="w-4 h-4" />
                      <span>Colar Imagem</span>
                    </button>
                    <span className="text-xs text-gray-300 font-bold">ou</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-gray-500" />
                      <span>Selecionar Arquivo</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImagemChange}
              className="hidden"
              id="feedback-imagem"
            />
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 font-medium">{erro}</p>
          </div>
        )}

        {/* Botão de envio */}
        <button
          type="submit"
          disabled={enviando || !descricao.trim()}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-sm ${
            enviando || !descricao.trim()
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-green-700 hover:bg-green-600 active:bg-green-800 text-white"
          }`}
        >
          {enviando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <MessageSquarePlus className="w-4 h-4" />
              Enviar Feedback
            </>
          )}
        </button>
      </form>
    </div>
  );
}
