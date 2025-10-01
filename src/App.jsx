import React, { useState, useMemo } from 'react';
import { Upload, FileSpreadsheet, TrendingUp, Users, Package, Search, Download, Filter, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function App() {
  const [productsData, setProductsData] = useState(null);
  const [buyersData, setBuyersData] = useState(null);
  const [loading, setLoading] = useState({ products: false, buyers: false });
  const [errors, setErrors] = useState({ products: '', buyers: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Sales data state
  const [salesData, setSalesData] = useState(null);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState('');
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [salesFilterType, setSalesFilterType] = useState('all');
  const [salesFilterGerencia, setSalesFilterGerencia] = useState('all');

  // Keep full Setor name
  const simplifySetor = (setor) => {
    if (!setor) return 'N/A';
    return String(setor);
  };

  // Process Sales Excel file
  const handleSalesUpload = async (file) => {
    setLoadingSales(true);
    setSalesError('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('O arquivo está vazio');
      }

      // Transform data according to business rules
      const transformedData = jsonData.map((row, index) => {
        const getColumnValue = (possibleNames) => {
          for (const name of possibleNames) {
            const key = Object.keys(row).find(k => k.toLowerCase().replace(/\s/g, '').includes(name.toLowerCase().replace(/\s/g, '')));
            if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
          }
          return null;
        };

        // Extract Gerencia (only numbers)
        const gerenciaRaw = getColumnValue(['gerencia', 'gerência']);
        const gerencia = gerenciaRaw ? String(gerenciaRaw).replace(/\D/g, '') : 'N/A';

        // Simplify Setor
        const setorRaw = getColumnValue(['setor']);
        const setor = simplifySetor(setorRaw);

        // Combine CodigoRevendedora and NomeRevendedora
        const codigoRevendedora = getColumnValue(['codigorevendedora', 'códigorevendedora', 'codrevendedora']);
        const nomeRevendedora = getColumnValue(['nomerevendedora', 'revendedora']);
        const revendedora = codigoRevendedora && nomeRevendedora
          ? `${codigoRevendedora} - ${nomeRevendedora}`
          : nomeRevendedora || codigoRevendedora || 'N/A';

        // Combine CodigoProduto and NomeProduto
        const codigoProduto = getColumnValue(['codigoproduto', 'códigoproduto', 'codproduto']);
        const nomeProduto = getColumnValue(['nomeproduto', 'produto']);
        const produto = codigoProduto && nomeProduto
          ? `${codigoProduto} - ${nomeProduto}`
          : nomeProduto || codigoProduto || 'N/A';

        // Tipo (Venda, Doacao, Brinde)
        const tipo = getColumnValue(['tipo']) || 'N/A';

        // QuantidadeItens
        const quantidadeItens = parseFloat(getColumnValue(['quantidadeitens', 'quantidade', 'qtd'])) || 0;

        // ValorVenda (já é o valor total da transação, não unitário)
        const valorVenda = parseFloat(getColumnValue(['valorvenda', 'valordevenda', 'valor'])) || 0;

        return {
          id: index + 1,
          gerencia,
          setor,
          revendedora,
          codigoRevendedora: codigoRevendedora || 'N/A',
          nomeRevendedora: nomeRevendedora || 'N/A',
          produto,
          codigoProduto: codigoProduto || 'N/A',
          nomeProduto: nomeProduto || 'N/A',
          tipo,
          quantidadeItens,
          valorVenda,
          valorTotal: valorVenda  // ValorVenda já é o total da transação
        };
      });

      setSalesData(transformedData);
    } catch (error) {
      setSalesError(error.message || 'Erro ao processar arquivo');
    } finally {
      setLoadingSales(false);
    }
  };

  // Process Excel file
  const handleFileUpload = async (file, type) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    setErrors(prev => ({ ...prev, [type]: '' }));

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('O arquivo está vazio');
      }

      if (type === 'products') {
        // Validate products table structure
        const requiredColumns = ['ID', 'Nome', 'Preco'];
        const columns = Object.keys(jsonData[0]);
        const hasRequired = requiredColumns.every(col =>
          columns.some(c => c.toLowerCase().includes(col.toLowerCase()))
        );

        if (!hasRequired) {
          throw new Error('Tabela de produtos deve conter: ID, Nome e Preço');
        }

        setProductsData(jsonData);
      } else {
        // Validate buyers table structure
        const requiredColumns = ['Comprador', 'Produto'];
        const columns = Object.keys(jsonData[0]);
        const hasRequired = requiredColumns.every(col =>
          columns.some(c => c.toLowerCase().includes(col.toLowerCase()))
        );

        if (!hasRequired) {
          throw new Error('Tabela de compradores deve conter: Comprador e Produto');
        }

        setBuyersData(jsonData);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, [type]: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFileUpload(file, type);
    } else {
      setErrors(prev => ({ ...prev, [type]: 'Por favor, envie um arquivo Excel (.xlsx ou .xls)' }));
    }
  };

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!productsData || !buyersData) return null;

    // Normalize column names
    const getColumnValue = (obj, possibleNames) => {
      for (const name of possibleNames) {
        const key = Object.keys(obj).find(k => k.toLowerCase().includes(name.toLowerCase()));
        if (key) return obj[key];
      }
      return null;
    };

    // Create product map
    const productMap = new Map();
    productsData.forEach(product => {
      const id = getColumnValue(product, ['id', 'codigo', 'código']);
      const name = getColumnValue(product, ['nome', 'produto', 'name']);
      const price = parseFloat(getColumnValue(product, ['preco', 'preço', 'valor', 'price'])) || 0;
      const category = getColumnValue(product, ['categoria', 'category', 'tipo']) || 'Sem Categoria';

      productMap.set(String(id), { id, name, price, category, sales: 0, revenue: 0 });
    });

    // Count sales and revenue
    const buyerStats = new Map();
    buyersData.forEach(buyer => {
      const buyerName = getColumnValue(buyer, ['comprador', 'cliente', 'buyer', 'nome']);
      const productRef = String(getColumnValue(buyer, ['produto', 'product', 'id', 'produtoid']));

      // Try to find product by ID or name
      let product = productMap.get(productRef);
      if (!product) {
        // Try to find by name
        product = Array.from(productMap.values()).find(p =>
          p.name?.toLowerCase() === productRef.toLowerCase()
        );
      }

      if (product) {
        product.sales += 1;
        product.revenue += product.price;

        if (!buyerStats.has(buyerName)) {
          buyerStats.set(buyerName, { name: buyerName, purchases: 0, totalSpent: 0 });
        }
        buyerStats.get(buyerName).purchases += 1;
        buyerStats.get(buyerName).totalSpent += product.price;
      }
    });

    const productsArray = Array.from(productMap.values());
    const buyersArray = Array.from(buyerStats.values());

    // Category stats
    const categoryStats = new Map();
    productsArray.forEach(product => {
      if (!categoryStats.has(product.category)) {
        categoryStats.set(product.category, { category: product.category, sales: 0, revenue: 0 });
      }
      categoryStats.get(product.category).sales += product.sales;
      categoryStats.get(product.category).revenue += product.revenue;
    });

    return {
      totalRevenue: productsArray.reduce((sum, p) => sum + p.revenue, 0),
      totalSales: productsArray.reduce((sum, p) => sum + p.sales, 0),
      totalProducts: productsArray.length,
      totalBuyers: buyersArray.length,
      topProducts: productsArray.sort((a, b) => b.sales - a.sales).slice(0, 10),
      topBuyers: buyersArray.sort((a, b) => b.purchases - a.purchases).slice(0, 10),
      categoryStats: Array.from(categoryStats.values()),
      allProducts: productsArray,
      allBuyers: buyersArray
    };
  }, [productsData, buyersData]);

  // Filter and search
  const filteredProducts = useMemo(() => {
    if (!analytics) return [];

    let filtered = analytics.allProducts;

    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => p.category === filterCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.id).includes(searchTerm)
      );
    }

    return filtered;
  }, [analytics, filterCategory, searchTerm]);

  // Get unique categories
  const categories = useMemo(() => {
    if (!analytics) return [];
    return ['all', ...new Set(analytics.allProducts.map(p => p.category))];
  }, [analytics]);

  // Sales Analytics
  const salesAnalytics = useMemo(() => {
    if (!salesData || salesData.length === 0) return null;

    // Group by Gerencia
    const byGerencia = salesData.reduce((acc, item) => {
      if (!acc[item.gerencia]) {
        acc[item.gerencia] = { gerencia: item.gerencia, valorTotal: 0, quantidade: 0, itens: 0 };
      }
      acc[item.gerencia].valorTotal += item.valorTotal;
      acc[item.gerencia].quantidade += 1;
      acc[item.gerencia].itens += item.quantidadeItens;
      return acc;
    }, {});

    // Group by Setor
    const bySetor = salesData.reduce((acc, item) => {
      if (!acc[item.setor]) {
        acc[item.setor] = { setor: item.setor, valorTotal: 0, quantidade: 0, itens: 0 };
      }
      acc[item.setor].valorTotal += item.valorTotal;
      acc[item.setor].quantidade += 1;
      acc[item.setor].itens += item.quantidadeItens;
      return acc;
    }, {});

    // Group by Tipo (using quantity of items instead of value)
    const byTipo = salesData.reduce((acc, item) => {
      if (!acc[item.tipo]) {
        acc[item.tipo] = { tipo: item.tipo, valorTotal: 0, quantidade: 0, itens: 0 };
      }
      acc[item.tipo].valorTotal += item.valorTotal;
      acc[item.tipo].quantidade += 1;
      acc[item.tipo].itens += item.quantidadeItens;
      return acc;
    }, {});

    // Group by Revendedora
    const byRevendedora = salesData.reduce((acc, item) => {
      if (!acc[item.revendedora]) {
        acc[item.revendedora] = {
          revendedora: item.revendedora,
          codigo: item.codigoRevendedora,
          nome: item.nomeRevendedora,
          valorTotal: 0,
          quantidade: 0,
          itens: 0
        };
      }
      acc[item.revendedora].valorTotal += item.valorTotal;
      acc[item.revendedora].quantidade += 1;
      acc[item.revendedora].itens += item.quantidadeItens;
      return acc;
    }, {});

    // Group by Produto
    const byProduto = salesData.reduce((acc, item) => {
      if (!acc[item.produto]) {
        acc[item.produto] = {
          produto: item.produto,
          codigo: item.codigoProduto,
          nome: item.nomeProduto,
          valorTotal: 0,
          quantidade: 0,
          itens: 0
        };
      }
      acc[item.produto].valorTotal += item.valorTotal;
      acc[item.produto].quantidade += 1;
      acc[item.produto].itens += item.quantidadeItens;
      return acc;
    }, {});

    const gerenciaArray = Object.values(byGerencia).sort((a, b) => b.valorTotal - a.valorTotal);
    const setorArray = Object.values(bySetor).sort((a, b) => b.valorTotal - a.valorTotal);
    const tipoArray = Object.values(byTipo).sort((a, b) => b.valorTotal - a.valorTotal);
    const revendedoraArray = Object.values(byRevendedora).sort((a, b) => b.valorTotal - a.valorTotal);
    const produtoArray = Object.values(byProduto).sort((a, b) => b.valorTotal - a.valorTotal);

    // Get top products for each top revendedora
    const topRevendedorasWithProducts = revendedoraArray.slice(0, 20).map(revendedora => {
      // Filter sales data for this revendedora
      const revendedoraSales = salesData.filter(item => item.revendedora === revendedora.revendedora);

      // Group by product
      const productsByRevendedora = revendedoraSales.reduce((acc, item) => {
        if (!acc[item.produto]) {
          acc[item.produto] = {
            produto: item.produto,
            nomeProduto: item.nomeProduto,
            codigoProduto: item.codigoProduto,
            valorTotal: 0,
            quantidadeItens: 0,
            transacoes: 0
          };
        }
        acc[item.produto].valorTotal += item.valorTotal;
        acc[item.produto].quantidadeItens += item.quantidadeItens;
        acc[item.produto].transacoes += 1;
        return acc;
      }, {});

      const topProducts = Object.values(productsByRevendedora)
        .sort((a, b) => b.quantidadeItens - a.quantidadeItens)
        .slice(0, 5);

      return {
        ...revendedora,
        topProducts
      };
    });

    return {
      totalValor: salesData.reduce((sum, item) => sum + item.valorTotal, 0),
      totalItens: salesData.reduce((sum, item) => sum + item.quantidadeItens, 0),
      totalTransacoes: salesData.length,
      ticketMedio: salesData.length > 0 ? salesData.reduce((sum, item) => sum + item.valorTotal, 0) / salesData.length : 0,
      byGerencia: gerenciaArray,
      bySetor: setorArray,
      byTipo: tipoArray,
      byRevendedora: revendedoraArray,
      topRevendedoras: revendedoraArray.slice(0, 20),
      topRevendedorasWithProducts,
      byProduto: produtoArray,
      topProdutos: produtoArray.slice(0, 20),
      allData: salesData,
      gerencias: ['all', ...Object.keys(byGerencia).sort()],
      tipos: ['all', ...Object.keys(byTipo).sort()]
    };
  }, [salesData]);

  // Filter sales data
  const filteredSalesData = useMemo(() => {
    if (!salesAnalytics) return [];

    let filtered = salesAnalytics.allData;

    if (salesFilterGerencia !== 'all') {
      filtered = filtered.filter(item => item.gerencia === salesFilterGerencia);
    }

    if (salesFilterType !== 'all') {
      filtered = filtered.filter(item => item.tipo === salesFilterType);
    }

    if (salesSearchTerm) {
      filtered = filtered.filter(item =>
        item.revendedora?.toLowerCase().includes(salesSearchTerm.toLowerCase()) ||
        item.produto?.toLowerCase().includes(salesSearchTerm.toLowerCase()) ||
        item.setor?.toLowerCase().includes(salesSearchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [salesAnalytics, salesFilterGerencia, salesFilterType, salesSearchTerm]);

  // Export data
  const handleExport = () => {
    if (!analytics) return;

    const exportData = filteredProducts.map(p => ({
      'ID': p.id,
      'Nome': p.name,
      'Categoria': p.category,
      'Preço': p.price.toFixed(2),
      'Vendas': p.sales,
      'Receita Total': p.revenue.toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Análise de Vendas');
    XLSX.writeFile(wb, 'analise_vendas.xlsx');
  };

  // Export sales data
  const handleSalesExport = () => {
    if (!salesAnalytics) return;

    const exportData = filteredSalesData.map(item => ({
      'Gerência': item.gerencia,
      'Setor': item.setor,
      'Revendedora': item.revendedora,
      'Produto': item.produto,
      'Tipo': item.tipo,
      'Quantidade Itens': item.quantidadeItens,
      'Valor Transação': item.valorVenda.toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Análise de Vendas');
    XLSX.writeFile(wb, 'relatorio_vendas.xlsx');
  };

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-purple-500 to-cyan-500 p-3 rounded-xl">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Sales Analytics</h1>
                <p className="text-purple-200">Análise Avançada de Vendas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        {(!productsData || !buyersData) && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Products Upload */}
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'products')}
              className={`relative group ${productsData ? 'opacity-50' : ''}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity blur-xl" />
              <div className="relative bg-white/5 backdrop-blur-xl border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-purple-500/50 transition-all">
                <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {productsData ? '✓ Tabela de Produtos Carregada' : 'Tabela de Produtos'}
                </h3>
                <p className="text-gray-400 mb-4">
                  Arraste ou clique para enviar arquivo Excel
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'products')}
                  className="hidden"
                  id="products-upload"
                  disabled={loading.products || productsData}
                />
                <label
                  htmlFor="products-upload"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  {loading.products ? 'Processando...' : 'Selecionar Arquivo'}
                </label>
                {errors.products && (
                  <p className="mt-4 text-red-400 text-sm">{errors.products}</p>
                )}
              </div>
            </div>

            {/* Buyers Upload */}
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'buyers')}
              className={`relative group ${buyersData ? 'opacity-50' : ''}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity blur-xl" />
              <div className="relative bg-white/5 backdrop-blur-xl border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-cyan-500/50 transition-all">
                <Users className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {buyersData ? '✓ Tabela de Compradores Carregada' : 'Tabela de Compradores'}
                </h3>
                <p className="text-gray-400 mb-4">
                  Arraste ou clique para enviar arquivo Excel
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'buyers')}
                  className="hidden"
                  id="buyers-upload"
                  disabled={loading.buyers || buyersData}
                />
                <label
                  htmlFor="buyers-upload"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  {loading.buyers ? 'Processando...' : 'Selecionar Arquivo'}
                </label>
                {errors.buyers && (
                  <p className="mt-4 text-red-400 text-sm">{errors.buyers}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Dashboard */}
        {analytics && (
          <>
            {/* Tabs */}
            <div className="flex space-x-2 mb-6 bg-white/5 backdrop-blur-xl rounded-xl p-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'products'
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Produtos
              </button>
              <button
                onClick={() => setActiveTab('buyers')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'buyers'
                    ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Compradores
              </button>
            </div>
          </>
        )}

        {/* SALES SECTION - INDEPENDENT FROM PRODUCTS/BUYERS */}
        <div className="mt-12 pt-12 border-t-2 border-white/20">
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-3 mb-2">
              <div className="bg-gradient-to-br from-orange-500 to-pink-500 p-3 rounded-xl">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">Análise de Vendas</h2>
            </div>
            <p className="text-center text-gray-400">Módulo independente para análise de dados de vendas</p>
          </div>

          {!salesData ? (
            <div className="mb-8">
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                    handleSalesUpload(file);
                  } else {
                    setSalesError('Por favor, envie um arquivo Excel (.xlsx ou .xls)');
                  }
                }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity blur-xl" />
                <div className="relative bg-white/5 backdrop-blur-xl border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-orange-500/50 transition-all">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 text-orange-400" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Planilha de Vendas
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Arraste ou clique para enviar arquivo Excel de vendas
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => e.target.files[0] && handleSalesUpload(e.target.files[0])}
                    className="hidden"
                    id="sales-upload"
                    disabled={loadingSales}
                  />
                  <label
                    htmlFor="sales-upload"
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all cursor-pointer"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    {loadingSales ? 'Processando...' : 'Selecionar Arquivo'}
                  </label>
                  {salesError && (
                    <p className="mt-4 text-red-400 text-sm">{salesError}</p>
                  )}
                </div>
              </div>
            </div>
          ) : salesAnalytics && (
            // Sales Analytics Dashboard
            <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity blur-xl" />
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-orange-500/50 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="bg-orange-500/20 p-3 rounded-xl">
                          <TrendingUp className="w-6 h-6 text-orange-400" />
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">Faturamento Total</p>
                      <p className="text-3xl font-bold text-white">
                        R$ {salesAnalytics.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity blur-xl" />
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-pink-500/50 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="bg-pink-500/20 p-3 rounded-xl">
                          <Package className="w-6 h-6 text-pink-400" />
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">Total de Itens</p>
                      <p className="text-3xl font-bold text-white">{salesAnalytics.totalItens.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity blur-xl" />
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="bg-purple-500/20 p-3 rounded-xl">
                          <FileSpreadsheet className="w-6 h-6 text-purple-400" />
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">Transações</p>
                      <p className="text-3xl font-bold text-white">{salesAnalytics.totalTransacoes.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity blur-xl" />
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-cyan-500/50 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="bg-cyan-500/20 p-3 rounded-xl">
                          <TrendingUp className="w-6 h-6 text-cyan-400" />
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">Ticket Médio</p>
                      <p className="text-3xl font-bold text-white">
                        R$ {salesAnalytics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Charts Row 1 */}
                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                  {/* Vendas por Gerência */}
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Vendas por Gerência</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={salesAnalytics.byGerencia}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis dataKey="gerencia" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          labelStyle={{ color: '#f1f5f9' }}
                          formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        />
                        <Bar dataKey="valorTotal" fill="url(#colorOrange)" radius={[8, 8, 0, 0]} />
                        <defs>
                          <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#ec4899" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Vendas por Tipo */}
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Distribuição por Tipo (Quantidade de Itens)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={salesAnalytics.byTipo}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ tipo, percent }) => `${tipo} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="itens"
                        >
                          {salesAnalytics.byTipo.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          formatter={(value) => `${Number(value).toLocaleString('pt-BR')} itens`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Charts Row 2 */}
                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                  {/* Vendas por Setor */}
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Vendas por Setor</h3>
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={salesAnalytics.bySetor.slice(0, 15)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                        <YAxis dataKey="setor" type="category" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} width={150} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          labelStyle={{ color: '#f1f5f9' }}
                          formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        />
                        <Bar dataKey="valorTotal" fill="url(#colorPink)" radius={[0, 8, 8, 0]} />
                        <defs>
                          <linearGradient id="colorPink" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#ec4899" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top Produtos */}
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Top 20 Produtos</h3>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {salesAnalytics.topProdutos.map((produto, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">{produto.nome}</p>
                              <p className="text-gray-400 text-sm">{produto.itens} itens vendidos</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-green-400 font-bold">R$ {produto.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top Revendedoras */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
                  <h3 className="text-xl font-semibold text-white mb-6">Top 20 Revendedoras</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Rank</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Revendedora</th>
                          <th className="text-right py-3 px-4 text-gray-400 font-medium">Transações</th>
                          <th className="text-right py-3 px-4 text-gray-400 font-medium">Itens</th>
                          <th className="text-right py-3 px-4 text-gray-400 font-medium">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesAnalytics.topRevendedoras.map((rev, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                                {idx + 1}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-white font-medium">{rev.nome}</td>
                            <td className="py-3 px-4 text-right text-cyan-400">{rev.quantidade}</td>
                            <td className="py-3 px-4 text-right text-purple-400">{rev.itens}</td>
                            <td className="py-3 px-4 text-right text-green-400 font-bold">
                              R$ {rev.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Products by Revendedora */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
                  <h3 className="text-xl font-semibold text-white mb-6">Produtos Mais Comprados por Revendedora</h3>
                  <div className="grid gap-6">
                    {salesAnalytics.topRevendedorasWithProducts.map((rev, idx) => (
                      <div key={idx} className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-orange-500/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold">
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">{rev.nome}</h4>
                              <p className="text-sm text-gray-400">
                                {rev.quantidade} transações • {rev.itens} itens • R$ {rev.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-gray-400 mb-3">Top 5 Produtos Mais Comprados:</p>
                          {rev.topProducts.length > 0 ? (
                            <div className="grid gap-2">
                              {rev.topProducts.map((produto, pIdx) => (
                                <div key={pIdx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                                      {pIdx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white font-medium truncate">{produto.nomeProduto}</p>
                                      <p className="text-xs text-gray-400">{produto.transacoes} transação(ões)</p>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-4">
                                    <p className="text-cyan-400 font-bold">{produto.quantidadeItens} itens</p>
                                    <p className="text-xs text-green-400">R$ {produto.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-400 text-sm italic">Nenhum produto encontrado</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filters and Table */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar por revendedora, produto ou setor..."
                        value={salesSearchTerm}
                        onChange={(e) => setSalesSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500/50 transition-colors"
                      />
                      {salesSearchTerm && (
                        <button
                          onClick={() => setSalesSearchTerm('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={salesFilterGerencia}
                        onChange={(e) => setSalesFilterGerencia(e.target.value)}
                        className="pl-10 pr-8 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer"
                      >
                        {salesAnalytics.gerencias.map(ger => (
                          <option key={ger} value={ger} className="bg-slate-800">
                            {ger === 'all' ? 'Todas Gerências' : `Gerência ${ger}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={salesFilterType}
                        onChange={(e) => setSalesFilterType(e.target.value)}
                        className="pl-10 pr-8 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer"
                      >
                        {salesAnalytics.tipos.map(tipo => (
                          <option key={tipo} value={tipo} className="bg-slate-800">
                            {tipo === 'all' ? 'Todos os Tipos' : tipo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleSalesExport}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Exportar
                    </button>
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-6">
                    Todas as Transações ({filteredSalesData.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Gerência</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Setor</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Revendedora</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Produto</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Tipo</th>
                          <th className="text-right py-3 px-4 text-gray-400 font-medium">Qtd Itens</th>
                          <th className="text-right py-3 px-4 text-gray-400 font-medium">Valor Transação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSalesData.slice(0, 100).map((item, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 text-gray-300">{item.gerencia}</td>
                            <td className="py-3 px-4 text-gray-300">{item.setor}</td>
                            <td className="py-3 px-4 text-white font-medium">{item.nomeRevendedora}</td>
                            <td className="py-3 px-4 text-white">{item.nomeProduto}</td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-sm ${
                                item.tipo.toLowerCase().includes('venda') ? 'bg-green-500/20 text-green-300' :
                                item.tipo.toLowerCase().includes('doacao') || item.tipo.toLowerCase().includes('doação') ? 'bg-blue-500/20 text-blue-300' :
                                'bg-purple-500/20 text-purple-300'
                              }`}>
                                {item.tipo}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-cyan-400">{item.quantidadeItens}</td>
                            <td className="py-3 px-4 text-right text-green-400 font-bold">
                              R$ {item.valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredSalesData.length > 100 && (
                      <p className="text-center text-gray-400 mt-4 text-sm">
                        Mostrando 100 de {filteredSalesData.length} registros. Use os filtros para refinar a busca.
                      </p>
                    )}
                  </div>
                </div>

                {/* Reset Button */}
                <div className="text-center">
                  <button
                    onClick={() => {
                      setSalesData(null);
                      setSalesSearchTerm('');
                      setSalesFilterType('all');
                      setSalesFilterGerencia('all');
                    }}
                    className="inline-flex items-center px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    Carregar Nova Planilha
                  </button>
                </div>
              </>
            )}
        </div>

        {/* Products/Buyers Analytics */}
        {analytics && (
          <>

            {activeTab === 'dashboard' && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity blur-xl" />
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="bg-purple-500/20 p-3 rounded-xl">
                          <TrendingUp className="w-6 h-6 text-purple-400" />
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">Receita Total</p>
                      <p className="text-3xl font-bold text-white">
                        R$ {analytics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity blur-xl" />
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-cyan-500/50 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="bg-cyan-500/20 p-3 rounded-xl">
                          <Package className="w-6 h-6 text-cyan-400" />
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">Total de Vendas</p>
                      <p className="text-3xl font-bold text-white">{analytics.totalSales}</p>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity blur-xl" />
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-green-500/50 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="bg-green-500/20 p-3 rounded-xl">
                          <FileSpreadsheet className="w-6 h-6 text-green-400" />
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">Produtos</p>
                      <p className="text-3xl font-bold text-white">{analytics.totalProducts}</p>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity blur-xl" />
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-pink-500/50 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="bg-pink-500/20 p-3 rounded-xl">
                          <Users className="w-6 h-6 text-pink-400" />
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">Compradores</p>
                      <p className="text-3xl font-bold text-white">{analytics.totalBuyers}</p>
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                  {/* Top Products Chart */}
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Top 10 Produtos Mais Vendidos</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.topProducts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                          labelStyle={{ color: '#f1f5f9' }}
                        />
                        <Bar dataKey="sales" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                        <defs>
                          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category Distribution */}
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Distribuição por Categoria</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.categoryStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="sales"
                        >
                          {analytics.categoryStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Buyers */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-6">Compradores Mais Ativos</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Comprador</th>
                          <th className="text-right py-3 px-4 text-gray-400 font-medium">Compras</th>
                          <th className="text-right py-3 px-4 text-gray-400 font-medium">Total Gasto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.topBuyers.map((buyer, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 text-white">{buyer.name}</td>
                            <td className="py-3 px-4 text-right text-gray-300">{buyer.purchases}</td>
                            <td className="py-3 px-4 text-right text-green-400 font-medium">
                              R$ {buyer.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'products' && (
              <>
                {/* Search and Filter */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar produtos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 transition-colors"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="pl-10 pr-8 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none cursor-pointer"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat} className="bg-slate-800">
                            {cat === 'all' ? 'Todas Categorias' : cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleExport}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Exportar
                    </button>
                  </div>
                </div>

                {/* Products Table */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-6">
                    Produtos ({filteredProducts.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">ID</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Nome</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Categoria</th>
                          <th className="text-right py-3 px-4 text-gray-400 font-medium">Preço</th>
                          <th className="text-right py-3 px-4 text-gray-400 font-medium">Vendas</th>
                          <th className="text-right py-3 px-4 text-gray-400 font-medium">Receita</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((product, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 text-gray-300">{product.id}</td>
                            <td className="py-3 px-4 text-white font-medium">{product.name}</td>
                            <td className="py-3 px-4">
                              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                                {product.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-gray-300">
                              R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-cyan-400 font-medium">{product.sales}</td>
                            <td className="py-3 px-4 text-right text-green-400 font-medium">
                              R$ {product.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'buyers' && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white mb-6">
                  Todos os Compradores ({analytics.allBuyers.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Comprador</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Total de Compras</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Total Gasto</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Ticket Médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.allBuyers.map((buyer, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-white font-medium">{buyer.name}</td>
                          <td className="py-3 px-4 text-right text-cyan-400">{buyer.purchases}</td>
                          <td className="py-3 px-4 text-right text-green-400 font-medium">
                            R$ {buyer.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-300">
                            R$ {(buyer.totalSpent / buyer.purchases).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Reset Button */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setProductsData(null);
                  setBuyersData(null);
                  setSearchTerm('');
                  setFilterCategory('all');
                  setActiveTab('dashboard');
                }}
                className="inline-flex items-center px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 hover:border-white/20 transition-all"
              >
                Carregar Novos Arquivos
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
