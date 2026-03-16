import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, Phone, Mail, MapPin, Facebook, Instagram, Twitter, ChevronRight, Trash2, Plus, Minus, Clock, LayoutDashboard, Package, Tag, Users, LogOut, LogIn, PlusCircle, Edit, CheckCircle, XCircle, Filter, ChevronDown, ChevronLeft, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CartItem, User, Category } from './types';

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

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, [pathname]);

  return null;
};

const Header = () => {
  const { totalItems } = useCart();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inicioLabel, setInicioLabel] = useState('INÍCIO');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/config/LABEL_INICIO')
      .then(res => res.json())
      .then(data => {
        if (data.valor) setInicioLabel(data.valor);
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Global search resets filters and goes to /produtos
      navigate(`/produtos?search=${encodeURIComponent(searchQuery.trim())}&page=1`);
      setSearchQuery('');
      setIsMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 md:h-24">
          {/* Logo */}
          <Link to="/" className="flex items-center" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img 
              src="/img/logo.png" 
              alt="FORTIMAX" 
              className="h-10 md:h-14 w-auto"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8 font-bold text-gray-700 uppercase text-xs lg:text-sm tracking-wide">
            <Link 
              to="/" 
              className="hover:text-brand-primary transition-colors"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              {inicioLabel}
            </Link>
            <Link to="/produtos" className="hover:text-brand-primary transition-colors" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Produtos</Link>
            <Link to="/ofertas" className="hover:text-brand-primary transition-colors" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Ofertas</Link>
            <Link to="/contato" className="hover:text-brand-primary transition-colors" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Contato</Link>
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

          {/* Desktop Search & Cart */}
          <div className="hidden md:flex items-center space-x-6">
            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                placeholder="Buscar materiais..."
                className="pl-4 pr-16 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-primary w-64 transition-all focus:w-80"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
                <button type="submit" className="p-1 text-gray-400 hover:text-brand-primary transition-colors">
                  <Search size={20} />
                </button>
              </div>
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

          {/* Mobile Cart & Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <Link to="/carrinho" className="relative text-gray-700">
              <ShoppingCart size={24} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-primary text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-700 p-1">
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar - Always visible on mobile below logo row */}
        <div className="md:hidden pb-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Buscar materiais..."
              className="w-full pl-4 pr-16 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary bg-gray-50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X size={18} />
                </button>
              )}
              <button type="submit" className="p-1 text-gray-400">
                <Search size={20} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] md:hidden"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
            
            {/* Menu Content */}
            <div className="absolute right-0 top-0 bottom-0 w-4/5 max-w-sm bg-white shadow-2xl flex flex-col">
              <div className="p-6 flex justify-between items-center border-b border-gray-100">
                <span className="font-black text-brand-dark uppercase tracking-widest">Menu</span>
                <button onClick={() => setIsMenuOpen(false)} className="text-gray-500">
                  <X size={24} />
                </button>
              </div>
              
              <nav className="flex-grow p-6 flex flex-col space-y-6 font-bold text-gray-700 uppercase text-lg">
                <Link 
                  to="/" 
                  onClick={() => { setIsMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                  className="hover:text-brand-primary flex items-center justify-between"
                >
                  <span>{inicioLabel}</span>
                  <ChevronRight size={20} className="text-gray-300" />
                </Link>
                <Link to="/produtos" onClick={() => { setIsMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-brand-primary flex items-center justify-between">
                  <span>Produtos</span>
                  <ChevronRight size={20} className="text-gray-300" />
                </Link>
                <Link to="/ofertas" onClick={() => { setIsMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-brand-primary flex items-center justify-between">
                  <span>Ofertas</span>
                  <ChevronRight size={20} className="text-gray-300" />
                </Link>
                <Link to="/contato" onClick={() => { setIsMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-brand-primary flex items-center justify-between">
                  <span>Contato</span>
                  <ChevronRight size={20} className="text-gray-300" />
                </Link>
                
                <div className="pt-6 border-t border-gray-100">
                  {user ? (
                    <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="text-brand-primary flex items-center space-x-3">
                      <LayoutDashboard size={24} />
                      <span>Painel de Acesso</span>
                    </Link>
                  ) : (
                    <Link to="/login" onClick={() => setIsMenuOpen(false)} className="text-brand-primary flex items-center space-x-3">
                      <LogIn size={24} />
                      <span>Entrar / Login</span>
                    </Link>
                  )}
                </div>
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
                src="/img/logo.png" 
                alt="FORTIMAX" 
                className="logo brightness-0 invert"
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
        <div className="border-t border-brand-primary/30 pt-8 text-center text-xs text-brand-light/50 space-y-2">
          <p>© 2026 FORTIMAX Materiais de Construção. Todos os direitos reservados.</p>
          <p className="font-bold tracking-widest">CNPJ: 07.639.148/0001-10</p>
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
  const [dbCategories, setDbCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.products) {
          setFeaturedProducts(data.products.filter((p: Product) => p.featured).slice(0, 4));
        }
      });

    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setDbCategories(data));
  }, []);

  const categories = [
    { name: 'Material de Construção', icon: '🏗️', color: 'bg-orange-50' },
    { name: 'Hidráulico', icon: '🚰', color: 'bg-blue-50' },
    { name: 'Elétrico', icon: '⚡', color: 'bg-yellow-50' },
    { name: 'Tintas', icon: '🎨', color: 'bg-pink-50' },
    { name: 'Ferragens', icon: '🛠️', color: 'bg-gray-50' },
  ];

  // Merge icons with DB categories
  const displayCategories = dbCategories.map(dbCat => {
    const staticCat = categories.find(c => c.name === dbCat.name);
    return {
      ...dbCat,
      icon: staticCat?.icon || '📦',
      color: staticCat?.color || 'bg-brand-bg'
    };
  });

  return (
    <div className="space-y-12 md:space-y-16 pb-16 bg-brand-bg/30">
      {/* Hero Banner */}
      <section className="relative h-[400px] md:h-[500px] overflow-hidden">
        <img
          src="/img/fortimax.png"
          alt="Banner FORTIMAX"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-brand-dark/50 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl text-white space-y-4 md:space-y-6"
            >
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight uppercase tracking-tighter">
                Qualidade e Confiança para sua <span className="text-brand-light">Obra em Fortim</span>
              </h1>
              <p className="text-base md:text-xl text-gray-100 max-w-lg font-medium">
                Materiais de construção, hidráulicos, elétricos e muito mais com o melhor atendimento da região.
              </p>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                <Link to="/produtos" className="bg-brand-primary hover:bg-brand-dark text-white px-8 py-3.5 rounded-xl font-bold transition-all text-center uppercase tracking-widest text-sm shadow-lg shadow-brand-primary/30">
                  Ver Produtos
                </Link>
                <Link to="/ofertas" className="bg-white hover:bg-gray-100 text-brand-dark px-8 py-3.5 rounded-xl font-bold transition-all text-center uppercase tracking-widest text-sm shadow-lg">
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
          {displayCategories.map((cat, idx) => (
            <Link
              key={idx}
              // Tenta usar cat.name, se não existir usa cat.label (que é o que vem do servidor agora)
              to={`/produtos?cat=${cat.name || cat.label}`} 
              className={`${cat.color} p-8 rounded-2xl flex flex-col items-center justify-center space-y-4 hover:shadow-xl transition-all transform hover:-translate-y-2 border border-brand-primary/10`}
            >
              <span className="text-4xl">{cat.icon}</span>
              {/* Aqui também, garanta que o texto apareça */}
              <span className="font-bold text-brand-dark text-center text-sm uppercase">
                {cat.name || cat.label}
              </span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
              src="/img/fortimax.png"
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

  // Lógica para tratar o campo images que vem como string JSON do SQLite
  const getImageUrl = (imagesData: any) => {
    try {
      if (typeof imagesData === 'string') {
        const parsed = JSON.parse(imagesData); // Converte '["..."]' em um array real
        return parsed[0];
      }
      return imagesData[0]; // Se já for um array, retorna o primeiro
    } catch (e) {
      return "/img/logo.png"; // Fallback se o JSON estiver corrompido
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group flex flex-col h-full hover:shadow-xl transition-all"
    >
      <Link to={`/produto/${product.id}`} className="relative h-48 md:h-64 overflow-hidden block">
        <img
          src={getImageUrl(product.images)}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        {product.oferta && (
          <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-red-600 text-white text-[8px] md:text-[10px] font-black px-2 py-1 md:px-3 md:py-1.5 rounded-full shadow-xl animate-pulse uppercase tracking-widest border border-white/20">
            PROMOÇÃO
          </div>
        )}
      </Link>
      <div className="p-4 md:p-6 flex flex-col flex-grow">
        <Link to={`/produto/${product.id}`} className="font-bold text-brand-dark hover:text-brand-primary transition-colors line-clamp-2 mb-3 md:mb-4 uppercase text-xs md:text-sm tracking-tight leading-tight">
          {product.name}
        </Link>
        <div className="mt-auto">
          <div className="flex flex-col mb-3 md:mb-4">
            {product.oldPrice && (
              <span className="text-[10px] md:text-sm text-gray-400 line-through font-medium">
                De: R$ {product.oldPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
            <div className="price-fluid font-black text-brand-dark">
              <p>R$ {product.price ? Number(product.price).toFixed(2) : "0.00"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 md:gap-2">
            <Link
              to={`/produto/${product.id}`}
              className="text-center py-1.5 md:py-2.5 border border-brand-dark text-brand-dark rounded-lg text-[10px] md:text-xs font-bold hover:bg-brand-bg transition-colors uppercase tracking-wider truncate px-1"
            >
              Detalhes
            </Link>
            <button
              onClick={() => addToCart(product)}
              className="bg-brand-primary text-white py-1.5 md:py-2.5 rounded-lg text-[10px] md:text-xs font-bold hover:bg-brand-dark transition-colors flex items-center justify-center space-x-1 md:space-x-2 uppercase tracking-wider truncate px-1"
            >
              <ShoppingCart size={14} className="md:w-4 md:h-4" />
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
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(searchParams.get('cat') || 'Todos');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [totalPages, setTotalPages] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Sync state with URL parameters
  useEffect(() => {
    setActiveCategory(searchParams.get('cat') || 'Todos');
    setSearchTerm(searchParams.get('search') || '');
    setCurrentPage(parseInt(searchParams.get('page') || '1'));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (activeCategory !== 'Todos') {
      // MUDE ESTA LINHA: Em vez de buscar o ID, envie o NOME diretamente
      // E mude de 'categoryId' para 'category'
      params.append('category', activeCategory); 
    }
    if (searchTerm) params.append('search', searchTerm);
    params.append('page', currentPage.toString());
    params.append('limit', '40');

      fetch(`/api/products?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        // CORREÇÃO: Altere de data.produtos para data.products
        console.log("Dados recebidos da API:", data); // Isso vai confirmar o formato no F12
        
        setProducts(data.products || []); // O '|| []' previne que o app quebre se vier vazio
        setTotalPages(data.pagination?.totalPages || 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }, [activeCategory, searchTerm, currentPage, dbCategories]);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setDbCategories(data));
  }, []);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
    setIsFilterOpen(false);
    setSearchParams({ cat, search: searchTerm, page: '1' });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSearchParams({ cat: activeCategory, search: searchTerm, page: page.toString() });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 space-y-6 md:space-y-0">
        <div>
          <h1 className="text-4xl font-black text-brand-dark uppercase">Nossos Produtos</h1>
          <p className="text-gray-500 mt-2 font-medium">Qualidade Fortimax para sua obra</p>
        </div>
        
        {/* Dropdown Filter */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center justify-between w-full md:w-64 px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-brand-dark hover:border-brand-primary transition-all uppercase text-sm tracking-widest shadow-sm"
          >
            <div className="flex items-center">
              <Filter size={18} className="mr-3 text-brand-primary" />
              <span>{activeCategory === 'Todos' ? 'Todas Categorias' : activeCategory}</span>
            </div>
            <ChevronDown size={18} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFilterOpen && (
            <div className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => handleCategoryChange('Todos')}
                className={`w-full text-left px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-brand-bg transition-colors ${activeCategory === 'Todos' ? 'text-brand-primary bg-brand-bg' : 'text-gray-600'}`}
              >
                Todos os Produtos
              </button>
              {dbCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.name)}
                  className={`w-full text-left px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-brand-bg transition-colors ${activeCategory === cat.name ? 'text-brand-primary bg-brand-bg' : 'text-gray-600'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-16 flex justify-center items-center space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-brand-bg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                    currentPage === i + 1
                      ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-brand-primary hover:text-brand-primary'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-brand-bg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-brand-bg/50 rounded-3xl border-2 border-dashed border-gray-200">
          <Search size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 uppercase">Nenhum produto encontrado</h3>
          <p className="text-gray-500 mt-2">Tente ajustar seus filtros ou busca.</p>
          <button
            onClick={() => setSearchParams({})}
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
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(searchParams.get('cat') || 'Todos');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [totalPages, setTotalPages] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Sync state with URL parameters
  useEffect(() => {
    setActiveCategory(searchParams.get('cat') || 'Todos');
    setSearchTerm(searchParams.get('search') || '');
    setCurrentPage(parseInt(searchParams.get('page') || '1'));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (activeCategory !== 'Todos') {
      // MUDE ESTA LINHA: Em vez de buscar o ID, envie o NOME diretamente
      // E mude de 'categoryId' para 'category'
      params.append('category', activeCategory); 
    }
    if (searchTerm) params.append('search', searchTerm);
    params.append('page', currentPage.toString());
    params.append('limit', '40');
    params.append('onlyOffers', 'true');

    fetch(`/api/products?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        // CORREÇÃO: Mude de data.produtos para data.products
        console.log("DEBUG API OFERTAS:", data); // Isso ajudará a ver o que chega
        
        // Se 'data.products' não existir, usamos um array vazio para não quebrar o .map()
        setProducts(data.products || []); 
        
        // Verifique se o pagination existe para evitar erro
        setTotalPages(data.pagination?.totalPages || 1);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(err => {
        console.error("Erro ao buscar ofertas:", err);
        setProducts([]); // Garante que a tela não quebre se a API falhar
      });
  }, [activeCategory, searchTerm, currentPage, dbCategories]);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setDbCategories(data));
  }, []);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
    setIsFilterOpen(false);
    setSearchParams({ cat, search: searchTerm, page: '1' });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSearchParams({ cat: activeCategory, search: searchTerm, page: page.toString() });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 space-y-6 md:space-y-0">
        <div>
          <h1 className="text-4xl font-black text-brand-dark uppercase tracking-tighter">Ofertas <span className="text-red-600">Imperdíveis</span></h1>
          <p className="text-gray-500 mt-2 font-medium">Os melhores preços da Fortimax para você</p>
          <div className="h-1.5 w-24 bg-red-600 mt-4 rounded-full"></div>
        </div>
        
        {/* Dropdown Filter */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center justify-between w-full md:w-64 px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-brand-dark hover:border-brand-primary transition-all uppercase text-sm tracking-widest shadow-sm"
          >
            <div className="flex items-center">
              <Filter size={18} className="mr-3 text-brand-primary" />
              <span>{activeCategory === 'Todos' ? 'Todas Categorias' : activeCategory}</span>
            </div>
            <ChevronDown size={18} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFilterOpen && (
            <div className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => handleCategoryChange('Todos')}
                className={`w-full text-left px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-brand-bg transition-colors ${activeCategory === 'Todos' ? 'text-brand-primary bg-brand-bg' : 'text-gray-600'}`}
              >
                Todos os Produtos em Oferta
              </button>
              {dbCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.name)}
                  className={`w-full text-left px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-brand-bg transition-colors ${activeCategory === cat.name ? 'text-brand-primary bg-brand-bg' : 'text-gray-600'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-16 flex justify-center items-center space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-brand-bg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                    currentPage === i + 1
                      ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-brand-primary hover:text-brand-primary'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-brand-bg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-brand-bg/50 rounded-3xl border-2 border-dashed border-gray-200">
          <Tag size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 uppercase">Não há ofertas no momento</h3>
          <p className="text-gray-500 mt-2">Fique atento, novas promoções em breve!</p>
          <button
            onClick={() => setSearchParams({})}
            className="mt-6 text-brand-primary font-bold hover:underline uppercase text-sm tracking-widest"
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
    .then(data => {
      // Como o backend agora retorna os campos com os nomes corretos 
      // (name, price, oldPrice, images, etc), basta salvar direto:
      setProduct(data);
    })
    .catch(() => navigate('/produtos'));
}, [id, navigate]);

  if (!product) return <div className="h-screen flex items-center justify-center font-bold text-brand-dark">Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl md:rounded-3xl overflow-hidden border border-gray-100 shadow-sm bg-white">
            <img
              src={product.images[activeImage]}
              alt={product.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex space-x-2 md:space-x-4 overflow-x-auto pb-2 scrollbar-hide">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={`flex-shrink-0 w-16 h-16 md:w-24 md:h-24 rounded-lg md:rounded-xl overflow-hidden border-2 transition-all ${
                  activeImage === idx ? 'border-brand-primary shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6 md:space-y-8">
          <div>
            <div className="text-brand-primary font-bold text-xs md:text-sm uppercase tracking-widest mb-1 md:mb-2">{product.category}</div>
            <h1 className="text-xl md:text-3xl lg:text-4xl font-black text-brand-dark leading-tight uppercase tracking-tight">{product.name}</h1>
          </div>

          <div className="flex flex-col">
            {product.oldPrice && (
              <span className="text-sm md:text-lg text-gray-400 line-through font-medium">
                De: R$ {product.oldPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
            <div className="text-3xl md:text-5xl font-black text-brand-dark tracking-tighter">
              <p>R$ {product.price ? Number(product.price).toFixed(2) : "0.00"}</p>
            </div>
          </div>

          <p className="text-gray-600 text-sm md:text-lg leading-relaxed">
            {product.description}
          </p>

          <div className="bg-brand-bg p-4 md:p-6 rounded-2xl border border-brand-primary/10 space-y-3 md:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-brand-dark font-bold uppercase text-[10px] md:text-xs tracking-wider">Disponibilidade:</span>
              <span className="text-brand-primary font-bold flex items-center text-xs md:text-sm uppercase whitespace-nowrap">
                <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-brand-primary rounded-full mr-2 animate-pulse"></span>
                Em estoque ({product.stock} unidades)
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-brand-dark font-bold uppercase text-[10px] md:text-xs tracking-wider">Entrega:</span>
              <span className="text-gray-600 text-xs md:text-sm font-medium uppercase">Fortim e Região</span>
            </div>
          </div>

          <div className="flex pt-4">
            <button
              onClick={() => addToCart(product)}
              className="w-full bg-brand-primary hover:bg-brand-dark text-white py-4 md:py-5 rounded-xl font-bold text-sm md:text-lg transition-all shadow-xl shadow-brand-primary/20 flex items-center justify-center space-x-3 uppercase tracking-widest"
            >
              <ShoppingCart size={20} className="md:w-6 md:h-6" />
              <span>Adicionar ao Carrinho</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CartPage = () => {
  const { cart, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();

  const handleCheckout = async () => {
    try {
      // AQUI ESTAVA O ERRO: mudamos para /api/checkout
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart.map(i => ({ id: i.id, quantity: i.quantity })) })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erro ao processar estoque. Verifique a disponibilidade.');
        return;
      }

      // Se chegou aqui, o estoque foi atualizado com sucesso no banco!
      // Agora montamos o link do WhatsApp
      const phoneNumber = '5588988253050';
      let message = '*NOVO PEDIDO - FORTIMAX*\n\n';
      message += 'Olá, gostaria de finalizar meu pedido:\n\n';
      
      cart.forEach(item => {
        message += `✅ ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      });

      message += `\n*TOTAL: R$ ${totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n`;
      message += '_Poderia confirmar a disponibilidade e o frete para minha região?_';

      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      
      window.open(whatsappUrl, '_blank');
      clearCart();
      
    } catch (e) {
      console.error(e);
      alert('Erro de conexão com o servidor.');
    }
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
      <h1 className="text-2xl md:text-4xl font-black text-brand-dark mb-8 md:mb-12 uppercase tracking-tight text-center md:text-left">Seu Carrinho</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {cart.map(item => (
            <div key={item.id} className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 shadow-sm hover:shadow-md transition-all box-border">
              <img src={item.images[0]} alt={item.name} className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl bg-brand-bg flex-shrink-0" referrerPolicy="no-referrer" />
              <div className="flex-grow text-center sm:text-left">
                <h3 className="font-bold text-brand-dark text-sm md:text-lg uppercase tracking-tight line-clamp-2">{item.name}</h3>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">{item.category}</p>
                <div className="mt-2 text-brand-primary font-black text-sm md:text-base">
                  R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-brand-bg"><Minus size={14} /></button>
                  <span className="px-3 md:px-4 font-bold text-sm">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-brand-bg"><Plus size={14} /></button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-2 transition-colors">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-center md:justify-start">
            <button onClick={clearCart} className="text-gray-400 text-[10px] font-bold hover:text-red-500 transition-colors uppercase tracking-widest">
              Limpar Carrinho
            </button>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-brand-primary/10 shadow-xl h-fit space-y-6 box-border">
          <h3 className="text-lg md:text-xl font-black text-brand-dark border-b pb-4 uppercase tracking-wider text-center md:text-left">Resumo do Pedido</h3>
          <div className="space-y-3 md:space-y-4">
            <div className="flex justify-between text-gray-600 font-medium text-sm md:text-base">
              <span>Subtotal</span>
              <span>R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t border-brand-primary/10 pt-4 flex justify-between text-xl md:text-2xl font-black text-brand-dark">
              <span>Total</span>
              <span>R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <p className="text-[9px] md:text-[10px] text-amber-800 font-bold uppercase leading-relaxed text-center">
              <span className="text-amber-600">ENTREGAS:</span> As condições de entrega para o Fortim devem ser combinadas diretamente com nosso vendedor da loja.
            </p>
          </div>

          <button 
            onClick={handleCheckout}
            className="w-full bg-brand-primary hover:bg-brand-dark text-white py-4 md:py-5 rounded-xl font-bold text-sm md:text-lg transition-all shadow-xl shadow-brand-primary/20 flex items-center justify-center space-x-3 uppercase tracking-widest"
          >
            <Phone size={18} className="flex-shrink-0" />
            <span className="whitespace-nowrap">Finalizar no WhatsApp</span>
          </button>
          <p className="text-center text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-wider">
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
    { name: 'Categorias', icon: List, path: '/admin/categorias' },
    { name: 'Usuários', icon: Users, path: '/admin/usuarios' },
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
            <img src="/img/logo.png" alt="FORTIMAX" className="h-10 brightness-0 invert" />
          </Link>
          <div className="mt-4">
            <p className="text-xs font-bold text-brand-light uppercase tracking-widest">Olá, {user?.nome}</p>
            <p className="text-[10px] text-brand-light/60 uppercase">
              {user?.nivel === 'admin' ? 'Administrador' : user?.nivel === 'gerente' ? 'Gerente' : 'Vendedor'}
            </p>
          </div>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          {menuItems.map(item => {
            // VENDEDOR only sees Products
            if (user?.nivel === 'vendedor' && item.name !== 'Produtos') return null;
            
            // GERENTE sees Dashboard and Products
            if (user?.nivel === 'gerente' && item.name === 'Usuários') return null;
            
            // ADMIN sees everything
            
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
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    
    if (user.nivel === 'vendedor') {
      navigate('/admin/produtos');
      return;
    }

    setLoading(true);
    fetch('/api/admin/stats')
      .then(async res => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Erro ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(setStats)
      .catch(err => {
        console.error('Detalhe do erro:', err.message);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const [error, setError] = useState<string | null>(null);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      <span className="ml-3 font-bold text-brand-dark uppercase tracking-widest">Carregando...</span>
    </div>
  );

  if (error) return (
    <div className="p-8 bg-red-50 text-red-600 rounded-2xl font-bold uppercase tracking-widest text-center border border-red-100">
      <p>Erro ao carregar estatísticas</p>
      <p className="text-xs mt-2 opacity-70">Detalhe: {error}</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl text-xs hover:bg-red-700 transition-colors"
      >
        Tentar Novamente
      </button>
    </div>
  );

  if (!stats) return null;

  const cards = [
    { name: 'Total de Produtos', value: stats.totalProducts, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Produtos Ativos', value: stats.activeProducts, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { name: 'Ofertas Ativas', value: stats.offersCount, icon: Tag, color: 'text-red-600', bg: 'bg-red-50', restricted: true },
    { name: 'Usuários', value: stats.usersCount, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', adminOnly: true },
  ];

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-brand-dark uppercase">Dashboard</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => {
          if (card.adminOnly && user?.nivel !== 'admin') return null;
          if (card.restricted && user?.nivel === 'vendedor') return null;
          return (
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
          );
        })}
      </div>
    </div>
  );
};

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<any>({
    name: '', category: '', price: '', oldPrice: '', oferta: false, description: '', stock: '', featured: false, active: true
  });
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const { user } = useAuth();

  const fetchProducts = () => {
    fetch('/api/admin/products').then(res => res.json()).then(setProducts);
  };

  const fetchCategories = () => {
    fetch('/api/categories').then(res => res.json()).then(data => {
      setDbCategories(data);
      if (data.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: data[0].name }));
      }
    });
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
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
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
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

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {products.map(p => (
            <div key={p.id} className="p-4 flex flex-col space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <img src={p.images[0]} className="w-12 h-12 rounded-xl object-cover bg-brand-bg" onError={e => (e.target as any).src = "https://via.placeholder.com/100"} />
                  <div>
                    <h3 className="font-bold text-brand-dark leading-tight">{p.name}</h3>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{p.category}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${p.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {p.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Preço</p>
                  <p className="font-black text-brand-primary text-lg">R$ {p.price.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-500 font-medium">Estoque: {p.stock} un</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleEdit(p)} className="p-3 bg-blue-50 text-blue-600 rounded-xl transition-colors"><Edit size={20} /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-3 bg-red-50 text-red-600 rounded-xl transition-colors"><Trash2 size={20} /></button>
                </div>
              </div>
            </div>
          ))}
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
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-2xl font-black text-brand-dark uppercase">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-brand-dark"><X size={28} /></button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-8 pb-24 md:pb-8">
                <form id="productForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Nome do Produto</label>
                    <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Categoria</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {dbCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
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
                    {(user?.nivel === 'admin' || user?.nivel === 'gerente') && (
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 text-brand-primary rounded" checked={formData.oferta} onChange={e => setFormData({...formData, oferta: e.target.checked})} />
                        <span className="text-xs font-black text-brand-dark uppercase tracking-wider">Oferta</span>
                      </label>
                    )}
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 text-brand-primary rounded" checked={formData.featured} onChange={e => setFormData({...formData, featured: e.target.checked})} />
                      <span className="text-xs font-black text-brand-dark uppercase tracking-wider">Destaque</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" className="w-5 h-5 text-brand-primary rounded" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                      <span className="text-xs font-black text-brand-dark uppercase tracking-wider">Ativo</span>
                    </label>
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-end space-x-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 uppercase tracking-widest text-xs">Cancelar</button>
                <button form="productForm" type="submit" className="px-10 py-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-dark shadow-xl shadow-brand-primary/20 uppercase tracking-widest text-xs">Salvar Produto</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', active: true });
  const { user } = useAuth();

  const fetchCategories = () => {
    fetch('/api/categories').then(res => res.json()).then(setCategories);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, active: cat.active });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente remover esta categoria?')) {
      await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      fetchCategories();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingCategory ? 'PUT' : 'POST';
    const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', active: true });
    fetchCategories();
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-brand-dark uppercase">Categorias</h1>
        <button 
          onClick={() => { setEditingCategory(null); setFormData({ name: '', active: true }); setIsModalOpen(true); }}
          className="bg-brand-primary text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-brand-dark transition-all uppercase tracking-widest text-sm"
        >
          <PlusCircle size={20} />
          <span>Nova Categoria</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-brand-primary/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-brand-bg/50 text-brand-dark text-xs font-black uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {categories.map(cat => (
              <tr key={cat.id} className="hover:bg-brand-bg/20 transition-colors">
                <td className="px-6 py-4 font-bold text-brand-dark">
                  {cat.name || cat.nome || "Sem Nome"}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cat.active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {cat.active ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleEdit(cat)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18} /></button>
                  <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-2xl font-black text-brand-dark uppercase">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-brand-dark"><X size={28} /></button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Nome da Categoria</label>
                  <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="flex items-center space-x-3">
                  <input type="checkbox" id="catActive" className="w-5 h-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                  <label htmlFor="catActive" className="text-xs font-black text-brand-dark uppercase tracking-wider cursor-pointer">Ativa</label>
                </div>
                <button type="submit" className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold hover:bg-brand-dark transition-all uppercase tracking-widest text-sm shadow-lg shadow-brand-primary/20">
                  {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
                </button>
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
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<any>({
    nome: '', usuario: '', email: '', senha: '', nivel: 'vendedor', ativo: true
  });
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/users')
      .then(async res => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Erro ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(setUsers)
      .catch(err => {
        console.error('Erro ao carregar dados:', err.message);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.nivel !== 'admin') {
      navigate('/admin/produtos');
      return;
    }
    fetchUsers();
  }, [currentUser, navigate]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      nome: user.nome,
      usuario: user.usuario,
      email: user.email || '',
      senha: '', // Don't populate password
      nivel: user.nivel,
      ativo: user.ativo
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (id === currentUser?.id) return alert('Você não pode remover a si mesmo!');
    if (confirm('Deseja realmente remover este usuário?')) {
      await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
    const method = editingUser ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ nome: '', usuario: '', email: '', senha: '', nivel: 'vendedor', ativo: true });
      fetchUsers();
    } else {
      const err = await res.json();
      alert(err.error);
    }
  };

  const [error, setError] = useState<string | null>(null);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      <span className="ml-3 font-bold text-brand-dark uppercase tracking-widest">Carregando...</span>
    </div>
  );

  if (error) return (
    <div className="p-8 bg-red-50 text-red-600 rounded-2xl font-bold uppercase tracking-widest text-center border border-red-100">
      <p>Erro ao carregar usuários</p>
      <p className="text-xs mt-2 opacity-70">Detalhe: {error}</p>
      <button 
        onClick={() => fetchUsers()}
        className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl text-xs hover:bg-red-700 transition-colors"
      >
        Tentar Novamente
      </button>
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-brand-dark uppercase">Usuários</h1>
        <button 
          onClick={() => {
            setEditingUser(null);
            setFormData({ nome: '', usuario: '', email: '', senha: '', nivel: 'vendedor', ativo: true });
            setIsModalOpen(true);
          }}
          className="bg-brand-primary text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 hover:bg-brand-dark transition-all uppercase tracking-widest text-sm"
        >
          <PlusCircle size={20} />
          <span>Novo Usuário</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-brand-primary/5 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-brand-bg/50 text-brand-dark text-xs font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">E-mail</th>
                <th className="px-6 py-4">Nível</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-brand-bg/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-brand-dark">{u.nome}</td>
                  <td className="px-6 py-4 text-gray-500 font-medium">{u.email || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.nivel === 'admin' ? 'bg-red-100 text-red-600' : u.nivel === 'gerente' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                      {u.nivel === 'admin' ? 'Administrador' : u.nivel === 'gerente' ? 'Gerente' : 'Vendedor'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.ativo ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleEdit(u)} className="p-2 text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {users.map(u => (
            <div key={u.id} className="p-4 flex flex-col space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-brand-dark">{u.nome}</h3>
                  <p className="text-xs text-gray-500 font-medium">{u.email || u.usuario}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${u.nivel === 'admin' ? 'bg-red-100 text-red-600' : u.nivel === 'gerente' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {u.nivel === 'admin' ? 'Administrador' : u.nivel === 'gerente' ? 'Gerente' : 'Vendedor'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${u.ativo ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button onClick={() => handleEdit(u)} className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl transition-colors flex items-center space-x-2 text-xs font-bold uppercase tracking-widest">
                  <Edit size={18} />
                  <span>Editar</span>
                </button>
                <button onClick={() => handleDelete(u.id)} className="p-3 bg-red-50 text-red-600 rounded-xl transition-colors flex items-center space-x-2 text-xs font-bold uppercase tracking-widest">
                  <Trash2 size={18} />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          ))}
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
                <h2 className="text-2xl font-black text-brand-dark uppercase">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-brand-dark"><X size={28} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Nome</label>
                  <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">E-mail</label>
                  <input required type="email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Usuário (Login)</label>
                  <input required type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.usuario} onChange={e => setFormData({...formData, usuario: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">{editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha Inicial'}</label>
                  <input required={!editingUser} type="password" title="Mínimo 6 caracteres" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.senha} onChange={e => setFormData({...formData, senha: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-dark uppercase tracking-wider">Nível de Acesso</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-primary focus:outline-none" value={formData.nivel} onChange={e => setFormData({...formData, nivel: e.target.value as any})}>
                    <option value="vendedor">Vendedor</option>
                    <option value="gerente">Gerente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 text-brand-primary rounded" checked={formData.ativo} onChange={e => setFormData({...formData, ativo: e.target.checked})} />
                  <span className="text-xs font-black text-brand-dark uppercase tracking-wider">Ativo</span>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 uppercase tracking-widest text-xs">Cancelar</button>
                  <button type="submit" className="px-10 py-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-dark shadow-xl shadow-brand-primary/20 uppercase tracking-widest text-xs">{editingUser ? 'Salvar Alterações' : 'Criar Usuário'}</button>
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
          <Route path="/admin" element={
            user ? (
              user.nivel === 'vendedor' ? <Navigate to="/admin/produtos" /> : <AdminLayout><AdminDashboard /></AdminLayout>
            ) : <Navigate to="/login" />
          } />
          <Route path="/admin/produtos" element={user ? <AdminLayout><AdminProducts /></AdminLayout> : <Navigate to="/login" />} />
          <Route path="/admin/categorias" element={user && user.nivel !== 'vendedor' ? <AdminLayout><AdminCategories /></AdminLayout> : <Navigate to="/admin" />} />
          <Route path="/admin/usuarios" element={user?.nivel === 'admin' ? <AdminLayout><AdminUsers /></AdminLayout> : <Navigate to="/admin" />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-brand-light selection:text-brand-dark">
            <AnimatedRoutes />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
