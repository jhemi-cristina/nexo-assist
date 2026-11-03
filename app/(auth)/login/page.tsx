"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Credenciais inválidas");
        return;
      }

      if (data.user.role === "ANALYST") {
        window.location.href = "/console";
      } else {
        window.location.href = "/chat";
      }
    } catch {
      setError("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* LEFT — dark hero */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10"
        style={{ backgroundColor: "#0f172a" }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-base"
            style={{ backgroundColor: "#2563eb" }}>
            N
          </div>
          <span className="text-white font-semibold text-lg">Nexo Assist</span>
        </div>

        {/* Headline */}
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight max-w-md">
            Seu problema de TI, resolvido em uma conversa.
          </h1>
          <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
            Descreva o que está acontecendo. O assistente consulta seus chamados,
            busca na central de ajuda e chama um analista quando precisa.
          </p>

          {/* Mini chat preview */}
          <div className="rounded-xl border border-slate-700 p-4 space-y-3 max-w-sm"
            style={{ backgroundColor: "#1e293b" }}>
            <div className="flex justify-end">
              <div className="bg-slate-600 text-white text-xs px-3 py-2 rounded-2xl rounded-br-sm max-w-[80%]">
                Meu notebook ficou lento depois da atualização do Windows
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs">Nexo Assist</span>
                <span className="text-blue-400 text-xs">✓ consultou seus chamados</span>
              </div>
              <div className="bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-2xl rounded-tl-sm max-w-[90%]">
                Encontrei seu chamado <span className="text-blue-300 font-medium">INC-20311</span> sobre isso.
                Está aguardando analista há 6 dias — prazo vencido. Chamo um analista agora?
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-8">
          <div>
            <p className="text-white font-semibold text-lg">8 s</p>
            <p className="text-slate-400 text-xs">primeira resposta, em média</p>
          </div>
          <div>
            <p className="text-white font-semibold text-lg">72%</p>
            <p className="text-slate-400 text-xs">resolvidos sem fila</p>
          </div>
          <div>
            <p className="text-white font-semibold text-lg">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />6
            </p>
            <p className="text-slate-400 text-xs">analistas online agora</p>
          </div>
        </div>
      </div>

      {/* RIGHT — login form */}
      <div className="flex-1 flex flex-col justify-between p-8 lg:p-12 bg-white">
        <div className="flex justify-end">
          <p className="text-sm text-slate-500">
            Problema para entrar?{" "}
            <span className="text-blue-600 font-medium cursor-pointer hover:underline">
              Ligue no ramal 4000
            </span>
          </p>
        </div>

        <div className="max-w-sm w-full mx-auto space-y-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: "#2563eb" }}>
              N
            </div>
            <span className="font-semibold text-slate-800 text-lg">Nexo Assist</span>
          </div>

          <div>
            <h2 className="text-3xl font-semibold text-slate-900">Entrar</h2>
            <p className="text-sm text-slate-500 mt-1">
              Use seu e-mail corporativo e a senha da rede Nexo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                E-mail corporativo
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ana.souza@nexo.com.br"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">Senha</label>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => {}}
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-600">Manter conectado neste computador</span>
            </label>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ backgroundColor: loading ? "#93c5fd" : "#2563eb" }}
            >
              {loading ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Entrando...
                </>
              ) : (
                "Entrar →"
              )}
            </button>
          </form>
        </div>

        <p className="text-xs text-slate-400 text-center">
          © 2026 Nexo · Service desk de TI &nbsp;|&nbsp;{" "}
          <span className="hover:underline cursor-pointer">Privacidade e uso de dados</span>
        </p>
      </div>
    </div>
  );
}
