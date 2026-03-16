import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { useCart } from '../App';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();

  const getImageUrl = (images: any): string => {
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

      const firstImage = imgArray[0];
      if (!firstImage || firstImage === '') return '/img/placeholder-produto.jpg';
      
      // Ensure it starts with /
      return firstImage.startsWith('/') ? firstImage : `/${firstImage}`;
    } catch (e) {
      return '/img/placeholder-produto.jpg';
    }
  };

  const formatPrice = (price: any) => {
    const num = Number(price);
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const mainImage = getImageUrl(product.images);

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group flex flex-col h-full hover:shadow-xl transition-all"
    >
      <Link to={`/produto/${product.id}`} className="relative h-48 md:h-64 overflow-hidden block">
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/img/placeholder-produto.jpg';
          }}
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
                De: R$ {formatPrice(product.oldPrice)}
              </span>
            )}
            <div className="text-lg md:text-2xl font-black text-brand-dark">
              {product.oldPrice ? 'Por: ' : ''}R$ {formatPrice(product.price)}
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

export default ProductCard;
