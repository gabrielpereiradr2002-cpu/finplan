"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function Metas() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);

  // Formulário de Nova Meta
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Estado para o Modal/Campo de Depósito Rápido
  const [depositandoId, setDepositandoId] = useState<string | null>(null);
  const [valorDeposito, setValorDeposito] = useState("");

  useEffect(() => {
    carregarMetas();
  }, []);

  const carregarMetas = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    setUser(user);

    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setGoals(data);
    setLoading(false);
  };

  const adicionarMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    const { error } = await supabase.from("goals").insert([{
      user_id: user.id,
      title,
      target_amount: parseFloat(targetAmount),
      current_amount: parseFloat(currentAmount || "0"),
      target_date: targetDate + "-01",
    }]);

    if (!error) {
      setTitle(""); setTargetAmount(""); setCurrentAmount(""); setTargetDate("");
      carregarMetas();
    }
    setSalvando(false);
  };

  // FUNÇÃO PARA DEPOSITAR DINHEIRO NA META
  const realizarDeposito = async (goalId: string, currentTotal: number) => {
    if (!valorDeposito) return;
    
    const valorAdicional = parseFloat(valorDeposito.replace(",", "."));
    const novoTotal = currentTotal + valorAdicional;

    const { error } = await supabase
      .from("goals")
      .update({ current_amount: novoTotal })
      .eq("id", goalId);

    if (!error) {
      setDepositandoId(null);
      setValorDeposito("");
      carregarMetas();
    } else {
      alert("Erro ao depositar: " + error.message);
    }
  };

  const formatarMoeda = (valor: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const calcularProgresso = (current: number, target: number) => {
    const percent = (current / target) * 100;
    return Math.min(percent, 100).toFixed(0);
  };

  const calcularMensalidade = (current: number, target: number, dateString: string) => {
    const faltam = target - current;
    if (faltam <= 0) return 0;

    const dataAlvo = new Date(dateString);
    const hoje = new Date();
    
    const diffAnos = dataAlvo.getFullYear() - hoje.getFullYear();
    const diffMeses = dataAlvo.getMonth() - hoje.getMonth();
    let mesesFaltantes = (diffAnos * 12) + diffMeses;

    if (mesesFaltantes <= 0) mesesFaltantes = 1;

    return faltam / mesesFaltantes;
  };

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
          <Link href="/planejamento" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Planejamento</Link>
          <Link href="/metas" className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">Metas</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <span className="text-sm text-slate-600">{user?.email}</span>
          <button onClick={() => { supabase.auth.signOut(); router.push("/"); }} className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-1 rounded-md transition">Sair</button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulário de Nova Meta */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Criar Novo Objetivo</h3>
              <form onSubmit={adicionarMeta} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">O que você quer alcançar?</label>
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Comprar uma moto" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Qual o valor total? (R$)</label>
                  <input type="number" required value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="18000" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Já possui algum valor guardado?</label>
                  <input type="number" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} placeholder="4000 (Opcional)" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Qual a data limite?</label>
                  <input type="month" required value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>
                <button type="submit" disabled={salvando} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition">
                  {salvando ? "Criando plano..." : "Criar Meta"}
                </button>
              </form>
            </div>
          </div>

          {/* Lista de Metas */}
          <div className="lg:col-span-2 space-y-6">
            {goals.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500">
                Nenhuma meta cadastrada. Qual é o seu próximo grande sonho?
              </div>
            ) : (
              goals.map((goal) => {
                const percent = calcularProgresso(goal.current_amount, goal.target_amount);
                const mensalidade = calcularMensalidade(goal.current_amount, goal.target_amount, goal.target_date);
                const isConcluido = goal.current_amount >= goal.target_amount;
                const estaDepositando = depositandoId === goal.id;

                return (
                  <div key={goal.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-slate-800">{goal.title}</h4>
                        <p className="text-sm text-slate-500">Prazo: {new Date(goal.target_date).toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'})}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-800">{formatarMoeda(goal.current_amount)}</p>
                        <p className="text-sm text-slate-500">de {formatarMoeda(goal.target_amount)}</p>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="w-full bg-slate-100 rounded-full h-4 mb-3 overflow-hidden">
                      <div 
                        className={`h-4 rounded-full transition-all duration-1000 ${isConcluido ? 'bg-green-500' : 'bg-blue-600'}`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-700">{percent}% alcançado</span>
                        {!isConcluido && (
                          <span className="text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full text-xs">
                            Guarde ~{formatarMoeda(mensalidade)} / mês
                          </span>
                        )}
                        {isConcluido && (
                          <span className="text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full text-xs">
                            🎉 Meta atingida!
                          </span>
                        )}
                      </div>

                      {/* Botão de Depositar */}
                      {!estaDepositando ? (
                        <button 
                          onClick={() => setDepositandoId(goal.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm"
                        >
                          + Depositar Valor
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                          <input 
                            type="number" 
                            step="0.01"
                            placeholder="Valor R$" 
                            value={valorDeposito}
                            onChange={(e) => setValorDeposito(e.target.value)}
                            className="w-28 px-3 py-1 text-xs rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                          <button 
                            onClick={() => realizarDeposito(goal.id, Number(goal.current_amount))}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                          >
                            Salvar
                          </button>
                          <button 
                            onClick={() => { setDepositandoId(null); setValorDeposito(""); }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}