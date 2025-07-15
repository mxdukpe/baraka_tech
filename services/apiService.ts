import axios from 'axios';
import { Product, ProductResponse} from './types'; // Importez les types
// import { Order, OrderResponse, ApiResponse } from './types';
// apiService.ts
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getProductsPage = async (
  token: string, 
  page: number = 1
): Promise<PaginatedResponse<Product>> => {
  try {
    // console.log(`Requête API page ${page}`); // DEBUG
    const response = await axios.get<PaginatedResponse<Product>>(
      `${API_BASE_URL}products/products/?page=${page}&page_size=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    // console.log('Réponse API brute:', response); // DEBUG
    return response.data;
  } catch (error) {
    console.error('Erreur API détaillée:', error); // DEBUG
    if (axios.isAxiosError(error)) {
      console.error('Erreur Axios:', {
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    throw error;
  }
};

const API_BASE_URL = 'https://backend.barakasn.com/api/v0/'; // Updated base URL

// Configuration Axios globale
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// services/apiService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getOrders = async () => {
  const token = await AsyncStorage.getItem('access_token');
  if (!token) throw new Error('No authentication token');

  const response = await fetch('https://backend.barakasn.com/api/v0/orders/orders/', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch orders');
  }

  return response.json();
};

// Récupérer tous les produits
export const getProducts = async (token: string, page?: number): Promise<Product[]> => {
  try {
    const response = await axios.get<PaginatedResponse<Product>>(
      `${API_BASE_URL}products/products/${page ? `?page=${page}&page_size=10` : ''}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Vérifiez que la réponse contient bien des données
    if (!response.data?.results) {
      console.warn('Réponse API vide mais réussie');
      return [];
    }

    return response.data.results;
  } catch (error) {
    console.error('Erreur API détaillée:', error);
    throw new Error('Erreur lors de la récupération des produits');
  }
};

// const data: PaginatedResponse<Product> = await getProducts(token, currentPage);


// Récupérer un produit par son ID
export const getProductById = async (id: number): Promise<Product> => {
  try {
    const response = await axios.get<Product>(`${API_BASE_URL}products/products/${id}/`);
    return response.data; // Retourne le produit
  } catch (error) {
    if (isAxiosError(error)) {
      // TypeScript now knows 'error' is of type AxiosError
      const axiosError = error as { message: string; response?: { status: number; data: any } };
      console.error('Axios Error:', axiosError.message);
      console.error('Status Code:', axiosError.response?.status);
      console.error('Response Data:', axiosError.response?.data);
    } else {
      // Handle non-Axios errors
      console.error('Unexpected Error:', error);
    }
    throw new Error('Erreur lors de la récupération du produit');
  }
};

export const getCategories = async () => {
  const response = await fetch('https://backend.barakasn.com/api/v0/products/categories/');
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des catégories');
  }
  return response.json();
};

export const getProductsByCategory = async (categoryId: string) => {
  const response = await fetch(`https://backend.barakasn.com/api/v0/products/products/?category=${categoryId}`);
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des produits');
  }
  return response.json();
};

// Helper function to check if the error is an AxiosError
function isAxiosError(error: unknown): error is { isAxiosError: boolean; message: string; response?: { status: number; data: any } } {
  return (error as { isAxiosError?: boolean }).isAxiosError === true;
}

export const getPrimaryImage = (product: Product): string | null => {
  if (!product.images || product.images.length === 0) {
    return null;
  }
  
  const sortedImages = product.images.sort((a, b) => a.order - b.order);
  const imagePath = sortedImages[0]?.image;
  
  if (!imagePath) return null;
  
  // Ajoutez l'URL de base de votre backend
  return `https://backend.barakasn.com${imagePath}`;
};