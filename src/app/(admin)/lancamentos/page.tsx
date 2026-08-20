"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useMasterData } from "../components/MasterDataContext";

import ModoPlanilha from "./components/ModoPlanilha";
import ModoGrade from "./components/ModoGrade";

export default function LancamentosPage() {
  const { dadosMestres, carregando: carregandoMestre } = useMasterData();
  const [carregandoAulas, setCarregandoAulas] = useState(true);

  const [modoAtivo, setModoAtivo] = useState<"PLANILHA" | "GRADE">("PLANILHA");

  const versaoRascunhoRef = useRef<any>(null);
  const [versaoRascunho, setVersaoRascunho] = useState<any>(null);

  const [aulas, setAulas] = useState<any[]>([]);
  const [choques, setChoques] = useState<any[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const turmas = dadosMestres?.turmas || [];
  const cursos = dadosMestres?.cursos || [];
  const professores = dadosMestres?.professores || [];
  const disciplinas = dadosMestres?.disciplinas || [];
  const espacos = dadosMestres?.espacos || [];
  const slots = dadosMestres?.slots || [];
  const categorias = dadosMestres?.categorias || [];

  const atualizarRascunho = (val: any) => {
    versaoRascunhoRef.current = val;
    setVersaoRascunho(val);
  };

  const buscarChoques = async () => {
    const rascunhoId = versaoRascunhoRef.current?.id;
    if (!rascunhoId) return;

    console.time("⏱️ Gargalo 2: Tempo da View de Choques");

    const { data, error } = await supabase
      .from("vw_choques_horarios")
      .select("*")
      .eq("versao_id", rascunhoId);

    if (error) {
      console.error("🚨 Erro na View de Choques:", error.message);
    }

    if (data) {
      setChoques(data.filter((c) => c.tipo_choque !== "CARGA_HORARIA"));
    }
    console.timeEnd("⏱️ Gargalo 2: Tempo da View de Choques");
  };

  const buscarAulas = async (cargaInicial = false) => {
    if (!versaoRascunhoRef.current) return;

    if (cargaInicial) {
      console.time("⏱️ Gargalo 1: Consulta Principal Aulas + Choques");
      
      (async () => {
        try {
          const { data } = await supabase
            .from("aulas")
            .select("*")
            .eq("versao_id", versaoRascunhoRef.current.id)
            .limit(5000);
          if (data) setAulas(data);
        } catch (e) {
          console.error(e);
        } finally {
          setCarregandoAulas(false);
          console.timeEnd("⏱️ Gargalo 1: Consulta Principal Aulas + Choques");
        }
      })();

      buscarChoques();
    } else {
      // Quando não é carga inicial, o canal Realtime (WebSocket) cuidará de atualizar as aulas e os choques
      console.log("Aguardando via Realtime. Recarga total ignorada.");
    }
  };

  // ========================================================================
  // EFEITO 1: INICIALIZAÇÃO
  // ========================================================================
  useEffect(() => {
    let montado = true;

    const inicializarDadosMestres = async () => {
      setCarregandoAulas(true);
      try {
        const { data: dVersoes } = await supabase
          .from("versoes_grade")
          .select("*")
          .eq("status", "RASCUNHO")
          .limit(1);

        const rascunho = dVersoes && dVersoes.length > 0 ? dVersoes[0] : null;

        if (!montado) return;

        if (rascunho) {
          atualizarRascunho(rascunho);
        } else {
          setCarregandoAulas(false);
        }
      } catch (error) {
        console.error("Erro na inicialização:", error);
        if (montado) setCarregandoAulas(false);
      }
    };

    inicializarDadosMestres();

    return () => {
      montado = false;
    };
  }, []);

  // ========================================================================
  // EFEITO 2: ATUALIZAÇÃO OTIMISTA (Velocidade Extrema RAM + WebSocket)
  // ========================================================================
  useEffect(() => {
    if (!versaoRascunho) return;

    let montado = true;

    buscarAulas(true);

    const idAba = Math.random().toString(36).substring(7);
    const canalAulas = supabase
      .channel(`aulas_${idAba}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "aulas" },
        (payload) => {
          console.log("Recebido evento Realtime de Aulas:", payload);
          
          setAulas((prevAulas) => {
            let novasAulas = [...prevAulas];
            if (payload.eventType === "INSERT") {
              novasAulas.push(payload.new);
            } else if (payload.eventType === "UPDATE") {
              const idx = novasAulas.findIndex((a) => a.id === payload.new.id);
              if (idx > -1) novasAulas[idx] = payload.new;
              else novasAulas.push(payload.new);
            } else if (payload.eventType === "DELETE") {
              novasAulas = novasAulas.filter((a) => a.id !== payload.old.id);
            }
            return novasAulas;
          });

          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            console.log("Realtime: Atualizando choques após mudanças nas aulas...");
            buscarChoques();
          }, 300);
        },
      )
      .subscribe();

    return () => {
      montado = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(canalAulas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versaoRascunho]);

  const carregandoGlobal = carregandoMestre || carregandoAulas;

  if (carregandoGlobal) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 font-bold text-lg animate-pulse">
            Sincronizando dados do campus...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-green-900 p-4 shadow-sm rounded-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-3">
            Lançamentos
          </h1>
          <p className="text-[10px] text-green-200 font-medium uppercase tracking-wider mt-1">
            Gestão acadêmica do semestre
          </p>
        </div>

        {versaoRascunho && (
          <div className="hidden md:flex flex-col items-center justify-center px-4">
            <span className="text-[10px] font-black uppercase text-green-200">
              Editando Rascunho
            </span>
            <span className="text-xs font-bold text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-200 mt-0.5 tracking-widest uppercase">
              {versaoRascunho.nome}
            </span>
          </div>
        )}

        <div className="flex bg-green-950 p-1 rounded-lg shadow-inner">
          <button
            onClick={() => setModoAtivo("PLANILHA")}
            className={`px-6 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-all ${
              modoAtivo === "PLANILHA"
                ? "bg-green-600 text-white shadow-sm"
                : "text-green-400 hover:text-white"
            }`}
          >
            📋 Planilha
          </button>
          <button
            onClick={() => setModoAtivo("GRADE")}
            className={`px-6 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-all ${
              modoAtivo === "GRADE"
                ? "bg-green-600 text-white shadow-sm"
                : "text-green-400 hover:text-white"
            }`}
          >
            🗓️ Grade
          </button>
        </div>
      </div>

      {!versaoRascunho ? (
        <div className="bg-white border border-gray-200 p-12 rounded-xl text-center shadow-sm flex flex-col items-center justify-center">
          <span className="text-6xl mb-4 opacity-50">📁</span>
          <h2 className="text-2xl font-black text-gray-800 mb-2">
            Nenhum Rascunho Ativo
          </h2>
          <p className="text-gray-500 font-medium max-w-md mx-auto">
            Para iniciar os lançamentos, você precisa de um rascunho aberto. Vá
            até o menu <b>Gestão de Versões</b> e crie ou ative um rascunho.
          </p>
        </div>
      ) : (
        <>
          {modoAtivo === "PLANILHA" && (
            <ModoPlanilha
              versaoId={versaoRascunho.id}
              aulas={aulas}
              choques={choques}
              turmas={turmas}
              cursos={cursos}
              professores={professores}
              disciplinas={disciplinas}
              espacos={espacos}
              slots={slots}
              categorias={categorias}
              recarregarAulas={() => buscarAulas(false)}
            />
          )}

          {modoAtivo === "GRADE" && (
            <ModoGrade
              versaoId={versaoRascunho.id}
              aulas={aulas}
              choques={choques}
              turmas={turmas}
              cursos={cursos}
              professores={professores}
              disciplinas={disciplinas}
              espacos={espacos}
              slots={slots}
              categorias={categorias}
              recarregarAulas={() => buscarAulas(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
