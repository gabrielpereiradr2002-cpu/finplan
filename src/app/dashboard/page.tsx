"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Dashboard() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [resumo, setResumo] = useState({ receitas: 0, despesas: 0, saldo: 0 });
  const [dadosGrafico, setDadosGrafico] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);

  // NOVO: Estado para guardar as categorias que vêm do banco de dados
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
    carregarDados();
  }, [mesSelecionado]);

  const carregarDados = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    setUser(user);

    const hoje = new Date().toISOString().split("T")[0];

    // Busca TUDO: Transações, Orçamentos, Metas e CATEGORIAS
    const { data: transacoesBanco } = await supabase.from("transactions").select("*").eq("user_id", user.id).order("date", { ascending: false });
    const { data: orcamentos } = await supabase.from("budgets").select("*").eq("user_id", user.id);
    const { data: metas } = await supabase.from("goals").select("*").eq("user_id", user.id);
    
    // MÁGICA: Busca as categorias do usuário
    const { data: categoriasBanco } = await supabase.from("categories").select("*").eq("user_id", user.id);

    // Salva as categorias e seleciona a primeira como padrão no formulário
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
      
      // Passa a lista de categorias para o gráfico usar as cores certas!
      montarDadosGrafico(transacoesVisiveis, categoriasBanco || []);
      gerarAlertas(transacoesVisiveis, orcamentos || [], metas || []);
    }
    setLoading(false);
  };

  // MÁGICA 2: O gráfico agora usa as cores personalizadas que o usuário escolheu!
  const montarDadosGrafico = (transacoes: any[], categoriasSistema: any[]) => {
    const gastosPorCategoria: Record<string, number> = {};
    
    transacoes.forEach(t => {
      if (t.type === 'despesa') gastosPorCategoria[t.category] = (gastosPorCategoria[t.category] || 0) + Number(t.amount);
    });

    const dadosFormatados = Object.keys(gastosPorCategoria).map(catName => {
      // Procura a cor da categoria no banco. Se não achar, usa um cinza padrão.
      const catInfo = categoriasSistema.find(c => c.name === catName && c.type === 'despesa');
      return { 
        name: catName, 
        value: gastosPorCategoria[catName],
        color: catInfo ? catInfo.color : '#94a3b8' 
      };
    }).sort((a, b) => b.value - a.value);

    setDadosGrafico(dadosFormatados);
  };

  const gerarAlertas = (transacoesVisiveis: any[], orcamentos: any[], metas: any[]) => {
    const novosAlertas: any[] = [];
    metas.forEach(meta => {
      if (Number(meta.current_amount) >= Number(meta.target_amount)) novosAlertas.push({ icone: '🎉', mensagem: `Parabéns! Você atingiu sua meta: ${meta.title}!`, estilo: 'bg-green-50 border-green-200 text-green-800' });
    });

    const gastosPorCategoria: Record<string, number> = {};
    transacoesVisiveis.forEach(t => {
      if (t.type === 'despesa') gastosPorCategoria[t.category] = (gastosPorCategoria[t.category] || 0) + Number(t.amount);
    });

    orcamentos.forEach(orc => {
      const gasto = gastosPorCategoria[orc.category] || 0;
      const limite = Number(orc.amount);
      const percentual = (gasto / limite) * 100;
      if (percentual > 100) novosAlertas.push({ icone: '🚨', mensagem: `No mês de ${mesSelecionado.split("-")[1]}, você estourou o limite de ${orc.category} em ${formatarMoeda(gasto - limite)}!`, estilo: 'bg-red-50 border-red-200 text-red-800' });
      else if (percentual >= 80) novosAlertas.push({ icone: '⚠️', mensagem: `Atenção: Você consumiu ${percentual.toFixed(0)}% do orçamento de ${orc.category} neste mês.`, estilo: 'bg-yellow-50 border-yellow-200 text-yellow-800' });
    });
    setAlertas(novosAlertas);
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20); doc.setTextColor(37, 99, 235); doc.text(`Relatório Financeiro - FinPlan`, 14, 22);
    doc.setFontSize(11); doc.setTextColor(100, 116, 139); doc.text(`Referência: Mês ${mesSelecionado.split("-")[1]}/${mesSelecionado.split("-")[0]}`, 14, 30);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 36);
    doc.setFontSize(12); doc.setTextColor(0, 0, 0); doc.text(`Resumo do Mês:`, 14, 48);
    doc.setFontSize(11); doc.setTextColor(22, 163, 74); doc.text(`(+) Receitas: ${formatarMoeda(resumo.receitas)}`, 14, 56);
    doc.setTextColor(220, 38, 38); doc.text(`(-) Despesas: ${formatarMoeda(resumo.despesas)}`, 14, 64);
    doc.setTextColor(30, 41, 59); doc.text(`(=) Saldo Global Atual: ${formatarMoeda(resumo.saldo)}`, 14, 72);

    const tableColumn = ["Data", "Descrição", "Categoria", "Tipo", "Valor"];
    const tableRows: any[] = [];
    transactions.forEach(t => {
      tableRows.push([new Date(t.date + "T12:00:00").toLocaleDateString('pt-BR'), t.description, t.category || "-", t.type === 'receita' ? 'Receita' : 'Despesa', formatarMoeda(t.amount)]);
    });

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 82, theme: 'grid', styles: { fontSize: 10, cellPadding: 3 }, headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] }, alternateRowStyles: { fillColor: [248, 250, 252] } });
    doc.save(`FinPlan_Relatorio_${mesSelecionado}.pdf`);
  };

  const mudarTipoEAtualizarCategoria = (novoTipo: string) => {
    setTipo(novoTipo);
    // Ao mudar entre Receita/Despesa, seleciona a primeira categoria disponível daquele tipo
    const catsFiltradas = categoriasUsuario.filter(c => c.type === novoTipo);
    if (catsFiltradas.length > 0) {
      setCategoria(catsFiltradas[0].name);
    } else {
      setCategoria(""); // Se não tiver, fica vazio
    }
  };

  const salvarLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoria) {
      return alert("Por favor, crie uma categoria na tela de Categorias primeiro!");
    }
    
    setSalvando(true);
    const valorNumerico = parseFloat(valor.toString().replace(",", "."));

    if (editandoId) {
      const { error } = await supabase.from("transactions").update({
        description: descricao, amount: valorNumerico, type: tipo,
        category: categoria, date: dataLancamento // Usa a categoria selecionada!
      }).eq("id", editandoId);
      if (!error) { limparFormulario(); carregarDados(); }
    } else {
      const transacoesParaInserir = [];
      let dataAtual = new Date(dataLancamento + "T12:00:00");
      const repeticoes = isRecorrente ? mesesRepeticao : 1;

      for (let i = 0; i < repeticoes; i++) {
        transacoesParaInserir.push({
          user_id: user.id, description: isRecorrente ? `${descricao} (${i + 1}/${repeticoes})` : descricao,
          amount: valorNumerico, type: tipo, category: categoria, // Usa a categoria selecionada!
          date: dataAtual.toISOString().split("T")[0], is_recurring: isRecorrente
        });
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
    setEditandoId(null); setDescricao(""); setValor(""); setIsRecorrente(false);
    setMesesRepeticao(12); setDataLancamento(new Date().toISOString().split("T")[0]);
    // Reseta para a primeira categoria de despesa
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

  // Filtra as categorias dinâmicas pro select do formulário
  const categoriasDoTipoSelecionado = categoriasUsuario.filter(c => c.type === tipo);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregando painel...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <nav className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row justify-between sticky top-0 z-10 gap-3 md:gap-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-2xl font-bold text-blue-600">FinPlan</h1>
          <button onClick={handleLogout} className="md:hidden text-sm font-medium text-red-600">Sair</button>
        </div>
        
        <div className="flex w-full md:w-auto gap-4 overflow-x-auto whitespace-nowrap pb-1 md:pb-0">
          <Link href="/dashboard" className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">Visão Geral</Link>
          <Link href="/fluxo" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition pb-1">Fluxo de Caixa</Link>
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

      <main className="max-w-5xl mx-auto p-6 mt-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-slate-800">Seu Resumo</h2>
          
          <div className="flex items-center gap-3">
            <button onClick={exportarPDF} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-slate-900 transition shadow-sm" title="Baixar relatório deste mês">📄 Exportar PDF</button>
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition hover:shadow-md cursor-pointer">
              <span className="text-xl">📅</span>
              <label className="text-sm font-semibold text-slate-500 hidden md:block">Filtrar mês:</label>
              <input type="month" value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)} className="bg-transparent border-none outline-none font-bold text-blue-600 cursor-pointer w-30" />
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Saldo Conta (Geral)</p>
            <p className={`text-3xl font-bold ${resumo.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatarMoeda(resumo.saldo)}</p>
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
          <div className="lg:col-span-1">
            <div className={`p-6 rounded-2xl shadow-sm border sticky top-24 transition-colors ${editandoId ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-bold ${editandoId ? 'text-amber-800' : 'text-slate-800'}`}>{editandoId ? '✏️ Editando Lançamento' : 'Novo Lançamento'}</h3>
                {editandoId && <button onClick={limparFormulario} className="text-xs font-bold text-slate-500 hover:text-slate-800">CANCELAR</button>}
              </div>

              <form onSubmit={salvarLancamento} className="space-y-4">
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
                    <button type="button" onClick={() => mudarTipoEAtualizarCategoria("receita")} className={`py-2 rounded-lg font-medium text-sm transition border ${tipo === "receita" ? "bg-green-100 text-green-700 border-green-200" : "bg-white text-slate-600 border-slate-200"}`}>Receita</button>
                    <button type="button" onClick={() => mudarTipoEAtualizarCategoria("despesa")} className={`py-2 rounded-lg font-medium text-sm transition border ${tipo === "despesa" ? "bg-red-100 text-red-700 border-red-200" : "bg-white text-slate-600 border-slate-200"}`}>Despesa</button>
                  </div>
                </div>

                {/* CAMPO DE CATEGORIA DINÂMICA */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 mt-2 justify-between">
                    Categoria
                    {categoriasDoTipoSelecionado.length === 0 && <Link href="/categorias" className="text-xs text-blue-600 hover:underline">Criar nova</Link>}
                  </label>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} required className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none bg-white">
                    {categoriasDoTipoSelecionado.length === 0 ? (
                      <option value="" disabled>Nenhuma categoria criada</option>
                    ) : (
                      categoriasDoTipoSelecionado.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)
                    )}
                  </select>
                </div>

                {!editandoId && (
                  <div className="pt-2 border-t border-slate-100 mt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isRecorrente} onChange={(e) => setIsRecorrente(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600" />
                      <span className="text-sm font-medium text-slate-700">Lançamento recorrente/parcelado</span>
                    </label>

                    {isRecorrente && (
                      <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <label className="block text-xs font-semibold text-blue-800 mb-1">Por quantos meses?</label>
                        <input type="number" min="2" max="60" value={mesesRepeticao} onChange={(e) => setMesesRepeticao(Number(e.target.value))} className="w-full px-3 py-1.5 rounded-md border border-blue-200 text-sm outline-none focus:border-blue-400" />
                      </div>
                    )}
                  </div>
                )}

                <button type="submit" disabled={salvando} className={`w-full text-white font-semibold py-3 rounded-lg transition mt-4 disabled:opacity-50 shadow-sm ${editandoId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {salvando ? "Salvando..." : (editandoId ? "Atualizar Lançamento" : "Adicionar Lançamento")}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-8">
            {dadosGrafico.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Onde seu dinheiro foi parar</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dadosGrafico} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                        {/* A cor agora vem de data.color, que pegamos do banco! */}
                        {dadosGrafico.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatarMoeda(Number(value))} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Lançamentos do Mês</h3>
              {transactions.length === 0 ? (
                <div className="text-center py-10 text-slate-500">Nenhum lançamento neste mês.</div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((t) => {
                    // Busca a cor da categoria para colocar no pontinho!
                    const corCat = categoriasUsuario.find(c => c.name === t.category && c.type === t.type)?.color || '#cbd5e1';

                    return (
                      <div key={t.id} className="flex justify-between items-center p-4 hover:bg-slate-50 rounded-xl border border-slate-100 transition group">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-10 rounded-full ${t.type === 'receita' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-800">{t.description}</p>
                              {t.is_recurring && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Recorrente</span>}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: corCat }}></div>
                              <p className="text-xs font-medium text-slate-500">{new Date(t.date + "T12:00:00").toLocaleDateString('pt-BR')} {t.category && ` • ${t.category}`}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <p className={`font-bold ${t.type === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                            {t.type === 'receita' ? '+' : '-'}{formatarMoeda(t.amount)}
                          </p>
                          <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => iniciarEdicao(t)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">✏️</button>
                            <button onClick={() => excluirLancamento(t.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Excluir">🗑️</button>
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