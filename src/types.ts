export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  stock: number;
  images: string[];
  featured: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Service {
  id: number;
  title: string;
  description: string;
  icon: string;
}
