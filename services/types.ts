export interface Brand {
  id: number;
  name: string;
}


export interface PaginatedCategoryResponse {
  results: Category[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}
export interface OrderItem {
  product: Product;
  quantity: number;
  unit_price: string;
};

export interface Order {
  id: string;
  total_price: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  created_at: string;
  items: OrderItem[];
};

export interface Country {
  code: string;
  name: string;
  dial_code: string;
}

export type CountryCode = string;

export interface CategoryParentInfo {
  id: number;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  parent_info: CategoryParentInfo;
  subcategories_info: any[]; // Empty array in the data
}

export interface ProductImage {
  id: number;
  image: string;
  order: number;
}

export interface Price {
  id: number;
  criterion: string;
  price: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Product {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  stock: number;
  category: Category; // Updated to match the actual data structure
  brand: Brand; // Added this missing field
  prices: any[]; // Empty array in the data
  created_at: string;
  updated_at: string;
  images: ProductImage[];
}

export interface ProductResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export type RootStackParamList = {
  RegisterStep2Screen: {
    phone_number: string;
    device_id: string;
  };
  // Ajoutez d'autres écrans ici
};