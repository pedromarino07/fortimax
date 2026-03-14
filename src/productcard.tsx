import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';

const ProductCard: React.FC<{ product: any }> = ({ product }) => {
  // Função segura para pegar a imagem
  const getImageUrl = (imagesData: any) => {
    try {
      if (typeof imagesData === 'string') {
        const parsed = JSON.parse(imagesData);
        return Array.isArray(parsed) ? parsed[0] : parsed;
      }
      return Array.isArray(imagesData) ? imagesData[0] : imagesData;
    } catch (e) {
      return "/static/img/logo_padrao.png";
    }
  };

  return (
    <motion.div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group flex flex-col h-full">
      <Link to={`/produto/${product.id}`} className="relative h-48 md:h-64 overflow-hidden block">
        <img
          src={getImageUrl(product.images)}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = "/static/img/logo_padrao.png"; }}
        />
      </Link>
      <div className="p-4">
        <h3 className="font-bold">{product.name}</h3>
        <div className="font-black">R$ {Number(product.price).toFixed(2)}</div>
      </div>
    </motion.div>
  );
};

export default ProductCard;