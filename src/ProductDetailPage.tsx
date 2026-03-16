import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, ChevronLeft, Minus, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from './types';
import { useCart } from './App';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const getImageUrl = (images: any): string[] => {
    try {
      let imgArray: string[] = [];
      
      if (Array.isArray(images)) {
        imgArray = images;
      } else if (typeof images === 'string' && images.trim() !== '') {
        if (images.startsWith('[') && images.endsWith(']')) {
          try {
            imgArray = JSON.parse(images);
          } catch {
            imgArray = [images];
          }
        } else {
          imgArray = [images];
        }
      }

      if (imgArray.length === 0) return ['/img/logo_padrao.png'];
      
      return imgArray.map(img => {
        if (!img || img === '') return '/img/logo_padrao.png';
        if (img.startsWith('http') || img.startsWith('data:')) return img;
        
        const filename = img.replace(/^\/static\//, '').replace(/^\/img\/produtos\//, '').replace(/^\//, '');
        return `/img/produtos/${filename}`;
      });
    } catch (e) {
      return ['/img/logo_padrao.png'];
    }
  };

  const formatPrice = (price: any) => {
    const num = Number(price);
    if (isNaN(num) || num === 0) return '0,00';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  useEffect(() => {
    fetch(`/api/produtos/${id}`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        const adaptedProduct: Product = {
          id: data.id,
          name: data.nome || "",
          description: data.descricao || "",
          price: Number(data.preco_oferta || data.preco_base) || 0,
          oldPrice: data.preco_oferta ? Number(data.preco_base) : null,
          images: getImageUrl(data.imagem_url),
          category: data.categoria_nome || "",
          oferta: !!data.em_oferta,
          featured: !!data.destaque,
          stock: Number(data.estoque) || 0,
          active: !!data.ativo
        };
        setProduct(adaptedProduct);
      })
      .catch(() => navigate('/produtos'));
  }, [id, navigate]);

  if (!product) return <div className="h-screen flex items-center justify-center font-bold text-brand-dark uppercase tracking-widest">Carregando...</div>;

  const images = product.images;
  const currentImage = images[activeImage] || '/img/logo_padrao.png';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-500 hover:text-brand-primary transition-colors mb-8 uppercase text-xs font-black tracking-widest"
      >
        <ChevronLeft size={20} className="mr-1" />
        Voltar
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl md:rounded-3xl overflow-hidden border border-gray-100 shadow-sm bg-white">
            <img
              src={currentImage}
              alt={product.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/img/logo_padrao.png';
              }}
            />
          </div>
          {images.length > 1 && (
            <div className="flex space-x-2 md:space-x-4 overflow-x-auto pb-2 scrollbar-hide">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`flex-shrink-0 w-16 h-16 md:w-24 md:h-24 rounded-lg md:rounded-xl overflow-hidden border-2 transition-all ${
                    activeImage === idx ? 'border-brand-primary shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img 
                    src={img} 
                    alt="" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/img/logo_padrao.png';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
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
                De: R$ {formatPrice(product.oldPrice)}
              </span>
            )}
            <div className="text-3xl md:text-5xl font-black text-brand-dark tracking-tighter">
              {product.oldPrice ? 'Por: ' : ''}R$ {formatPrice(product.price)}
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

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white h-14">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 h-full hover:bg-gray-50 transition-colors"
              >
                <Minus size={20} />
              </button>
              <span className="px-6 font-bold text-lg">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="px-4 h-full hover:bg-gray-50 transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            <button
              onClick={() => {
                for(let i=0; i<quantity; i++) addToCart(product);
                navigate('/carrinho');
              }}
              className="flex-grow bg-brand-primary text-white h-14 rounded-xl font-black uppercase tracking-widest hover:bg-brand-dark transition-all flex items-center justify-center space-x-3 shadow-lg shadow-brand-primary/20"
            >
              <ShoppingCart size={24} />
              <span>Adicionar ao Carrinho</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
