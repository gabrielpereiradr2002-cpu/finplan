"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function Planejamento() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [gastosPorCategoria, setGastosPorCategoria] = useState<Record<string, number>>({});

  const [categoria, setCategoria] = useState("Alimentação");
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  const categoriasPadrao = ["Moradia", "Alimentação", "Transporte", "Lazer", "Saúde", "Dívidas", "Investimentos", "Outros"];

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    setUser(user);

    // Mês atual exato para filtro
    const mesAtual = new Date().toISOString().slice(0, 7); // Ex: "2026-08"

    // 1. Busca os orçamentos globais do usuário
    const { data: budgetsBanco } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id);

    // 2. Busca TODAS as despesas
    const { data: transacoes } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "despesa");

    if (budgetsBanco) setOrcamentos(budgetsBanco);

    if (transacoes) {
      const gastos: Record<string, number> = {};
      
      transacoes.forEach(t => {
        // A mágica acontece aqui: filtramos apenas as transações que pertencem ao mês atual
        if (t.date.startsWith(mesAtual)) {
          gastos[t.category] = (gastos[t.category] || 0) + Number(t.amount);
        }
      });
      
      setGastosPorCategoria(gastos);
    }

    setLoading(false);
  };

  const salvarOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    const valorNumerico = parseFloat(valor.toString().replace(",", "."));
    const orcamentoExistente = orcamentos.find(o => o.category === categoria);
    const mesAtual = new Date().toISOString().slice(0, 7); // Adicionando o mês atual (YYYY-MM)

    let erroBanco = null;

    if (orcamentoExistente) {
      // Se já existir na categoria, apenas atualiza o valor
      const { error } = await supabase.from("budgets").update({ amount: valorNumerico }).eq("id", orcamentoExistente.id);
      erroBanco = error;
    } else {
      // Se não, insere incluindo a coluna 'month' que o banco exige
      const { error } = await supabase.from("budgets").insert([{
        user_id: user.id,
        category: categoria,
        amount: valorNumerico,
        month: mesAtual // AQUI ESTAVA O PROBLEMA!
      }]);
      erroBanco = error;
    }

    if (erroBanco) {
      alert("ERRO DO SUPABASE: " + erroBanco.message);
    } else {
      setValor("");
      carregarDados();
    }
    
    setSalvando(false);
  };

  const excluirOrcamento = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este limite?")) {
      await supabase.from("budgets").delete().eq("id", id);
      carregarDados();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const formatarMoeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando planejamento...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <nav className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row justify-between sticky top-0 z-10 gap-3 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-2xl font-bold text-blue-600">FinPlan</h1>
          <button onClick={handleLogout} className="md:hidden text-sm font-medium text-red-600">Sair</button>
        </div>
        
        <div className="flex w-full md:w-auto gap-4 overflow-x-auto whitespace-nowrap pb-1 md:pb-0">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Visão Geral</Link>
          <Link href="/fluxo" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Fluxo de Caixa</Link>
          <Link href="/planejamento" className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">Planejamento</Link>
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

      <main className="max-w-4xl mx-auto p-6 mt-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-800">Seu Orçamento Mensal</h2>
          <p className="text-slate-500 mt-2">Defina limites de gastos e nós avisaremos antes de você estourar.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Definir Limite</h3>
              <form onSubmit={salvarOrcamento} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none bg-white">
                    {categoriasPadrao.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Limite Máximo (R$)</label>
                  <input type="number" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>
                <button type="submit" disabled={salvando} className="w-full bg-slate-800 text-white font-semibold py-3 rounded-lg hover:bg-slate-900 transition mt-2 shadow-sm">
                  {salvando ? "Salvando..." : "Salvar Limite"}
                </button>
              </form>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            {orcamentos.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 text-center">
                <span className="text-4xl mb-4 block">🎯</span>
                <p className="text-slate-500 font-medium">Nenhum limite definido ainda.</p>
                <p className="text-sm text-slate-400 mt-1">Comece limitando seus maiores gastos, como Lazer ou Alimentação.</p>
              </div>
            ) : (
              orcamentos.map((orc) => {
                const limite = Number(orc.amount);
                // Busca o gasto total do mês atual para a categoria deste orçamento
                const gasto = gastosPorCategoria[orc.category] || 0;
                
                // Calcula o percentual e impede que a barra passe de 100 visualmente
                const percentual = Math.min((gasto / limite) * 100, 100);
                
                let corBarra = "bg-green-500";
                if (percentual >= 80) corBarra = "bg-yellow-500";
                if (percentual >= 100) corBarra = "bg-red-500";

                return (
                  <div key={orc.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 transition hover:shadow-md">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-lg">{orc.category}</h4>
                      </div>
                      <button onClick={() => excluirOrcamento(orc.id)} className="text-slate-400 hover:text-red-500 transition" title="Excluir Limite">
                        🗑️
                      </button>
                    </div>

                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-slate-500">Gasto: <span className="text-slate-800 font-bold">{formatarMoeda(gasto)}</span></span>
                      <span className="font-medium text-slate-500">Limite: <span className="text-slate-800">{formatarMoeda(limite)}</span></span>
                    </div>

                    {/* BARRA DE PROGRESSO */}
                    <div className="w-full bg-slate-100 rounded-full h-3 mb-1 overflow-hidden">
                      <div className={`h-3 rounded-full transition-all duration-500 ease-out ${corBarra}`} style={{ width: `${percentual}%` }}></div>
                    </div>
                    
                    {percentual >= 100 ? (
                      <p className="text-xs text-red-600 font-semibold text-right">Limite estourado!</p>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium text-right">Disponível: {formatarMoeda(limite - gasto)}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>
      </main>
    </div>
  );
}