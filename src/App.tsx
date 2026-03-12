import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, Phone, Mail, MapPin, Facebook, Instagram, Twitter, ChevronRight, Star, Trash2, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CartItem, Service } from './types';

// --- Contexts ---
interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

// --- Components ---

const Header = () => {
  const { totalItems } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/produtos?search=${searchQuery}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="bg-orange-600 text-white text-xs py-2 text-center font-medium">
        ENTREGA GRÁTIS PARA COMPRAS ACIMA DE R$ 500,00!
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-orange-600 p-2 rounded-lg">
              <MapPin className="text-white h-6 w-6" />
            </div>
            <span className="text-2xl font-bold text-blue-900 tracking-tight">Constru<span className="text-orange-600">Tech</span></span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8 font-medium text-gray-700">
            <Link to="/" className="hover:text-orange-600 transition-colors">Início</Link>
            <Link to="/produtos" className="hover:text-orange-600 transition-colors">Produtos</Link>
            <Link to="/servicos" className="hover:text-orange-600 transition-colors">Serviços</Link>
            <Link to="/contato" className="hover:text-orange-600 transition-colors">Contato</Link>
          </nav>

          {/* Search & Cart */}
          <div className="hidden md:flex items-center space-x-6">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Buscar materiais..."
                className="pl-4 pr-10 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="absolute right-3 top-2.5 text-gray-400 hover:text-orange-600">
                <Search size={20} />
              </button>
            </form>
            <Link to="/carrinho" className="relative text-gray-700 hover:text-orange-600">
              <ShoppingCart size={28} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <Link to="/carrinho" className="relative text-gray-700">
              <ShoppingCart size={24} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-700">
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              <form onSubmit={handleSearch} className="relative mt-2">
                <input
                  type="text"
                  placeholder="Buscar materiais..."
                  className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="absolute right-3 top-2.5 text-gray-400">
                  <Search size={20} />
                </button>
              </form>
              <nav className="flex flex-col space-y-4 font-medium text-gray-700">
                <Link to="/" onClick={() => setIsMenuOpen(false)} className="hover:text-orange-600">Início</Link>
                <Link to="/produtos" onClick={() => setIsMenuOpen(false)} className="hover:text-orange-600">Produtos</Link>
                <Link to="/servicos" onClick={() => setIsMenuOpen(false)} className="hover:text-orange-600">Serviços</Link>
                <Link to="/contato" onClick={() => setIsMenuOpen(false)} className="hover:text-orange-600">Contato</Link>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

const Footer = () => {
  return (
    <footer className="bg-blue-950 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-orange-600 p-2 rounded-lg">
                <MapPin className="text-white h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">Constru<span className="text-orange-600">Tech</span></span>
            </div>
            <p className="text-blue-200 text-sm">
              Sua parceira ideal para construir e reformar. Qualidade, preço justo e entrega rápida em um só lugar.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-orange-500 transition-colors"><Facebook size={20} /></a>
              <a href="#" className="hover:text-orange-500 transition-colors"><Instagram size={20} /></a>
              <a href="#" className="hover:text-orange-500 transition-colors"><Twitter size={20} /></a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-6 border-b border-blue-800 pb-2">Links Úteis</h3>
            <ul className="space-y-3 text-sm text-blue-200">
              <li><Link to="/" className="hover:text-white transition-colors">Início</Link></li>
              <li><Link to="/produtos" className="hover:text-white transition-colors">Produtos</Link></li>
              <li><Link to="/servicos" className="hover:text-white transition-colors">Serviços</Link></li>
              <li><Link to="/contato" className="hover:text-white transition-colors">Contato</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-6 border-b border-blue-800 pb-2">Categorias</h3>
            <ul className="space-y-3 text-sm text-blue-200">
              <li><Link to="/produtos?cat=Cimento" className="hover:text-white transition-colors">Cimento</Link></li>
              <li><Link to="/produtos?cat=Ferramentas" className="hover:text-white transition-colors">Ferramentas</Link></li>
              <li><Link to="/produtos?cat=Elétrica" className="hover:text-white transition-colors">Elétrica</Link></li>
              <li><Link to="/produtos?cat=Hidráulica" className="hover:text-white transition-colors">Hidráulica</Link></li>
              <li><Link to="/produtos?cat=Tintas" className="hover:text-white transition-colors">Tintas</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-6 border-b border-blue-800 pb-2">Contato</h3>
            <ul className="space-y-4 text-sm text-blue-200">
              <li className="flex items-start space-x-3">
                <MapPin size={18} className="text-orange-500 shrink-0" />
                <span>Av. das Construções, 1234 - Bairro Industrial, São Paulo - SP</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={18} className="text-orange-500 shrink-0" />
                <span>(11) 4002-8922</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail size={18} className="text-orange-500 shrink-0" />
                <span>contato@construtech.com.br</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-blue-900 pt-8 text-center text-xs text-blue-400">
          <p>© 2026 ConstruTech Materiais de Construção. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

// --- Pages ---

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setFeaturedProducts(data.filter((p: Product) => p.featured).slice(0, 4)));
  }, []);

  const categories = [
    { name: 'Cimento', icon: '🏗️', color: 'bg-orange-100' },
    { name: 'Ferramentas', icon: '🛠️', color: 'bg-blue-100' },
    { name: 'Elétrica', icon: '⚡', color: 'bg-yellow-100' },
    { name: 'Hidráulica', icon: '🚰', color: 'bg-cyan-100' },
    { name: 'Tintas', icon: '🎨', color: 'bg-purple-100' },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Banner */}
      <section className="relative h-[500px] overflow-hidden">
        <img
          src="https://picsum.photos/seed/construction-banner/1920/1080"
          alt="Banner ConstruTech"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-xl text-white space-y-6"
            >
              <h1 className="text-5xl font-extrabold leading-tight">
                Tudo para sua Obra do <span className="text-orange-500">Básico ao Acabamento</span>
              </h1>
              <p className="text-xl text-gray-100">
                As melhores marcas com os menores preços da região. Confira nossas ofertas exclusivas!
              </p>
              <div className="flex space-x-4">
                <Link to="/produtos" className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg font-bold transition-all transform hover:scale-105">
                  Ver Produtos
                </Link>
                <Link to="/servicos" className="bg-white hover:bg-gray-100 text-blue-900 px-8 py-3 rounded-lg font-bold transition-all transform hover:scale-105">
                  Nossos Serviços
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-blue-900">Categorias Principais</h2>
          <div className="h-1 w-20 bg-orange-600 mx-auto mt-2"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {categories.map((cat, idx) => (
            <Link
              key={idx}
              to={`/produtos?cat=${cat.name}`}
              className={`${cat.color} p-8 rounded-2xl flex flex-col items-center justify-center space-y-4 hover:shadow-lg transition-all transform hover:-translate-y-1`}
            >
              <span className="text-4xl">{cat.icon}</span>
              <span className="font-bold text-blue-900">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold text-blue-900">Destaques da Semana</h2>
              <p className="text-gray-600 mt-2">Produtos selecionados com preços imbatíveis</p>
            </div>
            <Link to="/produtos" className="text-orange-600 font-bold flex items-center hover:underline">
              Ver todos <ChevronRight size={20} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Institutional */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="rounded-3xl overflow-hidden shadow-2xl">
            <img
              src="https://picsum.photos/seed/store/800/600"
              alt="Nossa Loja"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-blue-900">Mais de 20 anos construindo sonhos</h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              A ConstruTech nasceu com o propósito de facilitar a vida de quem constrói ou reforma. Oferecemos um catálogo completo de materiais, desde a fundação até o acabamento fino.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h4 className="font-bold text-orange-600 text-2xl">15k+</h4>
                <p className="text-sm text-gray-500">Produtos em Estoque</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h4 className="font-bold text-orange-600 text-2xl">50k+</h4>
                <p className="text-sm text-gray-500">Clientes Atendidos</p>
              </div>
            </div>
            <button className="bg-blue-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-800 transition-colors">
              Conheça Nossa História
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart } = useCart();

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group flex flex-col h-full"
    >
      <Link to={`/produto/${product.id}`} className="relative h-64 overflow-hidden block">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 bg-orange-600 text-white text-[10px] font-bold px-3 py-1 rounded-full">
          {product.category}
        </div>
      </Link>
      <div className="p-6 flex flex-col flex-grow">
        <Link to={`/produto/${product.id}`} className="text-lg font-bold text-blue-900 hover:text-orange-600 transition-colors line-clamp-2 mb-2">
          {product.name}
        </Link>
        <div className="flex items-center space-x-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
          ))}
          <span className="text-xs text-gray-400 ml-2">(48)</span>
        </div>
        <div className="mt-auto">
          <div className="text-2xl font-black text-blue-900 mb-4">
            R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to={`/produto/${product.id}`}
              className="text-center py-2 border border-blue-900 text-blue-900 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors"
            >
              Detalhes
            </Link>
            <button
              onClick={() => addToCart(product)}
              className="bg-orange-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2"
            >
              <ShoppingCart size={16} />
              <span>Comprar</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchParams] = React.useState(new URLSearchParams(window.location.search));
  const [activeCategory, setActiveCategory] = useState(searchParams.get('cat') || 'Todos');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setFilteredProducts(data);
      });
  }, []);

  useEffect(() => {
    let result = products;
    if (activeCategory !== 'Todos') {
      result = result.filter(p => p.category === activeCategory);
    }
    if (searchTerm) {
      result = result.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredProducts(result);
  }, [activeCategory, searchTerm, products]);

  const categories = ['Todos', 'Cimento', 'Ferramentas', 'Elétrica', 'Hidráulica', 'Tintas'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 space-y-6 md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold text-blue-900">Nossos Produtos</h1>
          <p className="text-gray-500 mt-2">Encontre tudo o que você precisa para sua obra</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                activeCategory === cat
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-600 hover:text-orange-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-3xl">
          <Search size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">Nenhum produto encontrado</h3>
          <p className="text-gray-500 mt-2">Tente ajustar seus filtros ou busca.</p>
          <button
            onClick={() => { setActiveCategory('Todos'); setSearchTerm(''); }}
            className="mt-6 text-orange-600 font-bold hover:underline"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}
    </div>
  );
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => setProduct(data))
      .catch(() => navigate('/produtos'));
  }, [id, navigate]);

  if (!product) return <div className="h-screen flex items-center justify-center">Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
            <img
              src={product.images[activeImage]}
              alt={product.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex space-x-4">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={`w-24 h-24 rounded-xl overflow-hidden border-2 transition-all ${
                  activeImage === idx ? 'border-orange-600' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-8">
          <div>
            <div className="text-orange-600 font-bold text-sm uppercase tracking-widest mb-2">{product.category}</div>
            <h1 className="text-4xl font-extrabold text-blue-900 leading-tight">{product.name}</h1>
            <div className="flex items-center mt-4 space-x-4">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => <Star key={i} size={18} className="fill-current" />)}
              </div>
              <span className="text-gray-400 text-sm">(124 avaliações)</span>
            </div>
          </div>

          <div className="text-4xl font-black text-blue-900">
            R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>

          <p className="text-gray-600 text-lg leading-relaxed">
            {product.description}
          </p>

          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-blue-900 font-bold">Disponibilidade:</span>
              <span className="text-green-600 font-bold flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                Em estoque ({product.stock} unidades)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-blue-900 font-bold">Entrega:</span>
              <span className="text-gray-600">Estimada em 2-3 dias úteis</span>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => addToCart(product)}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-orange-200 flex items-center justify-center space-x-3"
            >
              <ShoppingCart size={24} />
              <span>Adicionar ao Carrinho</span>
            </button>
            <button className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <Star size={24} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ServicesPage = () => {
  const services: Service[] = [
    { id: 1, title: 'Entrega de Material', description: 'Frota própria para garantir que seu material chegue rápido e seguro na sua obra.', icon: '🚚' },
    { id: 2, title: 'Montagem de Caixa d’Água', description: 'Equipe especializada para instalação e manutenção de reservatórios de todos os tamanhos.', icon: '💧' },
    { id: 3, title: 'Instalação Elétrica', description: 'Profissionais certificados para realizar desde pequenos reparos até instalações completas.', icon: '⚡' },
    { id: 4, title: 'Pequenos Reparos', description: 'Serviços de "Marido de Aluguel" para resolver problemas rápidos do dia a dia.', icon: '🛠️' },
    { id: 5, title: 'Orçamento para Obra', description: 'Consultoria técnica gratuita para ajudar você a planejar a compra dos materiais.', icon: '📋' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-bold text-blue-900">Nossos Serviços</h1>
        <p className="text-gray-600 mt-4 text-lg">
          Além de vender os melhores materiais, oferecemos soluções completas para facilitar sua construção ou reforma.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {services.map(service => (
          <motion.div
            key={service.id}
            whileHover={{ y: -10 }}
            className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 text-center space-y-6"
          >
            <div className="text-6xl">{service.icon}</div>
            <h3 className="text-2xl font-bold text-blue-900">{service.title}</h3>
            <p className="text-gray-500 leading-relaxed">{service.description}</p>
            <button className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition-colors">
              Solicitar Orçamento
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const CartPage = () => {
  const { cart, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 text-center">
        <div className="bg-gray-50 rounded-3xl p-16 max-w-2xl mx-auto">
          <ShoppingCart size={80} className="mx-auto text-gray-200 mb-6" />
          <h2 className="text-3xl font-bold text-blue-900">Seu carrinho está vazio</h2>
          <p className="text-gray-500 mt-4">Que tal conferir nossas ofertas e começar a construir?</p>
          <Link to="/produtos" className="inline-block mt-8 bg-orange-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-orange-700 transition-all">
            Ver Produtos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-blue-900 mb-12">Seu Carrinho</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {cart.map(item => (
            <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center space-x-6 shadow-sm">
              <img src={item.images[0]} alt={item.name} className="w-24 h-24 object-cover rounded-xl" referrerPolicy="no-referrer" />
              <div className="flex-grow">
                <h3 className="font-bold text-blue-900 text-lg">{item.name}</h3>
                <p className="text-gray-400 text-sm">{item.category}</p>
                <div className="mt-2 text-orange-600 font-bold">
                  R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-gray-50"><Minus size={16} /></button>
                  <span className="px-4 font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-gray-50"><Plus size={16} /></button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 p-2">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
          <button onClick={clearCart} className="text-gray-400 text-sm hover:text-red-500 transition-colors">
            Limpar Carrinho
          </button>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-lg h-fit space-y-6">
          <h3 className="text-xl font-bold text-blue-900 border-b pb-4">Resumo do Pedido</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Frete</span>
              <span className="text-green-600 font-bold">Grátis</span>
            </div>
            <div className="border-t pt-4 flex justify-between text-2xl font-black text-blue-900">
              <span>Total</span>
              <span>R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-orange-200">
            Finalizar Compra
          </button>
          <p className="text-center text-xs text-gray-400">
            Pagamento seguro via Cartão, Pix ou Boleto.
          </p>
        </div>
      </div>
    </div>
  );
};

const ContactPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-blue-900">Fale Conosco</h1>
            <p className="text-gray-600 mt-4">Estamos prontos para tirar suas dúvidas e ajudar no seu projeto.</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
                <Phone size={24} />
              </div>
              <div>
                <h4 className="font-bold text-blue-900">Telefone e WhatsApp</h4>
                <p className="text-gray-500">(11) 4002-8922 / (11) 98888-7777</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 p-3 rounded-xl text-blue-900">
                <Mail size={24} />
              </div>
              <div>
                <h4 className="font-bold text-blue-900">E-mail</h4>
                <p className="text-gray-500">contato@construtech.com.br</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-green-100 p-3 rounded-xl text-green-600">
                <MapPin size={24} />
              </div>
              <div>
                <h4 className="font-bold text-blue-900">Endereço</h4>
                <p className="text-gray-500">Av. das Construções, 1234 - São Paulo, SP</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
          <form className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome Completo</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:outline-none" placeholder="Seu nome" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">E-mail</label>
                <input type="email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:outline-none" placeholder="seu@email.com" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Assunto</label>
              <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:outline-none">
                <option>Dúvida sobre produto</option>
                <option>Orçamento de serviço</option>
                <option>Reclamação/Sugestão</option>
                <option>Outros</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Mensagem</label>
              <textarea rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:outline-none" placeholder="Como podemos ajudar?"></textarea>
            </div>
            <button className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200">
              Enviar Mensagem
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  return (
    <CartProvider>
      <Router>
        <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-orange-200 selection:text-orange-900">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/produtos" element={<ProductsPage />} />
              <Route path="/produto/:id" element={<ProductDetailPage />} />
              <Route path="/servicos" element={<ServicesPage />} />
              <Route path="/contato" element={<ContactPage />} />
              <Route path="/carrinho" element={<CartPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </CartProvider>
  );
}
