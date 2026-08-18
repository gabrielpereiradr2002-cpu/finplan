"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useTheme } from "next-themes"; // NOVO: Controle de tema

export default function Dashboard() {
  const router = useRouter();
  const { theme, setTheme } = useTheme(); // Puxa o tema atual
  const [mounted, setMounted] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [resumo, setResumo] = useState({ receitas: 0, despesas: 0, saldo: 0 });
  const [dadosGrafico, setDadosGrafico] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [categoriasUsuario, setCategoriasUsuario] = useState<any[]>([]);

  const [mesSelecionado, setMesSelecionado] = useState(new Date().toISOString().slice(0, 7));

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("despesa");
  const [dataLancamento, setDataLancamento] = useState(new Date().toISOString().split("T")[0]);
  const [categoria, setCategoria] = useState("");
  
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [mesesRepeticao, setMesesRepeticao] = useState(12);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    carregarDados();
  }, [mesSelecionado]);

  const carregarDados = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    setUser(user);

    const hoje = new Date().toISOString().split("T")[0];

    const { data: transacoesBanco } = await supabase.from("transactions").select("*").eq("user_id", user.id).order("date", { ascending: false });
    const { data: orcamentos } = await supabase.from("budgets").select("*").eq("user_id", user.id);
    const { data: metas } = await supabase.from("goals").select("*").eq("user_id", user.id);
    const { data: categoriasBanco } = await supabase.from("categories").select("*").eq("user_id", user.id);

    if (categoriasBanco) {
      setCategoriasUsuario(categoriasBanco);
      const categoriasDespesa = categoriasBanco.filter(c => c.type === 'despesa');
      if (categoriasDespesa.length > 0 && categoria === "") {
        setCategoria(categoriasDespesa[0].name);
      }
    }

    if (transacoesBanco) {
      let saldoGlobal = 0;
      transacoesBanco.forEach(t => {
        if (t.date <= hoje) saldoGlobal += t.type === 'receita' ? Number(t.amount) : -Number(t.amount);
      });

      const transacoesVisiveis = transacoesBanco.filter(t => t.date.startsWith(mesSelecionado) && t.date <= hoje);
      setTransactions(transacoesVisiveis);

      let recMes = 0; let despMes = 0;
      transacoesVisiveis.forEach(t => {
        if (t.type === 'receita') recMes += Number(t.amount);
        if (t.type === 'despesa') despMes += Number(t.amount);
      });

      setResumo({ receitas: recMes, despesas: despMes, saldo: saldoGlobal });
      montarDadosGrafico(transacoesVisiveis, categoriasBanco || []);
      gerarAlertas(transacoesVisiveis, orcamentos || [], metas || []);
    }
    setLoading(false);
  };

  const montarDadosGrafico = (transacoes: any[], categoriasSistema: any[]) => {
    const gastosPorCategoria: Record<string, number> = {};
    transacoes.forEach(t => {
      if (t.type === 'despesa') gastosPorCategoria[t.category] = (gastosPorCategoria[t.category] || 0) + Number(t.amount);
    });

    const dadosFormatados = Object.keys(gastosPorCategoria).map(catName => {
      const catInfo = categoriasSistema.find(c => c.name === catName && c.type === 'despesa');
      return { name: catName, value: gastosPorCategoria[catName], color: catInfo ? catInfo.color : '#94a3b8' };
    }).sort((a, b) => b.value - a.value);

    setDadosGrafico(dadosFormatados);
  };

  const gerarAlertas = (transacoesVisiveis: any[], orcamentos: any[], metas: any[]) => {
    const novosAlertas: any[] = [];
    metas.forEach(meta => {
      if (Number(meta.current_amount) >= Number(meta.target_amount)) novosAlertas.push({ icone: '🎉', mensagem: `Parabéns! Você atingiu sua meta: ${meta.title}!`, estilo: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' });
    });

    const gastosPorCategoria: Record<string, number> = {};
    transacoesVisiveis.forEach(t => {
      if (t.type === 'despesa') gastosPorCategoria[t.category] = (gastosPorCategoria[t.category] || 0) + Number(t.amount);
    });

    orcamentos.forEach(orc => {
      const gasto = gastosPorCategoria[orc.category] || 0;
      const limite = Number(orc.amount);
      const percentual = (gasto / limite) * 100;
      if (percentual > 100) novosAlertas.push({ icone: '🚨', mensagem: `No mês de ${mesSelecionado.split("-")[1]}, você estourou o limite de ${orc.category} em ${formatarMoeda(gasto - limite)}!`, estilo: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300' });
      else if (percentual >= 80) novosAlertas.push({ icone: '⚠️', mensagem: `Atenção: Você consumiu ${percentual.toFixed(0)}% do orçamento de ${orc.category} neste mês.`, estilo: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300' });
    });
    setAlertas(novosAlertas);
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20); doc.setTextColor(37, 99, 235); doc.text(`Relatorio Financeiro - FinPlan`, 14, 22);
    doc.setFontSize(11); doc.setTextColor(100, 116, 139); doc.text(`Referencia: Mes ${mesSelecionado.split("-")[1]}/${mesSelecionado.split("-")[0]}`, 14, 30);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}`, 14, 36);
    doc.setFontSize(12); doc.setTextColor(0, 0, 0); doc.text(`Resumo do Mes:`, 14, 48);
    doc.setFontSize(11); doc.setTextColor(22, 163, 74); doc.text(`(+) Receitas: ${formatarMoeda(resumo.receitas)}`, 14, 56);
    doc.setTextColor(220, 38, 38); doc.text(`(-) Despesas: ${formatarMoeda(resumo.despesas)}`, 14, 64);
    doc.setTextColor(30, 41, 59); doc.text(`(=) Saldo Global Atual: ${formatarMoeda(resumo.saldo)}`, 14, 72);

    const tableColumn = ["Data", "Descricao", "Categoria", "Tipo", "Valor"];
    const tableRows: any[] = [];
    transactions.forEach(t => {
      tableRows.push([new Date(t.date + "T12:00:00").toLocaleDateString('pt-BR'), t.description, t.category || "-", t.type === 'receita' ? 'Receita' : 'Despesa', formatarMoeda(t.amount)]);
    });

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 82, theme: 'grid', styles: { fontSize: 10, cellPadding: 3 }, headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] }, alternateRowStyles: { fillColor: [248, 250, 252] } });
    doc.save(`FinPlan_Relatorio_${mesSelecionado}.pdf`);
  };

  const mudarTipoEAtualizarCategoria = (novoTipo: string) => {
    setTipo(novoTipo);
    const catsFiltradas = categoriasUsuario.filter(c => c.type === novoTipo);
    if (catsFiltradas.length > 0) setCategoria(catsFiltradas[0].name);
    else setCategoria("");
  };

  const salvarLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoria) return alert("Por favor, crie uma categoria na tela de Categorias primeiro!");
    setSalvando(true);
    const valorNumerico = parseFloat(valor.toString().replace(",", "."));

    if (editandoId) {
      const { error } = await supabase.from("transactions").update({ description: descricao, amount: valorNumerico, type: tipo, category: categoria, date: dataLancamento }).eq("id", editandoId);
      if (!error) { limparFormulario(); carregarDados(); }
    } else {
      const transacoesParaInserir = [];
      let dataAtual = new Date(dataLancamento + "T12:00:00");
      const repeticoes = isRecorrente ? mesesRepeticao : 1;
      for (let i = 0; i < repeticoes; i++) {
        transacoesParaInserir.push({ user_id: user.id, description: isRecorrente ? `${descricao} (${i + 1}/${repeticoes})` : descricao, amount: valorNumerico, type: tipo, category: categoria, date: dataAtual.toISOString().split("T")[0], is_recurring: isRecorrente });
        dataAtual.setMonth(dataAtual.getMonth() + 1);
      }
      const { error } = await supabase.from("transactions").insert(transacoesParaInserir);
      if (!error) { limparFormulario(); carregarDados(); }
    }
    setSalvando(false);
  };

  const iniciarEdicao = (t: any) => {
    setEditandoId(t.id); setDescricao(t.description); setValor(t.amount.toString());
    setTipo(t.type); setCategoria(t.category || ""); setDataLancamento(t.date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const limparFormulario = () => {
    setEditandoId(null); setDescricao(""); setValor(""); setIsRecorrente(false); setMesesRepeticao(12); setDataLancamento(new Date().toISOString().split("T")[0]);
    const categoriasDespesa = categoriasUsuario.filter(c => c.type === 'despesa');
    if (categoriasDespesa.length > 0) setCategoria(categoriasDespesa[0].name);
  };

  const excluirLancamento = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este lançamento?")) {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (!error) carregarDados();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const formatarMoeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const categoriasDoTipoSelecionado = categoriasUsuario.filter(c => c.type === tipo);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 dark:text-white">Carregando painel...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 transition-colors duration-300">
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row justify-between sticky top-0 z-10 gap-3 md:gap-0 transition-colors duration-300">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">FinPlan</h1>
          <button onClick={handleLogout} className="md:hidden text-sm font-medium text-red-600 dark:text-red-400">Sair</button>
        </div>
        
        <div className="flex w-full md:w-auto gap-4 overflow-x-auto whitespace-nowrap pb-1 md:pb-0 hide-scrollbar">
          <Link href="/dashboard" className="text-sm font-semibold text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 pb-1">Visão Geral</Link>
          <Link href="/fluxo" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition pb-1">Fluxo de Caixa</Link>
          <Link href="/planejamento" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition pb-1">Planejamento</Link>
          <Link href="/simulador" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition pb-1">Simulador</Link>
          <Link href="/metas" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition pb-1">Metas</Link>
          <Link href="/categorias" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition pb-1">Categorias</Link>
          <Link href="/perfil" className="md:hidden text-sm font-medium text-slate-500 dark:text-slate-400 transition pb-1">Meu Perfil</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          {/* BOTAO LUA / SOL */}
          {mounted && (
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
              title="Alternar tema"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          )}

          <Link href="/perfil" className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-slate-600 transition flex items-center gap-2 shadow-sm">
            👤 {user?.user_metadata?.full_name || user?.email}
          </Link>
          <button onClick={handleLogout} className="text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1 rounded-md transition">Sair</button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 md:p-6 mt-4 md:mt-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Seu Resumo</h2>
          
          <div className="flex items-center gap-3">
            <button onClick={exportarPDF} className="flex items-center gap-2 bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-slate-900 dark:hover:bg-slate-600 transition shadow-sm">📄 Exportar PDF</button>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition">
              <span className="text-xl">📅</span>
              <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 hidden md:block">Filtrar mês:</label>
              <input type="month" value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)} className="bg-transparent border-none outline-none font-bold text-blue-600 dark:text-blue-400 cursor-pointer w-[120px]" color-scheme={theme} />
            </div>
          </div>
        </div>

        {alertas.length > 0 && (
          <div className="mb-6 space-y-3">
            {alertas.map((alerta, index) => (
              <div key={index} className={`flex items-center gap-3 p-4 rounded-xl border shadow-sm ${alerta.estilo}`}>
                <span className="text-2xl">{alerta.icone}</span>
                <p className="font-semibold">{alerta.mensagem}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Saldo Conta (Geral)</p>
            <p className={`text-3xl font-bold ${resumo.saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>{formatarMoeda(resumo.saldo)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Receitas do Mês</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatarMoeda(resumo.receitas)}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Despesas do Mês</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatarMoeda(resumo.despesas)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className={`p-6 rounded-2xl shadow-sm border sticky top-24 transition-colors ${editandoId ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-bold ${editandoId ? 'text-amber-800 dark:text-amber-400' : 'text-slate-800 dark:text-white'}`}>{editandoId ? '✏️ Editando' : 'Novo Lançamento'}</h3>
                {editandoId && <button onClick={limparFormulario} className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">CANCELAR</button>}
              </div>

              <form onSubmit={salvarLancamento} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                  <input type="text" required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Salário, Netflix..." className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-600 outline-none bg-white dark:bg-slate-700 dark:text-white" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-600 outline-none bg-white dark:bg-slate-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                    <input type="date" required value={dataLancamento} onChange={(e) => setDataLancamento(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-600 outline-none bg-white dark:bg-slate-700 dark:text-white" style={{ colorScheme: theme }} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => mudarTipoEAtualizarCategoria("receita")} className={`py-2 rounded-lg font-medium text-sm transition border ${tipo === "receita" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800" : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"}`}>Receita</button>
                    <button type="button" onClick={() => mudarTipoEAtualizarCategoria("despesa")} className={`py-2 rounded-lg font-medium text-sm transition border ${tipo === "despesa" ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600"}`}>Despesa</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 mt-2 flex justify-between">
                    Categoria
                    {categoriasDoTipoSelecionado.length === 0 && <Link href="/categorias" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Criar nova</Link>}
                  </label>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} required className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-600 outline-none bg-white dark:bg-slate-700 dark:text-white">
                    {categoriasDoTipoSelecionado.length === 0 ? (
                      <option value="" disabled>Nenhuma categoria</option>
                    ) : (
                      categoriasDoTipoSelecionado.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)
                    )}
                  </select>
                </div>

                {!editandoId && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 mt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isRecorrente} onChange={(e) => setIsRecorrente(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Lançamento recorrente/parcelado</span>
                    </label>
                    {isRecorrente && (
                      <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50">
                        <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Por quantos meses?</label>
                        <input type="number" min="2" max="60" value={mesesRepeticao} onChange={(e) => setMesesRepeticao(Number(e.target.value))} className="w-full px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 dark:text-white text-sm outline-none focus:border-blue-400" />
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" disabled={salvando} className={`w-full text-white font-semibold py-3 rounded-lg transition mt-4 shadow-sm ${editandoId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {salvando ? "Salvando..." : (editandoId ? "Atualizar" : "Adicionar")}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-8">
            {dadosGrafico.length > 0 && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Onde seu dinheiro foi parar</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dadosGrafico} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                        {dadosGrafico.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatarMoeda(Number(value))} contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', color: theme === 'dark' ? '#fff' : '#000' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Lançamentos do Mês</h3>
              {transactions.length === 0 ? (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400">Nenhum lançamento neste mês.</div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((t) => {
                    const corCat = categoriasUsuario.find(c => c.name === t.category && c.type === t.type)?.color || '#cbd5e1';
                    return (
                      <div key={t.id} className="flex justify-between items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 transition group">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-10 rounded-full ${t.type === 'receita' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{t.description}</p>
                              {t.is_recurring && <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Recorrente</span>}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: corCat }}></div>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{new Date(t.date + "T12:00:00").toLocaleDateString('pt-BR')} {t.category && ` • ${t.category}`}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <p className={`font-bold ${t.type === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {t.type === 'receita' ? '+' : '-'}{formatarMoeda(t.amount)}
                          </p>
                          <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => iniciarEdicao(t)} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition" title="Editar">✏️</button>
                            <button onClick={() => excluirLancamento(t.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition" title="Excluir">🗑️</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}