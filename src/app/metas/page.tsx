"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Metas() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);

  // Formulário
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [salvando, setSalvando] = useState(false);

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

  // Funções de Matemática e Lógica
  const formatarMoeda = (valor: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const calcularProgresso = (current: number, target: number) => {
    const percent = (current / target) * 100;
    return Math.min(percent, 100).toFixed(0); // Limita a 100%
  };

  const calcularMensalidade = (current: number, target: number, dateString: string) => {
    const faltam = target - current;
    if (faltam <= 0) return 0; // Meta já batida

    const dataAlvo = new Date(dateString);
    const hoje = new Date();
    
    // Calcula diferença em meses
    const diffAnos = dataAlvo.getFullYear() - hoje.getFullYear();
    const diffMeses = dataAlvo.getMonth() - hoje.getMonth();
    let mesesFaltantes = (diffAnos * 12) + diffMeses;

    if (mesesFaltantes <= 0) mesesFaltantes = 1; // Para evitar divisão por zero

    return faltam / mesesFaltantes;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Menu Superior (Igual ao do Dashboard) */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold text-blue-600">FinPlan</h1>
          <div className="hidden md:flex gap-4">
            <a href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Visão Geral</a>
            <a href="/metas" className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">Minhas Metas</a>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulário de Nova Meta */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
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

          {/* Lista de Metas e Barras de Progresso */}
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
                    <div className="w-full bg-slate-100 rounded-full h-4 mb-2 overflow-hidden">
                      <div 
                        className={`h-4 rounded-full transition-all duration-1000 ${isConcluido ? 'bg-green-500' : 'bg-blue-600'}`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-700">{percent}% alcançado</span>
                      
                      {!isConcluido && (
                        <span className="text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full">
                          Guarde ~{formatarMoeda(mensalidade)} / mês
                        </span>
                      )}
                      {isConcluido && (
                        <span className="text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full flex items-center gap-1">
                          🎉 Meta atingida!
                        </span>
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