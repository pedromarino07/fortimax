import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, Phone, Mail, MapPin, Facebook, Instagram, Twitter, ChevronRight, Star, Trash2, Plus, Minus, Clock, LayoutDashboard, Package, Tag, Users, LogOut, LogIn, PlusCircle, Edit, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CartItem, User } from './types';

// --- Contexts ---

interface AuthContextType {
  user: User | null;
  login: (usuario: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const login = async (usuario: string, senha: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao fazer login');
    }
    const data = await res.json();
    setUser(data);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
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
  const { user } = useAuth();
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
      <div className="bg-brand-primary text-white text-xs py-2 text-center font-medium">
        ENTREGA GRÁTIS PARA FORTIM E REGIÃO EM COMPRAS ACIMA DE R$ 500,00!
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src="/static/img/logo.png" 
              alt="FORTIMAX" 
              className="logo"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/static/img/logo_padrao.png";
              }}
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8 font-bold text-gray-700 uppercase text-sm tracking-wide">
            <Link to="/" className="hover:text-brand-primary transition-colors">Início</Link>
            <Link to="/produtos" className="hover:text-brand-primary transition-colors">Produtos</Link>
            <Link to="/ofertas" className="hover:text-brand-primary transition-colors">Ofertas</Link>
            <Link to="/contato" className="hover:text-brand-primary transition-colors">Contato</Link>
            {user ? (
              <Link to="/admin" className="text-brand-primary hover:text-brand-dark transition-colors flex items-center space-x-1">
                <LayoutDashboard size={18} />
                <span>Painel</span>
              </Link>
            ) : (
              <Link to="/login" className="hover:text-brand-primary transition-colors flex items-center space-x-1">
                <LogIn size={18} />
                <span>Login</span>
              </Link>
            )}
          </nav>

          {/* Search & Cart */}
          <div className="hidden md:flex items-center space-x-6">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Buscar materiais..."
                className="pl-4 pr-10 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-primary w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="absolute right-3 top-2.5 text-gray-400 hover:text-brand-primary">
                <Search size={20} />
              </button>
            </form>
            <Link to="/carrinho" className="relative text-gray-700 hover:text-brand-primary">
              <ShoppingCart size={28} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-primary text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
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
                <span className="absolute -top-2 -right-2 bg-brand-primary text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
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
              <nav className="flex flex-col space-y-4 font-bold text-gray-700 uppercase text-sm">
                <Link to="/" onClick={() => setIsMenuOpen(false)} className="hover:text-brand-primary">Início</Link>
                <Link to="/produtos" onClick={() => setIsMenuOpen(false)} className="hover:text-brand-primary">Produtos</Link>
                <Link to="/ofertas" onClick={() => setIsMenuOpen(false)} className="hover:text-brand-primary">Ofertas</Link>
                <Link to="/contato" onClick={() => setIsMenuOpen(false)} className="hover:text-brand-primary">Contato</Link>
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
    <footer className="bg-brand-dark text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Col 1: Logo + Desc */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center">
              <img 
                src="/static/img/logo.png" 
                alt="FORTIMAX" 
                className="logo brightness-0 invert"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/static/img/logo_padrao.png";
                }}
              />
            </Link>
            <p className="text-brand-light/80 text-sm leading-relaxed">
              A Fortimax é sua loja especializada em materiais para construção e reforma em Fortim - CE. Qualidade e os melhores preços para sua obra.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-brand-light transition-colors"><Facebook size={20} /></a>
              <a href="https://instagram.com/Fortimaxloja" target="_blank" rel="noopener noreferrer" className="hover:text-brand-light transition-colors"><Instagram size={20} /></a>
              <a href="#" className="hover:text-brand-light transition-colors"><Twitter size={20} /></a>
            </div>
          </div>

          {/* Col 2: Categorias */}
          <div>
            <h3 className="text-lg font-bold mb-6 border-b border-brand-primary pb-2 uppercase tracking-wider">Categorias</h3>
            <ul className="space-y-3 text-sm text-brand-light/80">
              <li><Link to="/produtos?cat=Material de Construção" className="hover:text-white transition-colors">Material de Construção</Link></li>
              <li><Link to="/produtos?cat=Hidráulico" className="hover:text-white transition-colors">Hidráulico</Link></li>
              <li><Link to="/produtos?cat=Elétrico" className="hover:text-white transition-colors">Elétrico</Link></li>
              <li><Link to="/produtos?cat=Tintas" className="hover:text-white transition-colors">Tintas</Link></li>
              <li><Link to="/produtos?cat=Ferragens" className="hover:text-white transition-colors">Ferragens</Link></li>
            </ul>
          </div>

          {/* Col 3: Contato */}
          <div>
            <h3 className="text-lg font-bold mb-6 border-b border-brand-primary pb-2 uppercase tracking-wider">Contato</h3>
            <ul className="space-y-4 text-sm text-brand-light/80">
              <li className="flex items-start space-x-3">
                <MapPin size={18} className="text-brand-light shrink-0" />
                <span>Rua Joaquim Pereira, 189<br/>Centro, Fortim - CE</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone size={18} className="text-brand-light shrink-0" />
                <span>+55 (88) 98825-3050</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail size={18} className="text-brand-light shrink-0" />
                <span>fortimax@bol.com.br</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Horário */}
          <div>
            <h3 className="text-lg font-bold mb-6 border-b border-brand-primary pb-2 uppercase tracking-wider">Funcionamento</h3>
            <ul className="space-y-4 text-sm text-brand-light/80">
              <li className="flex items-start space-x-3">
                <Clock size={18} className="text-brand-light shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-white">Segunda a Sexta</p>
                  <p>07:30 às 11:30 / 13:30 às 17:30</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <Clock size={18} className="text-brand-light shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-white">Sábado</p>
                  <p>07:30 às 12:00</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <Clock size={18} className="text-brand-light shrink-0 mt-1 opacity-50" />
                <div>
                  <p className="font-bold text-white opacity-50">Domingo</p>
                  <p className="opacity-50">Fechado</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-brand-primary/30 pt-8 text-center text-xs text-brand-light/50">
          <p>© 2026 FORTIMAX Materiais de Construção. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

