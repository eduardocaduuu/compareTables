# Sales Analytics App 📊

Aplicação web moderna para análise de vendas que processa e visualiza dados de produtos e compradores através de arquivos Excel.

## ✨ Funcionalidades

- **Upload de Arquivos Excel**: Drag & drop ou clique para enviar
- **Processamento Inteligente**: Análise automática de produtos e compradores
- **Dashboard Interativo**: Métricas em tempo real com gráficos dinâmicos
- **Visualização de Dados**: Gráficos de barras, pizza e tabelas interativas
- **Busca e Filtros**: Pesquise produtos e filtre por categoria
- **Exportação**: Exporte análises processadas para Excel
- **Design Moderno**: Interface dark mode com glassmorphism e gradientes

## 🚀 Começando

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

### Build para Produção

```bash
npm run build
```

## 📋 Estrutura das Tabelas Excel

### Tabela de Produtos (Primeiro Upload)
Deve conter colunas como:
- **ID**: Identificador único do produto
- **Nome**: Nome do produto
- **Preço**: Valor do produto
- **Categoria**: (Opcional) Categoria do produto

### Tabela de Compradores (Segundo Upload)
Deve conter colunas como:
- **Comprador**: Nome do comprador
- **Produto**: Referência ao produto (ID ou Nome)

## 🛠️ Tecnologias

- **React 18** - Framework UI
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **SheetJS (xlsx)** - Processamento de Excel
- **Recharts** - Gráficos interativos
- **Lucide React** - Ícones modernos

## 📊 Métricas Calculadas

- Receita total por produto
- Produtos mais vendidos
- Compradores mais ativos
- Distribuição por categoria
- Ticket médio por comprador

## 🎨 Design

- Dark mode moderno
- Glassmorphism effects
- Gradientes suaves (roxo/azul)
- Animações fluídas
- Layout responsivo

## 📝 Notas

- Arquivos suportados: .xlsx, .xls
- Validação automática de estrutura
- Feedback visual em tempo real
- Tratamento de erros amigável
