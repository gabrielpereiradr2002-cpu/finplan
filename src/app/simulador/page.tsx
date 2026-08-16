"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function Simulador() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // ADICIONE ISSO AQUI:
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // ... resto do seu código
  const [sobraMensal, setSobraMensal] = useState(0);

  // Estados do formulário
  const [nomeItem, setNomeItem] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [entrada, setEntrada] = useState("");
  const [parcelas, setParcelas] = useState(1);

  // Estados do resultado
  const [resultado, setResultado] = useState<any>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    setUser(user);

    // Busca as transações sem filtro de texto, igual fazemos no Dashboard
    const { data: transacoes } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id);

    if (transacoes) {
      let rec = 0; 
      let desp = 0;
      
      // Lê apenas até a data de hoje para ser fiel à realidade da sua conta bancária
      const hoje = new Date().toISOString().split("T")[0];
      
      transacoes.forEach(t => {
        if (t.date <= hoje) {
          if (t.type === 'receita') rec += Number(t.amount);
          if (t.type === 'despesa') desp += Number(t.amount);
        }
      });
      
      // Define a sobra como o seu Saldo Real Atual
      setSobraMensal(rec - desp);
    }
    
    setLoading(false);
  };
  
  const simularCompra = (e: React.FormEvent) => {
    e.preventDefault();
    
    const vTotal = parseFloat(valorTotal.replace(",", ".")) || 0;
    const vEntrada = parseFloat(entrada.replace(",", ".")) || 0;
    const numParcelas = Number(parcelas) || 1;

    const valorFinanciado = vTotal - vEntrada;
    const valorParcela = valorFinanciado / numParcelas;

    const percentualImpacto = sobraMensal > 0 ? (valorParcela / sobraMensal) * 100 : 100;

    let cor = "bg-green-500";
    let status = "Compra Aprovada";
    let mensagem = "Seguro! O valor da parcela cabe confortavelmente na sua sobra mensal.";
    
    if (sobraMensal <= 0) {
      cor = "bg-red-600";
      status = "Perigo Máximo";
      mensagem = "Você não tem dinheiro sobrando este mês. Assumir essa dívida agora vai te jogar no vermelho.";
    } else if (valorParcela > sobraMensal) {
      cor = "bg-red-600";
      status = "Compra Inviável";
      mensagem = `A parcela de ${formatarMoeda(valorParcela)} é maior que sua sobra atual (${formatarMoeda(sobraMensal)}).`;
    } else if (percentualImpacto > 60) {
      cor = "bg-orange-500";
      status = "Risco Alto";
      mensagem = `Essa parcela vai engolir ${percentualImpacto.toFixed(0)}% de todo o seu dinheiro livre. Se houver qualquer imprevisto médico ou de carro, você não terá como pagar.`;
    } else if (percentualImpacto > 30) {
      cor = "bg-yellow-500";
      status = "Atenção Necessária";
      mensagem = `Isso vai comprometer ${percentualImpacto.toFixed(0)}% da sua sobra pelos próximos ${numParcelas} meses. Dá para pagar, mas exige disciplina.`;
    }

    setResultado({ valorParcela, percentualImpacto, status, mensagem, cor });
  };

  const formatarMoeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando inteligência financeira...</div>;

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
          <Link href="/planejamento" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Planejamento</Link>
          {/* AQUI ESTÁ O BOTÃO NOVO DO SIMULADOR */}
          <Link href="/simulador" className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">Simulador</Link>
          <Link href="/metas" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Metas</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <span className="text-sm text-slate-600">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-1 rounded-md transition">Sair</button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 mt-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-800">Posso Comprar Isso?</h2>
          <p className="text-slate-500 mt-2">Simule o impacto de novas compras ou dívidas no seu orçamento atual.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Coluna 1: Formulário */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
            <div className="mb-6 pb-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-500">Sobra Disponível Hoje</p>
                <p className={`text-2xl font-bold ${sobraMensal > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatarMoeda(sobraMensal)}
                </p>
              </div>
            </div>

            <form onSubmit={simularCompra} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">O que você quer comprar?</label>
                <input type="text" required value={nomeItem} onChange={(e) => setNomeItem(e.target.value)} placeholder="Ex: iPhone 15, Moto, Viagem..." className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor Total (R$)</label>
                <input type="number" step="0.01" required value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} placeholder="0.00" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Entrada (R$)</label>
                  <input type="number" step="0.01" value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="0.00 (opcional)" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parcelas</label>
                  <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none bg-white">
                    {[1, 2, 3, 4, 5, 6, 10, 12, 24, 36, 48].map(n => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-slate-800 text-white font-semibold py-3 rounded-lg hover:bg-slate-900 transition mt-4 shadow-sm">
                Analisar Compra
              </button>
            </form>
          </div>

          {/* Coluna 2: O Veredito */}
          <div>
            {!resultado ? (
              <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 text-2xl">🤖</div>
                <h3 className="font-bold text-slate-800 text-lg mb-2">Aguardando dados...</h3>
                <p className="text-slate-500 text-sm">Preencha os dados ao lado para o assistente calcular o risco da compra.</p>
              </div>
            ) : (
              <div className={`rounded-2xl p-6 h-full text-white shadow-lg flex flex-col justify-between transition-all ${resultado.cor}`}>
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="font-extrabold text-2xl">{resultado.status}</h3>
                  </div>
                  
                  <div className="bg-white/10 rounded-xl p-4 mb-6">
                    <p className="text-sm font-medium opacity-90 mb-1">Impacto no seu mês</p>
                    <p className="text-4xl font-black mb-1">{formatarMoeda(resultado.valorParcela)}<span className="text-lg font-medium opacity-80">/mês</span></p>
                    <p className="text-sm font-medium">Isso equivale a {resultado.percentualImpacto.toFixed(1)}% do seu dinheiro livre hoje.</p>
                  </div>
                  
                  <p className="font-medium text-lg leading-relaxed shadow-sm bg-black/10 p-4 rounded-xl">
                    {resultado.mensagem}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}