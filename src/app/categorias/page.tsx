"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function Categorias() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [categorias, setCategorias] = useState<any[]>([]);
  
  // Estados do formulário
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("despesa");
  const [cor, setCor] = useState("#3b82f6"); // Azul por padrão
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Paleta de cores para o usuário escolher
  const CORES_DISPONIVEIS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', 
    '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', 
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b', '#334155'
  ];

  useEffect(() => {
    carregarCategorias();
  }, []);

  const carregarCategorias = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    setUser(user);

    const { data: catBanco } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (catBanco) {
      setCategorias(catBanco);
    }
    
    setLoading(false);
  };

  const salvarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    if (editandoId) {
      // MODO EDIÇÃO
      const { error } = await supabase.from("categories").update({
        name: nome,
        type: tipo,
        color: cor
      }).eq("id", editandoId);

      if (!error) {
        limparFormulario();
        carregarCategorias();
      } else {
        alert("Erro ao atualizar categoria: " + error.message);
      }
    } else {
      // MODO CRIAÇÃO
      // Verifica se já existe uma categoria com esse nome para esse tipo
      const existe = categorias.find(c => c.name.toLowerCase() === nome.toLowerCase() && c.type === tipo);
      if (existe) {
        alert("Você já tem uma categoria com esse nome para este tipo.");
        setSalvando(false);
        return;
      }

      const { error } = await supabase.from("categories").insert([{
        user_id: user.id,
        name: nome,
        type: tipo,
        color: cor
      }]);

      if (!error) {
        limparFormulario();
        carregarCategorias();
      } else {
        alert("Erro ao salvar categoria: " + error.message);
      }
    }
    
    setSalvando(false);
  };

  const iniciarEdicao = (cat: any) => {
    setEditandoId(cat.id);
    setNome(cat.name);
    setTipo(cat.type);
    setCor(cat.color || "#3b82f6");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const limparFormulario = () => {
    setEditandoId(null);
    setNome("");
    setCor("#3b82f6");
  };

  const excluirCategoria = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a categoria "${name}"?\n\nIsso NÃO apagará os lançamentos que já usaram essa categoria.`)) {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (!error) {
        carregarCategorias();
      } else {
        alert("Erro ao excluir: " + error.message);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando categorias...</div>;

  const categoriasReceita = categorias.filter(c => c.type === 'receita');
  const categoriasDespesa = categorias.filter(c => c.type === 'despesa');

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* MENU */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row justify-between sticky top-0 z-10 gap-3 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-2xl font-bold text-blue-600">FinPlan</h1>
          <button onClick={handleLogout} className="md:hidden text-sm font-medium text-red-600">Sair</button>
        </div>
        
        <div className="flex w-full md:w-auto gap-4 overflow-x-auto whitespace-nowrap pb-1 md:pb-0">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Visão Geral</Link>
          <Link href="/fluxo" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Fluxo de Caixa</Link>
          <Link href="/planejamento" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Planejamento</Link>
          <Link href="/simulador" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Simulador</Link>
          <Link href="/metas" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Metas</Link>
          <Link href="/perfil" className="md:hidden text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Meu Perfil</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/perfil" className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent transition flex items-center gap-2 shadow-sm">
            👤 {user?.user_metadata?.full_name || user?.email}
          </Link>
          <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-1 rounded-md transition">Sair</button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 mt-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Suas Categorias</h2>
            <p className="text-slate-500 mt-2">Personalize como você organiza o seu dinheiro.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUNA 1: FORMULÁRIO */}
          <div className="lg:col-span-1">
            <div className={`p-6 rounded-2xl shadow-sm border sticky top-24 transition-colors ${editandoId ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-lg font-bold ${editandoId ? 'text-amber-800' : 'text-slate-800'}`}>
                  {editandoId ? '✏️ Editando Categoria' : 'Nova Categoria'}
                </h3>
                {editandoId && (
                  <button onClick={limparFormulario} className="text-xs font-bold text-slate-500 hover:text-slate-800">CANCELAR</button>
                )}
              </div>

              <form onSubmit={salvarCategoria} className="space-y-5">
                
                {/* TIPO */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setTipo("receita")} className={`py-2 rounded-lg font-medium text-sm transition border ${tipo === "receita" ? "bg-green-100 text-green-700 border-green-200" : "bg-white text-slate-600 border-slate-200"}`}>
                      Receita
                    </button>
                    <button type="button" onClick={() => setTipo("despesa")} className={`py-2 rounded-lg font-medium text-sm transition border ${tipo === "despesa" ? "bg-red-100 text-red-700 border-red-200" : "bg-white text-slate-600 border-slate-200"}`}>
                      Despesa
                    </button>
                  </div>
                </div>

                {/* NOME */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nome da Categoria</label>
                  <input 
                    type="text" 
                    required 
                    value={nome} 
                    onChange={(e) => setNome(e.target.value)} 
                    placeholder="Ex: Delivery, Assinaturas..." 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none" 
                  />
                </div>

                {/* COR */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cor de Identificação</label>
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    {CORES_DISPONIVEIS.map(hex => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setCor(hex)}
                        className={`w-8 h-8 rounded-full shadow-sm border-2 transition-transform ${cor === hex ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={salvando} className={`w-full text-white font-semibold py-3 rounded-xl transition shadow-sm mt-4 disabled:opacity-50 ${editandoId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
                  {salvando ? "Salvando..." : (editandoId ? "Atualizar Categoria" : "Criar Categoria")}
                </button>
              </form>
            </div>
          </div>

          {/* COLUNA 2 e 3: LISTAS DE CATEGORIAS */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Lista de Despesas */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl">📉</div>
                <h3 className="text-lg font-bold text-slate-800">Despesas</h3>
                <span className="ml-auto bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">{categoriasDespesa.length}</span>
              </div>
              
              {categoriasDespesa.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-sm">Nenhuma categoria de despesa criada.</p>
              ) : (
                <div className="space-y-3">
                  {categoriasDespesa.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition group">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: cat.color }}></div>
                        <span className="font-semibold text-slate-700">{cat.name}</span>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button onClick={() => iniciarEdicao(cat)} className="text-slate-400 hover:text-blue-600 transition" title="Editar">✏️</button>
                        <button onClick={() => excluirCategoria(cat.id, cat.name)} className="text-slate-400 hover:text-red-600 transition" title="Excluir">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de Receitas */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl">📈</div>
                <h3 className="text-lg font-bold text-slate-800">Receitas</h3>
                <span className="ml-auto bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">{categoriasReceita.length}</span>
              </div>
              
              {categoriasReceita.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-sm">Nenhuma categoria de receita criada.</p>
              ) : (
                <div className="space-y-3">
                  {categoriasReceita.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition group">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: cat.color }}></div>
                        <span className="font-semibold text-slate-700">{cat.name}</span>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button onClick={() => iniciarEdicao(cat)} className="text-slate-400 hover:text-blue-600 transition" title="Editar">✏️</button>
                        <button onClick={() => excluirCategoria(cat.id, cat.name)} className="text-slate-400 hover:text-red-600 transition" title="Excluir">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}