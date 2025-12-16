"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [senha, setSenha] = useState("");
  const router = useRouter();

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    // === CORREÇÃO AQUI ===
    // Tenta ler do .env, se não achar, usa "admin1234" como padrão
    const senhaAdmin = process.env.NEXT_PUBLIC_SENHA_ADMIN;

    // Debug para você ver no Console (F12) o que está acontecendo
    console.log("Senha digitada:", senha);
    console.log("Senha que o sistema espera:", senhaAdmin);

    if (senha === senhaAdmin) {
      localStorage.setItem("usuario_admin", "true");
      router.push("/");
    } else {
      alert("Senha incorreta!");
      setSenha(""); // Limpa o campo para tentar de novo
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-sm w-full">
        <h1 className="text-2xl font-bold text-blue-900 mb-6 text-center">
          🔐 Acesso Restrito
        </h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Senha de Administrador"
            className="border p-2 rounded text-black" // Adicionei text-black para garantir que dê para ler
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <button className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold">
            Entrar
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:underline text-center"
          >
            Voltar para a Grade (Sem editar)
          </button>
        </form>
      </div>
    </div>
  );
}
