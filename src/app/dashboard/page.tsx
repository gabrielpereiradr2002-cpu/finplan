"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const router = useRouter();
  
  // Estados do sistema
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Estados financeiros
  const [transactions, setTransactions] = useState<any[]>([]);
  const [resumo, setResumo] = useState({ receitas: 0, despesas: 0, saldo: 0 });

  // Estados do formulário
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("receita");
  const [salvando, setSalvando] = useState(false);

  // Carrega os dados assim que a tela abre
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    // 1. Verifica quem está logado
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }
    setUser(user);

    // 2. Busca as transações deste usuário
    const { data: transacoesBanco, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && transacoesBanco) {
      setTransactions(transacoesBanco);
      calcularResumo(transacoesBanco);
    }
    
    setLoading(false);
  };

  const calcularResumo = (transacoes: any[]) => {
    let rec = 0;
    let desp = 0;

    transacoes.forEach((t) => {
      if (t.type === "receita") rec += Number(t.amount);
      if (t.type === "despesa") desp += Number(t.amount);
    });

    setResumo({
      receitas: rec,
      despesas: desp,
      saldo: rec - desp
    });
  };

  const adicionarLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    const valorNumerico = parseFloat(valor.replace(",", "."));

    // Salva no Supabase
    const { error } = await supabase.from("transactions").insert([
      {
        user_id: user.id,
        description: descricao,
        amount: valorNumerico,
        type: tipo,
        date: new Date().toISOString().split("T")[0], // Data de hoje
      }
    ]);

    if (!error) {
      // Limpa o formulário e recarrega os dados
      setDescricao("");
      setValor("");
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

  // Formatador de Moeda (R$)
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(valor);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando painel financeiro...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Menu Superior */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-blue-600">FinPlan</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 hidden md:block">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-1 rounded-md transition">
            Sair
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 mt-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Saldo Atual</p>
            <p className={`text-3xl font-bold ${resumo.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatarMoeda(resumo.saldo)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Receitas do Mês</p>
            <p className="text-2xl font-bold text-green-600">{formatarMoeda(resumo.receitas)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Despesas do Mês</p>
            <p className="text-2xl font-bold text-red-600">{formatarMoeda(resumo.despesas)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário de Novo Lançamento */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Novo Lançamento</h3>
              <form onSubmit={adicionarLancamento} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                  <input
                    type="text"
                    required
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Ex: Salário, Aluguel..."
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTipo("receita")}
                      className={`py-2 rounded-lg font-medium text-sm transition border ${
                        tipo === "receita" ? "bg-green-100 text-green-700 border-green-200" : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipo("despesa")}
                      className={`py-2 rounded-lg font-medium text-sm transition border ${
                        tipo === "despesa" ? "bg-red-100 text-red-700 border-red-200" : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      Despesa
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salvando}
                  className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition mt-2 disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Adicionar Lançamento"}
                </button>
              </form>
            </div>
          </div>

          {/* Histórico de Transações */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Últimos Lançamentos</h3>
              
              {transactions.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  Nenhum lançamento encontrado. Comece adicionando ao lado!
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((t) => (
                    <div key={t.id} className="flex justify-between items-center p-4 hover:bg-slate-50 rounded-xl border border-slate-100 transition">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-10 rounded-full ${t.type === 'receita' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <p className="font-semibold text-slate-800">{t.description}</p>
                          <p className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
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