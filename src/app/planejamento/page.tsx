"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function Planejamento() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [mesAtual, setMesAtual] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [budgets, setBudgets] = useState<any[]>([]);
  const [gastosRealizados, setGastosRealizados] = useState<Record<string, number>>({});

  // Formulário
  const [categoria, setCategoria] = useState("Moradia");
  const [valorPlanejado, setValorPlanejado] = useState("");
  const [salvando, setSalvando] = useState(false);

  const categoriasPadrao = ["Moradia", "Alimentação", "Transporte", "Lazer", "Saúde", "Dívidas", "Investimentos", "Outros"];

  useEffect(() => {
    carregarDados();
  }, [mesAtual]);

  const carregarDados = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    setUser(user);

    // 1. Busca os orçamentos planejados para o mês escolhido
    const { data: orcamentos } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", mesAtual);

    if (orcamentos) setBudgets(orcamentos);

    // 2. Busca as despesas reais do mês escolhido para cruzar os dados
    const { data: transacoes } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "despesa")
      .like("date", `${mesAtual}%`); // Filtra apenas as datas que começam com o mês atual

    if (transacoes) {
      // Soma os gastos agrupando por categoria
      const gastos: Record<string, number> = {};
      transacoes.forEach((t) => {
        gastos[t.category] = (gastos[t.category] || 0) + Number(t.amount);
      });
      setGastosRealizados(gastos);
    }
    
    setLoading(false);
  };

  const salvarOrcamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    // O comando 'upsert' atualiza se já existir ou cria se for novo
    const { error } = await supabase.from("budgets").upsert([{
      user_id: user.id,
      category: categoria,
      amount: parseFloat(valorPlanejado),
      month: mesAtual
    }], { onConflict: 'user_id, category, month' });

    if (!error) {
      setValorPlanejado("");
      carregarDados();
    }
    setSalvando(false);
  };

  const formatarMoeda = (valor: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Menu Superior */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row justify-between sticky top-0 z-10 gap-3 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-2xl font-bold text-blue-600">FinPlan</h1>
          <button onClick={() => { supabase.auth.signOut(); router.push("/"); }} className="md:hidden text-sm font-medium text-red-600">Sair</button>
        </div>
        
        <div className="flex w-full md:w-auto gap-4 overflow-x-auto whitespace-nowrap pb-1 md:pb-0">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Visão Geral</Link>
          <Link href="/fluxo" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Fluxo de Caixa</Link>
          <Link href="/planejamento" className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">Planejamento</Link>
          <Link href="/simulador" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Simulador</Link>
          <Link href="/metas" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Metas</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <span className="text-sm text-slate-600">{user?.email}</span>
          <button onClick={() => { supabase.auth.signOut(); router.push("/"); }} className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-1 rounded-md transition">Sair</button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 mt-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800">Orçamento Mensal</h2>
          <input 
            type="month" 
            value={mesAtual}
            onChange={(e) => setMesAtual(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-300 font-medium text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário de Planejamento */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Definir Limite</h3>
              <form onSubmit={salvarOrcamento} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                  <select 
                    value={categoria} 
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
                  >
                    {categoriasPadrao.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor Máximo (R$)</label>
                  <input 
                    type="number" required step="0.01" value={valorPlanejado} 
                    onChange={(e) => setValorPlanejado(e.target.value)} 
                    placeholder="Ex: 800" 
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none" 
                  />
                </div>
                <button type="submit" disabled={salvando} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition">
                  {salvando ? "Salvando..." : "Salvar Planejamento"}
                </button>
              </form>
            </div>
          </div>

          {/* Comparativo Planejado x Realizado */}
          <div className="lg:col-span-2 space-y-4">
            {budgets.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500">
                Você ainda não definiu nenhum limite para este mês.
              </div>
            ) : (
              budgets.map((budget) => {
                const realizado = gastosRealizados[budget.category] || 0;
                const planejado = Number(budget.amount);
                const desvio = planejado - realizado;
                const percentual = Math.min((realizado / planejado) * 100, 100);
                const estourou = desvio < 0;

                return (
                  <div key={budget.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <h4 className="text-lg font-bold text-slate-800">{budget.category}</h4>
                        <p className="text-sm text-slate-500">Planejado: {formatarMoeda(planejado)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${estourou ? 'text-red-600' : 'text-slate-800'}`}>
                          {formatarMoeda(realizado)}
                        </p>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Realizado</p>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden">
                      <div 
                        className={`h-3 rounded-full transition-all duration-1000 ${estourou ? 'bg-red-500' : percentual > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${percentual}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-600">{percentual.toFixed(0)}% consumido</span>
                      <span className={`font-semibold px-3 py-1 rounded-full ${estourou ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {estourou ? `Estourou: ${formatarMoeda(Math.abs(desvio))}` : `Sobra: +${formatarMoeda(desvio)}`}
                      </span>
                    </div>
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