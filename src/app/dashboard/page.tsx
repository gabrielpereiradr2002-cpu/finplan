"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [resumo, setResumo] = useState({ receitas: 0, despesas: 0, saldo: 0 });

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("receita");
  const [dataLancamento, setDataLancamento] = useState(new Date().toISOString().split("T")[0]);
  const [categoria, setCategoria] = useState("Outros");
  const categoriasPadrao = ["Moradia", "Alimentação", "Transporte", "Lazer", "Saúde", "Dívidas", "Investimentos", "Outros"];
  
  // NOVOS ESTADOS PARA RECORRÊNCIA
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [mesesRepeticao, setMesesRepeticao] = useState(12); // Padrão: repete por 1 ano

  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    setUser(user);

    const { data: transacoesBanco, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (!error && transacoesBanco) {
      setTransactions(transacoesBanco);
      
      const hoje = new Date().toISOString().split("T")[0];
      const transacoesRealizadas = transacoesBanco.filter(t => t.date <= hoje);
      calcularResumo(transacoesRealizadas);
    }
    
    setLoading(false);
  };

  const calcularResumo = (transacoes: any[]) => {
    let rec = 0; let desp = 0;
    transacoes.forEach((t) => {
      if (t.type === "receita") rec += Number(t.amount);
      if (t.type === "despesa") desp += Number(t.amount);
    });
    setResumo({ receitas: rec, despesas: desp, saldo: rec - desp });
  };

  // A MÁGICA DA RECORRÊNCIA ACONTECE AQUI
  const adicionarLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    const valorNumerico = parseFloat(valor.replace(",", "."));
    const transacoesParaInserir = [];
    
    // Pega a data base escolhida pelo usuário
    let dataAtual = new Date(dataLancamento + "T12:00:00"); // Força o fuso horário para evitar bugs de dia anterior

    // Define quantas vezes o laço vai rodar (1 vez se for normal, ou X vezes se for recorrente)
    const repeticoes = isRecorrente ? mesesRepeticao : 1;

    for (let i = 0; i < repeticoes; i++) {
      transacoesParaInserir.push({
        user_id: user.id,
        // Se for recorrente, adiciona a tag (1/12) na frente do nome
        description: isRecorrente ? `${descricao} (${i + 1}/${repeticoes})` : descricao,
        amount: valorNumerico,
        type: tipo,
        category: tipo === 'despesa' ? categoria : 'Renda',
        // Converte a data de volta para o formato YYYY-MM-DD
        date: dataAtual.toISOString().split("T")[0],
        is_recurring: isRecorrente
      });

      // Pula para o próximo mês para a próxima repetição do laço
      dataAtual.setMonth(dataAtual.getMonth() + 1);
    }

    // O Supabase consegue salvar dezenas de transações de uma só vez (Bulk Insert)
    const { error } = await supabase.from("transactions").insert(transacoesParaInserir);

    if (!error) {
      setDescricao(""); 
      setValor("");
      setIsRecorrente(false);
      setMesesRepeticao(12);
      setDataLancamento(new Date().toISOString().split("T")[0]);
      carregarDados();
    } else {
      alert("Erro ao salvar: " + error.message);
    }
    
    setSalvando(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const formatarMoeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando painel...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Menu Superior Responsivo */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row justify-between sticky top-0 z-10 gap-3 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-2xl font-bold text-blue-600">FinPlan</h1>
          <button onClick={handleLogout} className="md:hidden text-sm font-medium text-red-600">Sair</button>
        </div>
        
        <div className="flex w-full md:w-auto gap-4 overflow-x-auto whitespace-nowrap pb-1 md:pb-0">
          <Link href="/dashboard" className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">Visão Geral</Link>
          <Link href="/fluxo" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Fluxo de Caixa</Link>
          <Link href="/planejamento" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Planejamento</Link>
          <Link href="/metas" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Metas</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <span className="text-sm text-slate-600">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-1 rounded-md transition">Sair</button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Saldo Real Atual</p>
            <p className={`text-3xl font-bold ${resumo.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatarMoeda(resumo.saldo)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Receitas Realizadas</p>
            <p className="text-2xl font-bold text-green-600">{formatarMoeda(resumo.receitas)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Despesas Pagas</p>
            <p className="text-2xl font-bold text-red-600">{formatarMoeda(resumo.despesas)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* FORMULÁRIO */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Novo Lançamento</h3>
              <form onSubmit={adicionarLancamento} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                  <input type="text" required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Salário, Netflix..." className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                    <input type="date" required value={dataLancamento} onChange={(e) => setDataLancamento(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setTipo("receita")} className={`py-2 rounded-lg font-medium text-sm transition border ${tipo === "receita" ? "bg-green-100 text-green-700 border-green-200" : "bg-white text-slate-600 border-slate-200"}`}>Receita</button>
                    <button type="button" onClick={() => setTipo("despesa")} className={`py-2 rounded-lg font-medium text-sm transition border ${tipo === "despesa" ? "bg-red-100 text-red-700 border-red-200" : "bg-white text-slate-600 border-slate-200"}`}>Despesa</button>
                  </div>
                </div>

                {tipo === "despesa" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 mt-2">Categoria</label>
                    <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none bg-white">
                      {categoriasPadrao.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                )}

                {/* CHECKBOX DE RECORRÊNCIA */}
                <div className="pt-2 border-t border-slate-100 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isRecorrente}
                      onChange={(e) => setIsRecorrente(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600"
                    />
                    <span className="text-sm font-medium text-slate-700">Lançamento recorrente/parcelado</span>
                  </label>

                  {isRecorrente && (
                    <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <label className="block text-xs font-semibold text-blue-800 mb-1">Por quantos meses?</label>
                      <input 
                        type="number" 
                        min="2" max="60"
                        value={mesesRepeticao} 
                        onChange={(e) => setMesesRepeticao(Number(e.target.value))} 
                        className="w-full px-3 py-1.5 rounded-md border border-blue-200 text-sm outline-none focus:border-blue-400" 
                      />
                      <p className="text-xs text-blue-600 mt-2">Isto preencherá o seu Fluxo de Caixa para os próximos {mesesRepeticao} meses automaticamente.</p>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={salvando} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition mt-4 disabled:opacity-50 shadow-sm">
                  {salvando ? "Salvando..." : "Adicionar Lançamento"}
                </button>
              </form>
            </div>
          </div>

          {/* LISTA DE LANÇAMENTOS */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Últimos Lançamentos</h3>
              {transactions.length === 0 ? (
                <div className="text-center py-10 text-slate-500">Nenhum lançamento encontrado.</div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 15).map((t) => ( // Mostra apenas os 15 mais recentes aqui
                    <div key={t.id} className="flex justify-between items-center p-4 hover:bg-slate-50 rounded-xl border border-slate-100 transition">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-10 rounded-full ${t.type === 'receita' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800">{t.description}</p>
                            {t.is_recurring && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Recorrente</span>}
                          </div>
                          <p className="text-xs font-medium text-slate-500">
                            {new Date(t.date + "T12:00:00").toLocaleDateString('pt-BR')} 
                            {t.category && ` • ${t.category}`}
                          </p>
                        </div>
                      </div>
                      <p className={`font-bold ${t.type === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'receita' ? '+' : '-'}{formatarMoeda(t.amount)}
                      </p>
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