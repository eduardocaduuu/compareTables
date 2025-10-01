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
