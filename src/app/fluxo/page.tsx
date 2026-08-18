"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FluxoDeCaixa() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dadosGrafico, setDadosGrafico] = useState<any[]>([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    setUser(user);

    const { data: transacoes } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (transacoes) {
      // Projeta o saldo para os próximos 6 meses
      const dadosProjetados = [];
      let saldoAtual = 0;
      const hoje = new Date();
      
      for (let i = 0; i < 6; i++) {
        const dataReferencia = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
        const mesChave = dataReferencia.toISOString().slice(0, 7);
        
        let saldoMes = saldoAtual;
        transacoes.forEach(t => {
          if (t.date.startsWith(mesChave)) {
            saldoMes += t.type === 'receita' ? Number(t.amount) : -Number(t.amount);
          }
        });
        
        dadosProjetados.push({
          name: mesChave,
          saldo: saldoMes
        });
        saldoAtual = saldoMes;
      }
      setDadosGrafico(dadosProjetados);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const formatarMoeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Calculando projeção...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      
      {/* MENU CORRIGIDO COM SCROLL INVISÍVEL NO MOBILE (hide-scrollbar) */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row justify-between sticky top-0 z-10 gap-3 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-2xl font-bold text-blue-600">FinPlan</h1>
          <button onClick={handleLogout} className="md:hidden text-sm font-medium text-red-600">Sair</button>
        </div>
        
        {/* APLICAMOS AQUI A CLASSE hide-scrollbar */}
        <div className="flex w-full md:w-auto gap-4 overflow-x-auto whitespace-nowrap pb-1 md:pb-0 hide-scrollbar">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Visão Geral</Link>
          <Link href="/fluxo" className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">Fluxo de Caixa</Link>
          <Link href="/planejamento" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Planejamento</Link>
          <Link href="/simulador" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Simulador</Link>
          <Link href="/metas" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Metas</Link>
          <Link href="/categorias" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Categorias</Link>
          <Link href="/perfil" className="md:hidden text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Meu Perfil</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/perfil" className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent transition flex items-center gap-2 shadow-sm">
            👤 {user?.user_metadata?.full_name || user?.email}
          </Link>
          <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-1 rounded-md transition">Sair</button>
        </div>
      </nav>

      {/* AJUSTE DE PADDING NO MOBILE (p-4) vs PC (p-6) */}
      <main className="max-w-4xl mx-auto p-4 md:p-6 mt-4 md:mt-6">
        <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 text-center md:text-left">
            Projeção de Saldo (6 meses)
          </h2>
          
          {/* GRÁFICO RESPONSIVO */}
          <div className="h-64 md:h-80 w-full -ml-4 md:ml-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosGrafico} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(value) => `R$${value}`} />
                <Tooltip formatter={(value: any) => formatarMoeda(Number(value))} />
                <Area type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <p className="text-slate-400 text-xs md:text-sm mt-6 text-center">
            *Esta projeção considera seus lançamentos recorrentes e o saldo atual acumulado.
          </p>
        </div>
      </main>
    </div>
  );
}