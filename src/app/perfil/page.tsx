"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function Perfil() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" }); // Para mostrar sucesso ou erro

  useEffect(() => {
    carregarUsuario();
  }, []);

  const carregarUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return router.push("/login");
    }

    setUser(user);
    // O Supabase guarda o nome dentro de user_metadata
    setNome(user.user_metadata?.full_name || "");
    setEmail(user.email || "");
    
    setLoading(false);
  };

  const atualizarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem({ texto: "", tipo: "" });

    try {
      // 1. Atualiza o Nome no Supabase Auth
      const { error: errorNome } = await supabase.auth.updateUser({
        data: { full_name: nome }
      });

      if (errorNome) throw errorNome;

      // 2. Se o usuário mudou o email, atualiza também
      if (email !== user.email) {
        const { error: errorEmail } = await supabase.auth.updateUser({
          email: email
        });
        
        if (errorEmail) throw errorEmail;
        
        setMensagem({ 
          texto: "Perfil atualizado! Como você alterou o e-mail, enviamos um link de confirmação para o novo endereço.", 
          tipo: "sucesso" 
        });
      } else {
        setMensagem({ texto: "Perfil atualizado com sucesso!", tipo: "sucesso" });
      }

    } catch (error: any) {
      setMensagem({ texto: error.message, tipo: "erro" });
    } finally {
      setSalvando(false);
      
      // Limpa a mensagem de sucesso depois de 4 segundos
      setTimeout(() => {
        setMensagem({ texto: "", tipo: "" });
      }, 4000);
    }
  };

  const redefinirSenha = async () => {
    if (!user?.email) return;
    
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: 'http://localhost:3000/nova-senha', // Redireciona para onde ele vai digitar a senha nova
    });

    if (error) {
      setMensagem({ texto: error.message, tipo: "erro" });
    } else {
      setMensagem({ texto: "Enviamos um link para o seu e-mail para você criar uma nova senha.", tipo: "sucesso" });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando perfil...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Menu Superior */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row justify-between sticky top-0 z-10 gap-3 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-2xl font-bold text-blue-600">FinPlan</h1>
          <button onClick={handleLogout} className="md:hidden text-sm font-medium text-red-600">Sair</button>
        </div>
        
        <div className="flex w-full md:w-auto gap-4 overflow-x-auto whitespace-nowrap pb-1 md:pb-0 hide-scrollbar">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Visão Geral</Link>
          <Link href="/fluxo" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Fluxo de Caixa</Link>
          <Link href="/planejamento" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Planejamento</Link>
          <Link href="/simulador" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Simulador</Link>
          <Link href="/metas" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Metas</Link>
          {/* O LINK DE PERFIL SÓ APARECE AQUI SE ESTIVER NO CELULAR */}
          <Link href="/perfil" className="md:hidden text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Meu Perfil</Link>
        </div>

        {/* LADO DIREITO: NOME CLICÁVEL (COMPUTADOR) */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/perfil" className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent transition flex items-center gap-2 shadow-sm">
            👤 {user?.user_metadata?.full_name || user?.email}
          </Link>
          <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-1 rounded-md transition">Sair</button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto p-6 mt-10">
        
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          
          {/* Cabeçalho Bonitão */}
          <div className="bg-slate-800 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center text-4xl font-bold mx-auto mb-4 shadow-lg border-4 border-slate-700">
              {nome ? nome.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : "👤")}
            </div>
            <h2 className="text-2xl font-bold text-white relative z-10">{nome || "Meu Perfil"}</h2>
            <p className="text-slate-400 text-sm mt-1 relative z-10">Gerencie seus dados de acesso ao FinPlan</p>
          </div>

          <div className="p-8">
            
            {/* Mensagem de Feedback (Sucesso/Erro) */}
            {mensagem.texto && (
              <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {mensagem.texto}
              </div>
            )}

            <form onSubmit={atualizarPerfil} className="space-y-6">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Completo</label>
                <input 
                  type="text" 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  placeholder="Como você quer ser chamado?" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none transition bg-slate-50 focus:bg-white" 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail de Acesso</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none transition bg-slate-50 focus:bg-white" 
                />
                <p className="text-xs text-slate-500 mt-2 ml-1">Se você alterar o e-mail, precisará confirmá-lo na sua caixa de entrada.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                
                <button 
                  type="button" 
                  onClick={redefinirSenha}
                  className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition w-full md:w-auto text-center"
                >
                  🔒 Enviar link para trocar senha
                </button>

                <button 
                  type="submit" 
                  disabled={salvando} 
                  className="bg-slate-800 text-white font-semibold py-3 px-8 rounded-xl hover:bg-slate-900 transition shadow-md disabled:opacity-50 w-full md:w-auto"
                >
                  {salvando ? "Salvando..." : "Salvar Alterações"}
                </button>

              </div>
            </form>

            {/* Zona de Perigo - Futura exclusão de conta */}
            <div className="mt-12 pt-8 border-t border-red-100">
              <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-2">Zona de Perigo</h3>
              <p className="text-sm text-slate-500 mb-4">Se você excluir sua conta, todos os seus lançamentos, orçamentos e metas serão apagados permanentemente. Esta ação não pode ser desfeita.</p>
              <button 
                onClick={() => alert("Para sua segurança, a exclusão automática de conta está desativada no momento. Entre em contato com o suporte.")} 
                className="text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition"
              >
                Excluir minha conta
              </button>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}