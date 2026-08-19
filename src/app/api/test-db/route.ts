import { createClient } from "../../../lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Tenta buscar uma tabela que sabemos que existe (ex: cursos)
    const { data, error } = await supabase
      .from("cursos")
      .select("id, nome")
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          erro: "Erro na consulta",
          mensagem: error.message,
          detalhes: error.details,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: "Conexão OK! Tabelas encontradas.",
      dados: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        erro: "Falha na conexão",
        mensagem: err.message,
      },
      { status: 500 },
    );
  }
}
