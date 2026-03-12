export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  oferta?: boolean;
  description: string;
  stock: number;
  images: string[];
  featured: boolean;
  active?: boolean;
}

export interface User {
  id: number;
  nome: string;
  usuario: string;
  nivel: 'administrador' | 'gerente';
  ativo: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}
