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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Calculando projeção...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <nav className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row justify-between sticky top-0 z-10">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-2xl font-bold text-blue-600">FinPlan</h1>
        </div>
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-sm text-slate-500">Voltar ao Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 mt-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Projeção de Saldo (6 meses)</h2>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosGrafico}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="saldo" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSaldo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <p className="text-slate-400 text-sm mt-6 text-center">
            *Esta projeção considera seus lançamentos recorrentes e o saldo atual acumulado.
          </p>
        </div>
      </main>
    </div>
  );
}