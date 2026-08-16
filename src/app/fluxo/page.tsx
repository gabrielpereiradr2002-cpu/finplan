"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function FluxoCaixa() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [saldoAtual, setSaldoAtual] = useState(0);
  const [saldoProjetado, setSaldoProjetado] = useState(0);
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    setUser(user);

    // Busca todas as transações, ordenadas por data crescente
    const { data: transacoes } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (transacoes) {
      const hoje = new Date().toISOString().split("T")[0];
      
      // 1. Calcula o Saldo Atual (Tudo que aconteceu até hoje)
      let saldoReal = 0;
      transacoes.forEach(t => {
        if (t.date <= hoje) {
          saldoReal += t.type === 'receita' ? Number(t.amount) : -Number(t.amount);
        }
      });
      setSaldoAtual(saldoReal);

      // 2. Separa os Lançamentos Futuros (A partir de amanhã)
      const transacoesFuturas = transacoes.filter(t => t.date > hoje);
      
      // 3. Constrói a Linha do Tempo simulando o saldo dia a dia
      let saldoAcumulado = saldoReal;
      const timelineProjetada = transacoesFuturas.map(t => {
        saldoAcumulado += t.type === 'receita' ? Number(t.amount) : -Number(t.amount);
        return {
          ...t,
          saldoNoDia: saldoAcumulado
        };
      });

      setTimeline(timelineProjetada);
      setSaldoProjetado(saldoAcumulado);
    }
    
    setLoading(false);
  };

  const formatarMoeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Calculando projeções...</div>;

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
          <Link href="/fluxo" className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">Fluxo de Caixa</Link>
          <Link href="/planejamento" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Planejamento</Link>
          <Link href="/metas" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Metas</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <span className="text-sm text-slate-600">{user?.email}</span>
          <button onClick={() => { supabase.auth.signOut(); router.push("/"); }} className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-1 rounded-md transition">Sair</button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-6 mt-6">
        <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center">Projeção Futura</h2>

        {/* Card de Ponto de Partida */}
        <div className="bg-white border-2 border-blue-100 rounded-2xl p-6 mb-8 text-center shadow-sm">
          <p className="text-slate-500 font-medium mb-1">Saldo Real Hoje</p>
          <p className={`text-4xl font-extrabold ${saldoAtual >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatarMoeda(saldoAtual)}
          </p>
        </div>

        {/* Linha do Tempo */}
        <div className="relative border-l-2 border-slate-200 ml-4 md:ml-8 space-y-8 mb-8">
          {timeline.length === 0 ? (
            <div className="pl-8 text-slate-500">
              Nenhuma conta agendada para o futuro. Adicione lançamentos com datas futuras no Dashboard!
            </div>
          ) : (
            timeline.map((t, index) => (
              <div key={t.id} className="relative pl-8 md:pl-12">
                {/* Bolinha da linha do tempo */}
                <div className={`absolute -left-2.25 top-1 w-4 h-4 rounded-full border-4 border-white ${t.type === 'receita' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between gap-4 transition hover:shadow-md">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      {new Date(t.date + "T12:00:00").toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </span>
                    <p className="font-bold text-slate-800 text-lg">{t.description}</p>
                    <p className={`font-semibold ${t.type === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'receita' ? '+' : '-'} {formatarMoeda(Number(t.amount))}
                    </p>
                  </div>
                  
                  <div className="md:text-right bg-slate-50 p-3 rounded-xl border border-slate-100 self-start md:self-center">
                    <p className="text-xs font-medium text-slate-500 mb-1">Saldo no dia</p>
                    <p className={`font-bold text-lg ${t.saldoNoDia >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                      {formatarMoeda(t.saldoNoDia)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Card de Resultado Final */}
        {timeline.length > 0 && (
          <div className="bg-slate-800 text-white rounded-2xl p-6 text-center shadow-lg relative overflow-hidden mt-12">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <p className="text-slate-300 font-medium mb-1 relative z-10">Saldo Projetado Final</p>
            <p className={`text-4xl font-extrabold relative z-10 ${saldoProjetado < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {formatarMoeda(saldoProjetado)}
            </p>
            {saldoProjetado < 0 && (
              <p className="mt-4 text-sm text-red-300 font-medium relative z-10">⚠️ Atenção: Sua conta ficará negativa!</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}