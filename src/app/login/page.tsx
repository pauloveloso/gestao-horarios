"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [senha, setSenha] = useState("");
  const router = useRouter();

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (senha === process.env.NEXT_PUBLIC_SENHA_ADMIN) {
      localStorage.setItem("usuario_admin", "true");
      router.push("/");
    } else {
      alert("Senha incorreta!");
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
            className="border p-2 rounded"
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
