"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Login() {
  const router = useRouter();
  
  // Verifica se já está logado para mandar direto pro Dashboard
  useEffect(() => {
    const checarSessao = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.push("/dashboard");
    };
    checarSessao();
  }, [router]);

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Estados do Formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Feedbacks visuais
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro("");
    setMensagem("");

    try {
      if (isLogin) {
        // LÓGICA DE LOGIN
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        router.push("/dashboard");
        
      } else {
        // LÓGICA DE CADASTRO
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: nome, // Salva o nome no perfil do usuário logo no cadastro!
            }
          }
        });
        if (error) throw error;
        
        setMensagem("Conta criada com sucesso! Você já pode fazer login.");
        setIsLogin(true); // Muda para a aba de login para ele entrar
        setPassword(""); // Limpa a senha por segurança
      }
    } catch (error: any) {
      setErro(error.message === "Invalid login credentials" 
        ? "E-mail ou senha incorretos." 
        : error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      
      {/* LADO ESQUERDO: BRANDING (Escondido no celular, visível no PC) */}
      <div className="hidden lg:flex w-1/2 bg-blue-600 flex-col justify-between p-12 relative overflow-hidden">
        {/* Elementos decorativos de fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-700 rounded-full blur-3xl opacity-50 -ml-10 -mb-10"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white mb-16">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 font-black text-xl shadow-lg">
              F
            </div>
            <span className="text-2xl font-bold tracking-tight">FinPlan</span>
          </div>
          
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
            O controle do seu <br/> futuro financeiro <br/> em um só lugar.
          </h1>
          <p className="text-blue-100 text-lg max-w-md leading-relaxed">
            Abandone as planilhas confusas. Descubra para onde seu dinheiro está indo, planeje seus gastos e alcance suas metas com inteligência.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-blue-200 text-sm font-medium">
          <span>Seguro</span>
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
          <span>Rápido</span>
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
          <span>Inteligente</span>
        </div>
      </div>

      {/* LADO DIREITO: FORMULÁRIO DE ACESSO */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        
        {/* Logo visível apenas no celular */}
        <div className="absolute top-8 left-6 lg:hidden flex items-center gap-2 text-blue-600">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black shadow-md">F</div>
          <span className="text-xl font-bold tracking-tight">FinPlan</span>
        </div>

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
            </h2>
            <p className="text-slate-500">
              {isLogin ? "Insira seus dados para acessar o painel." : "Dê o primeiro passo para sua liberdade financeira."}
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
            
            {/* TOGGLE LOGIN / CADASTRO */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
              <button 
                type="button"
                onClick={() => { setIsLogin(true); setErro(""); setMensagem(""); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Entrar
              </button>
              <button 
                type="button"
                onClick={() => { setIsLogin(false); setErro(""); setMensagem(""); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Criar Conta
              </button>
            </div>

            {/* AVISOS DE ERRO OU SUCESSO */}
            {erro && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl flex items-center gap-2">
                <span>⚠️</span> {erro}
              </div>
            )}
            {mensagem && (
              <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 text-sm font-medium rounded-xl flex items-center gap-2">
                <span>✅</span> {mensagem}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Como quer ser chamado?</label>
                  <input 
                    type="text" 
                    required={!isLogin}
                    value={nome} 
                    onChange={(e) => setNome(e.target.value)} 
                    placeholder="Seu nome" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition bg-slate-50 focus:bg-white" 
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail</label>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="seu@email.com" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition bg-slate-50 focus:bg-white" 
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Senha</label>
                  {isLogin && (
                    <a href="#" onClick={() => alert("Por favor, faça login e altere sua senha no seu Perfil.")} className="text-xs font-semibold text-blue-600 hover:underline">
                      Esqueceu a senha?
                    </a>
                  )}
                </div>
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition bg-slate-50 focus:bg-white" 
                />
                {!isLogin && <p className="text-xs text-slate-500 mt-2 ml-1">A senha deve ter pelo menos 6 caracteres.</p>}
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {loading ? "Processando..." : (isLogin ? "Entrar no Painel" : "Criar minha conta")}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}