const WhatsAppButton = () => {
  const phoneNumber = '5588988253050';
  const message = 'Olá, vim pelo site da Fortimax e gostaria de mais informações.';
  const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="whatsapp-float">
      <Phone size={32} />
    </a>
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
    { name: 'Material de Construção', icon: '🏗️', color: 'bg-green-50' },
    { name: 'Hidráulico', icon: '🚰', color: 'bg-blue-50' },
    { name: 'Elétrico', icon: '⚡', color: 'bg-yellow-50' },
    { name: 'Tintas', icon: '🎨', color: 'bg-purple-50' },
    { name: 'Ferragens', icon: '🛠️', color: 'bg-gray-50' },
  ];

  return (
    <div className="space-y-16 pb-16 bg-brand-bg/30">
      {/* Hero Banner */}
      <section className="relative h-[500px] overflow-hidden">
        <img
          src="https://picsum.photos/seed/fortimax-banner/1920/1080"
          alt="Banner FORTIMAX"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-brand-dark/40 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-xl text-white space-y-6"
            >
              <h1 className="text-5xl font-extrabold leading-tight">
                Qualidade e Confiança para sua <span className="text-brand-light">Obra em Fortim</span>
              </h1>
              <p className="text-xl text-gray-100">
                Materiais de construção, hidráulicos, elétricos e muito mais com o melhor atendimento da região.
              </p>
              <div className="flex space-x-4">
                <Link to="/produtos" className="bg-brand-primary hover:bg-brand-dark text-white px-8 py-3 rounded-lg font-bold transition-all transform hover:scale-105">
                  Ver Produtos
                </Link>
                <Link to="/ofertas" className="bg-white hover:bg-gray-100 text-brand-dark px-8 py-3 rounded-lg font-bold transition-all transform hover:scale-105">
                  Ofertas do Dia
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-brand-dark uppercase tracking-tight">Categorias Principais</h2>
          <div className="h-1.5 w-24 bg-brand-primary mx-auto mt-3 rounded-full"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {categories.map((cat, idx) => (
            <Link
              key={idx}
              to={`/produtos?cat=${cat.name}`}
              className={`${cat.color} p-8 rounded-2xl flex flex-col items-center justify-center space-y-4 hover:shadow-xl transition-all transform hover:-translate-y-2 border border-brand-primary/10`}
            >
              <span className="text-4xl">{cat.icon}</span>
              <span className="font-bold text-brand-dark text-center text-sm uppercase">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-white py-16 border-y border-brand-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold text-brand-dark uppercase tracking-tight">Destaques Fortimax</h2>
              <p className="text-gray-500 mt-2">Os produtos mais procurados pelos nossos clientes</p>
            </div>
            <Link to="/produtos" className="text-brand-primary font-bold flex items-center hover:underline">
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

      {/* About Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="rounded-3xl overflow-hidden shadow-2xl relative group">
            <img
              src="https://picsum.photos/seed/fortimax-store/800/600"
              alt="Sobre a Fortimax"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-brand-primary/10 group-hover:bg-transparent transition-colors"></div>
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-black text-brand-dark uppercase">Sobre a Fortimax</h2>
            <div className="h-1.5 w-20 bg-brand-primary rounded-full"></div>
            <p className="text-gray-600 text-lg leading-relaxed">
              A Fortimax é uma loja especializada em materiais para construção e reforma, oferecendo produtos de qualidade para sua obra. Trabalhamos com uma grande variedade de materiais de construção, produtos hidráulicos, elétricos, tintas e ferragens, garantindo sempre bom atendimento e os melhores preços para nossos clientes.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-primary/10">
                <h4 className="font-black text-brand-primary text-3xl">Fortim</h4>
                <p className="text-sm text-gray-500 font-medium">Tradição Local</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-primary/10">
                <h4 className="font-black text-brand-primary text-3xl">Melhor</h4>
                <p className="text-sm text-gray-500 font-medium">Preço da Região</p>
              </div>
            </div>
            <Link to="/contato" className="inline-block bg-brand-dark text-white px-10 py-4 rounded-xl font-bold hover:bg-brand-primary transition-all shadow-lg shadow-brand-primary/20">
              Fale Conosco
            </Link>
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
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group flex flex-col h-full hover:shadow-xl transition-all"
    >
      <Link to={`/produto/${product.id}`} className="relative h-64 overflow-hidden block">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 bg-brand-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          {product.category}
        </div>
        {product.oferta && (
          <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg animate-pulse uppercase tracking-wider">
            OFERTA
          </div>
        )}
      </Link>
      <div className="p-6 flex flex-col flex-grow">
        <Link to={`/produto/${product.id}`} className="text-lg font-bold text-brand-dark hover:text-brand-primary transition-colors line-clamp-2 mb-2 uppercase text-sm tracking-tight">
          {product.name}
        </Link>
        <div className="flex items-center space-x-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
          ))}
          <span className="text-xs text-gray-400 ml-2 font-medium">(4.8)</span>
        </div>
        <div className="mt-auto">
          <div className="flex flex-col mb-4">
            {product.oldPrice && (
              <span className="text-sm text-gray-400 line-through font-medium">
                De: R$ {product.oldPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
            <div className="text-2xl font-black text-brand-dark">
              {product.oldPrice ? 'Por: ' : ''}R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to={`/produto/${product.id}`}
              className="text-center py-2.5 border border-brand-dark text-brand-dark rounded-lg text-xs font-bold hover:bg-brand-bg transition-colors uppercase tracking-wider"
            >
              Detalhes
            </Link>
            <button
              onClick={() => addToCart(product)}
              className="bg-brand-primary text-white py-2.5 rounded-lg text-xs font-bold hover:bg-brand-dark transition-colors flex items-center justify-center space-x-2 uppercase tracking-wider"
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

  const categories = ['Todos', 'Material de Construção', 'Hidráulico', 'Elétrico', 'Tintas', 'Ferragens'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 space-y-6 md:space-y-0">
        <div>
          <h1 className="text-4xl font-black text-brand-dark uppercase">Nossos Produtos</h1>
          <p className="text-gray-500 mt-2 font-medium">Qualidade Fortimax para sua obra</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all uppercase tracking-wider ${
                activeCategory === cat
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-brand-primary hover:text-brand-primary'
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
        <div className="text-center py-20 bg-brand-bg/50 rounded-3xl border-2 border-dashed border-gray-200">
          <Search size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 uppercase">Nenhum produto encontrado</h3>
          <p className="text-gray-500 mt-2">Tente ajustar seus filtros ou busca.</p>
          <button
            onClick={() => { setActiveCategory('Todos'); setSearchTerm(''); }}
            className="mt-6 text-brand-primary font-bold hover:underline uppercase text-sm tracking-widest"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}
    </div>
  );
};

const OffersPage = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data.filter((p: Product) => p.oferta));
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-black text-brand-dark uppercase">Ofertas Imperdíveis</h1>
        <p className="text-gray-500 mt-4 text-lg font-medium">Aproveite os melhores preços da Fortimax!</p>
        <div className="h-1.5 w-24 bg-red-600 mx-auto mt-4 rounded-full"></div>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-brand-bg/50 rounded-3xl border-2 border-dashed border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 uppercase">Não há ofertas no momento</h3>
          <p className="text-gray-500 mt-2">Fique atento, novas promoções em breve!</p>
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

  if (!product) return <div className="h-screen flex items-center justify-center font-bold text-brand-dark">Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl overflow-hidden border border-gray-100 shadow-sm bg-white">
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
                  activeImage === idx ? 'border-brand-primary shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
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
            <div className="text-brand-primary font-bold text-sm uppercase tracking-widest mb-2">{product.category}</div>
            <h1 className="text-4xl font-black text-brand-dark leading-tight uppercase">{product.name}</h1>
            <div className="flex items-center mt-4 space-x-4">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => <Star key={i} size={18} className="fill-current" />)}
              </div>
              <span className="text-gray-400 text-sm font-medium">(4.9 de 5.0)</span>
            </div>
          </div>

          <div className="flex flex-col">
            {product.oldPrice && (
              <span className="text-lg text-gray-400 line-through font-medium">
                De: R$ {product.oldPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
            <div className="text-5xl font-black text-brand-dark">
              {product.oldPrice ? 'Por: ' : ''}R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <p className="text-gray-600 text-lg leading-relaxed">
            {product.description}
          </p>

          <div className="bg-brand-bg p-6 rounded-2xl border border-brand-primary/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-brand-dark font-bold uppercase text-sm">Disponibilidade:</span>
              <span className="text-brand-primary font-bold flex items-center text-sm uppercase">
                <span className="w-2.5 h-2.5 bg-brand-primary rounded-full mr-2 animate-pulse"></span>
                Em estoque ({product.stock} unidades)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-brand-dark font-bold uppercase text-sm">Entrega:</span>
              <span className="text-gray-600 text-sm font-medium">Fortim e Região</span>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => addToCart(product)}
              className="flex-1 bg-brand-primary hover:bg-brand-dark text-white py-5 rounded-xl font-bold text-lg transition-all shadow-xl shadow-brand-primary/20 flex items-center justify-center space-x-3 uppercase tracking-widest"
            >
              <ShoppingCart size={24} />
              <span>Adicionar ao Carrinho</span>
            </button>
            <button className="p-5 border border-gray-200 rounded-xl hover:bg-brand-bg transition-colors group">
              <Star size={24} className="text-gray-300 group-hover:text-yellow-400 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CartPage = () => {
  const { cart, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();

  const handleCheckout = () => {
    const phoneNumber = '5588988253050';
    let message = 'Olá, gostaria de fazer um pedido.\n\nProdutos selecionados:\n';
    
    cart.forEach(item => {
      message += `- ${item.quantity}x ${item.name}\n`;
    });

    message += `\nTotal aproximado: R$ ${totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nPoderia confirmar disponibilidade?`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 text-center">
        <div className="bg-brand-bg rounded-3xl p-16 max-w-2xl mx-auto border border-brand-primary/5">
          <ShoppingCart size={80} className="mx-auto text-gray-200 mb-6" />
          <h2 className="text-3xl font-black text-brand-dark uppercase">Seu carrinho está vazio</h2>
          <p className="text-gray-500 mt-4 font-medium">Que tal conferir nossas ofertas e começar a construir?</p>
          <Link to="/produtos" className="inline-block mt-8 bg-brand-primary text-white px-10 py-4 rounded-xl font-bold hover:bg-brand-dark transition-all uppercase tracking-widest">
            Ver Produtos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-black text-brand-dark mb-12 uppercase">Seu Carrinho</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {cart.map(item => (
            <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center space-x-6 shadow-sm hover:shadow-md transition-all">
              <img src={item.images[0]} alt={item.name} className="w-24 h-24 object-cover rounded-xl bg-brand-bg" referrerPolicy="no-referrer" />
              <div className="flex-grow">
                <h3 className="font-bold text-brand-dark text-lg uppercase text-sm tracking-tight">{item.name}</h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">{item.category}</p>
                <div className="mt-2 text-brand-primary font-black">
                  R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-brand-bg"><Minus size={16} /></button>
                  <span className="px-4 font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-brand-bg"><Plus size={16} /></button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-2 transition-colors">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
          <button onClick={clearCart} className="text-gray-400 text-xs font-bold hover:text-red-500 transition-colors uppercase tracking-widest">
            Limpar Carrinho
          </button>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-brand-primary/10 shadow-xl h-fit space-y-6">
          <h3 className="text-xl font-black text-brand-dark border-b pb-4 uppercase tracking-wider">Resumo do Pedido</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-gray-600 font-medium">
              <span>Subtotal</span>
              <span>R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-gray-600 font-medium">
              <span>Frete (Fortim)</span>
              <span className="text-brand-primary font-bold uppercase text-xs">Grátis</span>
            </div>
            <div className="border-t border-brand-primary/10 pt-4 flex justify-between text-2xl font-black text-brand-dark">
              <span>Total</span>
              <span>R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <button 
            onClick={handleCheckout}
            className="w-full bg-brand-primary hover:bg-brand-dark text-white py-5 rounded-xl font-bold text-lg transition-all shadow-xl shadow-brand-primary/20 flex items-center justify-center space-x-3 uppercase tracking-widest"
          >
            <Phone size={20} />
            <span>Finalizar no WhatsApp</span>
          </button>
          <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Você será redirecionado para o WhatsApp da Fortimax.
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
            <h1 className="text-4xl font-black text-brand-dark uppercase">Fale Conosco</h1>
            <p className="text-gray-500 mt-4 font-medium">Estamos prontos para tirar suas dúvidas e ajudar no seu projeto.</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-brand-bg p-4 rounded-2xl text-brand-primary border border-brand-primary/10">
                <Phone size={24} />
              </div>
              <div>
                <h4 className="font-black text-brand-dark uppercase text-sm">Telefone e WhatsApp</h4>
                <p className="text-gray-500 font-medium">+55 (88) 98825-3050</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-brand-bg p-4 rounded-2xl text-brand-primary border border-brand-primary/10">
                <Mail size={24} />
              </div>
              <div>
                <h4 className="font-black text-brand-dark uppercase text-sm">E-mail</h4>
                <p className="text-gray-500 font-medium">fortimax@bol.com.br</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-brand-bg p-4 rounded-2xl text-brand-primary border border-brand-primary/10">
                <MapPin size={24} />
              </div>
              <div>
                <h4 className="font-black text-brand-dark uppercase text-sm">Endereço</h4>
                <p className="text-gray-500 font-medium">Rua Joaquim Pereira, 189 - Centro, Fortim - CE</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-brand-bg p-4 rounded-2xl text-brand-primary border border-brand-primary/10">
                <Instagram size={24} />
              </div>
              <div>
                <h4 className="font-black text-brand-dark uppercase text-sm">Instagram</h4>
                <p className="text-gray-500 font-medium">@Fortimaxloja</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-10 rounded-3xl shadow-2xl border border-brand-primary/5">
          <form className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Nome Completo</label>
                <input type="text" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" placeholder="Seu nome" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-brand-dark uppercase tracking-wider">E-mail</label>
                <input type="email" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" placeholder="seu@email.com" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Assunto</label>
              <select className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30">
                <option>Dúvida sobre produto</option>
                <option>Orçamento de material</option>
                <option>Reclamação/Sugestão</option>
                <option>Outros</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Mensagem</label>
              <textarea rows={4} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" placeholder="Como podemos ajudar?"></textarea>
            </div>
            <button className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold hover:bg-brand-dark transition-all shadow-xl shadow-brand-primary/20 uppercase tracking-widest">
              Enviar Mensagem
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- Admin Components ---

const LoginPage = () => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(usuario, senha);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-brand-bg/30 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl border border-brand-primary/10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-brand-dark uppercase">Acesso Restrito</h1>
          <p className="text-gray-500 mt-2 font-medium">Painel Administrativo Fortimax</p>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold flex items-center space-x-2">
            <XCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Usuário</label>
            <input 
              type="text" 
              name="usuario"
              required
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" 
              placeholder="Digite seu usuário"
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Senha</label>
            <input 
              type="password" 
              name="senha"
              required
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none bg-brand-bg/30" 
              placeholder="Digite sua senha"
              value={senha}
              onChange={e => setSenha(e.target.value)}
            />
          </div>
          <button className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold hover:bg-brand-dark transition-all shadow-xl shadow-brand-primary/20 uppercase tracking-widest">
            Entrar no Painel
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Produtos', icon: Package, path: '/admin/produtos' },
    { name: 'Usuários', icon: Users, path: '/admin/usuarios', adminOnly: true },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-brand-bg/20 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-brand-dark text-white flex flex-col">
        <div className="p-6 border-b border-brand-primary/20">
          <Link to="/" className="flex items-center">
            <img src="/static/img/logo.png" alt="FORTIMAX" className="h-10 brightness-0 invert" onError={e => (e.target as any).src = "/static/img/logo_padrao.png"} />
          </Link>
          <div className="mt-4">
            <p className="text-xs font-bold text-brand-light uppercase tracking-widest">Olá, {user?.nome}</p>
            <p className="text-[10px] text-brand-light/60 uppercase">{user?.nivel === 'administrador' ? 'Administrador' : 'Gerente'}</p>
          </div>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          {menuItems.map(item => {
            if (item.adminOnly && user?.nivel !== 'administrador') return null;
            const active = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold text-sm uppercase tracking-wider ${
                  active ? 'bg-brand-primary text-white shadow-lg' : 'text-brand-light/60 hover:bg-brand-primary/10 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-brand-primary/20">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all font-bold text-sm uppercase tracking-wider"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-grow p-6 md:p-10">
        {children}
      </main>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/stats').then(res => res.json()).then(setStats);
  }, []);

  if (!stats) return <div>Carregando...</div>;

  const cards = [
    { name: 'Total de Produtos', value: stats.totalProducts, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Produtos Ativos', value: stats.activeProducts, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { name: 'Ofertas Ativas', value: stats.offersCount, icon: Tag, color: 'text-red-600', bg: 'bg-red-50' },
    { name: 'Usuários', value: stats.usersCount, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-brand-dark uppercase">Dashboard</h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-brand-primary/5 flex items-center space-x-6"
          >
            <div className={`${card.bg} ${card.color} p-4 rounded-2xl`}>
              <card.icon size={32} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{card.name}</p>
              <p className="text-3xl font-black text-brand-dark">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<any>({
    name: '', category: 'Material de Construção', price: '', oldPrice: '', oferta: false, description: '', stock: '', featured: false, active: true
  });
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const fetchProducts = () => {
    fetch('/api/admin/products').then(res => res.json()).then(setProducts);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({ ...p, oldPrice: p.oldPrice || '', stock: p.stock || 0 });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente remover este produto?')) {
      await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'images') return;
      data.append(key, formData[key]);
    });
    if (selectedFiles) {
      for (let i = 0; i < selectedFiles.length; i++) {
        data.append('images', selectedFiles[i]);
      }
    }
    if (editingProduct) {
      data.append('existingImages', JSON.stringify(editingProduct.images));
      await fetch(`/api/admin/products/${editingProduct.id}`, { method: 'PUT', body: data });
    } else {
      await fetch('/api/admin/products', { method: 'POST', body: data });
    }
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({ name: '', category: 'Material de Construção', price: '', oldPrice: '', oferta: false, description: '', stock: '', featured: false, active: true });
    setSelectedFiles(null);
    fetchProducts();
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-brand-dark uppercase">Produtos</h1>
        <button 
          onClick={() => { setEditingProduct(null); setFormData({ name: '', category: 'Material de Construção', price: '', oldPrice: '', oferta: false, description: '', stock: '', featured: false, active: true }); setIsModalOpen(true); }}
          className="bg-brand-primary text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-brand-dark transition-all uppercase tracking-widest text-sm"
        >
          <PlusCircle size={20} />
          <span>Adicionar Produto</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-brand-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-brand-bg/50 text-brand-dark text-xs font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Preço</th>
                <th className="px-6 py-4">Estoque</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-brand-bg/20 transition-colors">
                  <td className="px-6 py-4 flex items-center space-x-4">
                    <img src={p.images[0]} className="w-10 h-10 rounded-lg object-cover bg-brand-bg" onError={e => (e.target as any).src = "https://via.placeholder.com/100"} />
                    <span className="font-bold text-brand-dark">{p.name}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-medium">{p.category}</td>
                  <td className="px-6 py-4 font-bold text-brand-primary">R$ {p.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-500 font-medium">{p.stock} un</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${p.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleEdit(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-brand-dark uppercase">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-brand-dark"><X size={28} /></button>
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Nome do Produto</label>
                  <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Categoria</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option>Material de Construção</option>
                    <option>Hidráulico</option>
                    <option>Elétrico</option>
                    <option>Tintas</option>
                    <option>Ferragens</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Preço (R$)</label>
                  <input required type="number" step="0.01" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Preço Antigo (Opcional)</label>
                  <input type="number" step="0.01" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.oldPrice} onChange={e => setFormData({...formData, oldPrice: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Estoque</label>
                  <input required type="number" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Imagens</label>
                  <input type="file" multiple className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" onChange={e => setSelectedFiles(e.target.files)} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Descrição</label>
                  <textarea rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                </div>
                <div className="flex flex-wrap gap-6 md:col-span-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 text-brand-primary rounded" checked={formData.oferta} onChange={e => setFormData({...formData, oferta: e.target.checked})} />
                    <span className="text-xs font-black text-brand-dark uppercase tracking-wider">Oferta</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 text-brand-primary rounded" checked={formData.featured} onChange={e => setFormData({...formData, featured: e.target.checked})} />
                    <span className="text-xs font-black text-brand-dark uppercase tracking-wider">Destaque</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 text-brand-primary rounded" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                    <span className="text-xs font-black text-brand-dark uppercase tracking-wider">Ativo</span>
                  </label>
                </div>
                <div className="md:col-span-2 flex justify-end space-x-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 uppercase tracking-widest text-xs">Cancelar</button>
                  <button type="submit" className="px-10 py-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-dark shadow-xl shadow-brand-primary/20 uppercase tracking-widest text-xs">Salvar Produto</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: '', usuario: '', senha: '', nivel: 'gerente', ativo: true });
  const { user: currentUser } = useAuth();

  const fetchUsers = () => {
    fetch('/api/admin/users').then(res => res.json()).then(setUsers);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: number) => {
    if (id === currentUser?.id) return alert('Você não pode remover a si mesmo!');
    if (confirm('Deseja realmente remover este usuário?')) {
      await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setIsModalOpen(false);
      setFormData({ nome: '', usuario: '', senha: '', nivel: 'gerente', ativo: true });
      fetchUsers();
    } else {
      const err = await res.json();
      alert(err.error);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-brand-dark uppercase">Usuários</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-primary text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-brand-dark transition-all uppercase tracking-widest text-sm"
        >
          <PlusCircle size={20} />
          <span>Novo Usuário</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-brand-primary/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-brand-bg/50 text-brand-dark text-xs font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Nível</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-brand-bg/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-brand-dark">{u.nome}</td>
                  <td className="px-6 py-4 text-gray-500 font-medium">{u.usuario}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.nivel === 'administrador' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                      {u.nivel === 'administrador' ? 'Administrador' : 'Gerente'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.ativo ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-brand-dark uppercase">Novo Usuário</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-brand-dark"><X size={28} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Nome</label>
                  <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Usuário</label>
                  <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.usuario} onChange={e => setFormData({...formData, usuario: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Senha Inicial</label>
                  <input required type="password" title="Mínimo 6 caracteres" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.senha} onChange={e => setFormData({...formData, senha: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Nível de Acesso</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.nivel} onChange={e => setFormData({...formData, nivel: e.target.value as any})}>
                    <option value="gerente">Gerente (Produtos/Ofertas)</option>
                    <option value="administrador">Administrador (Total)</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 text-brand-primary rounded" checked={formData.ativo} onChange={e => setFormData({...formData, ativo: e.target.checked})} />
                  <span className="text-xs font-black text-brand-dark uppercase tracking-wider">Ativo</span>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 uppercase tracking-widest text-xs">Cancelar</button>
                  <button type="submit" className="px-10 py-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-dark shadow-xl shadow-brand-primary/20 uppercase tracking-widest text-xs">Criar Usuário</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

const AnimatedRoutes = () => {
  const location = useLocation();
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="h-screen flex items-center justify-center font-bold text-brand-primary uppercase animate-pulse">Fortimax...</div>;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Routes location={location}>
          {/* Public Routes */}
          <Route path="/" element={<><Header /><main className="flex-grow"><HomePage /></main><Footer /><WhatsAppButton /></>} />
          <Route path="/produtos" element={<><Header /><main className="flex-grow"><ProductsPage /></main><Footer /><WhatsAppButton /></>} />
          <Route path="/produto/:id" element={<><Header /><main className="flex-grow"><ProductDetailPage /></main><Footer /><WhatsAppButton /></>} />
          <Route path="/ofertas" element={<><Header /><main className="flex-grow"><OffersPage /></main><Footer /><WhatsAppButton /></>} />
          <Route path="/contato" element={<><Header /><main className="flex-grow"><ContactPage /></main><Footer /><WhatsAppButton /></>} />
          <Route path="/carrinho" element={<><Header /><main className="flex-grow"><CartPage /></main><Footer /><WhatsAppButton /></>} />
          <Route path="/login" element={<><Header /><main className="flex-grow"><LoginPage /></main><Footer /><WhatsAppButton /></>} />

          {/* Admin Routes (Protected) */}
          <Route path="/admin" element={user ? <AdminLayout><AdminDashboard /></AdminLayout> : <Navigate to="/login" />} />
          <Route path="/admin/produtos" element={user ? <AdminLayout><AdminProducts /></AdminLayout> : <Navigate to="/login" />} />
          <Route path="/admin/usuarios" element={user?.nivel === 'administrador' ? <AdminLayout><AdminUsers /></AdminLayout> : <Navigate to="/admin" />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const Navigate = ({ to }: { to: string }) => {
  const navigate = useNavigate();
  useEffect(() => { navigate(to); }, [navigate, to]);
  return null;
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-brand-light selection:text-brand-dark">
            <AnimatedRoutes />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
