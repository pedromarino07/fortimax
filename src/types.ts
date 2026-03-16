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
  email?: string;
  nivel: 'admin' | 'gerente' | 'vendedor';
  ativo: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  active: boolean;
}
