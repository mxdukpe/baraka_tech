import axios from 'axios';
import { Product, ProductResponse, Category, PaginatedCategoryResponse} from './types'; // Importez les types
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
// Récupérer exactement 50 produits
export const getProducts = async (token: string): Promise<Product[]> => {
  try {
    const allProducts: Product[] = [];
    let currentPage = 1;
    const pageSize = 10; // Taille de page actuelle de votre API
    const maxProducts = 50;

    while (allProducts.length < maxProducts) {
      const response = await axios.get<PaginatedResponse<Product>>(
        `${API_BASE_URL}products/products/?page=${currentPage}&page_size=${pageSize}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Vérifiez que la réponse contient bien des données
      if (!response.data?.results || response.data.results.length === 0) {
        console.warn('Aucun produit trouvé sur cette page');
        break; // Sortir de la boucle s'il n'y a plus de produits
      }

      // Ajouter les produits récupérés
      const remainingSlots = maxProducts - allProducts.length;
      const productsToAdd = response.data.results.slice(0, remainingSlots);
      allProducts.push(...productsToAdd);

      // Si on a atteint 50 produits ou qu'il n'y a plus de pages
      if (allProducts.length >= maxProducts || response.data.results.length < pageSize) {
        break;
      }

      currentPage++;
    }

    console.log(`Récupération de ${allProducts.length} produits`);
    return allProducts.slice(0, maxProducts); // S'assurer qu'on ne dépasse pas 50
    
  } catch (error) {
    console.error('Erreur API détaillée:', error);
    throw new Error('Erreur lors de la récupération des produits');
  }
};

// Alternative plus simple si votre API supporte une page_size plus grande
export const getProducts50Simple = async (token: string): Promise<Product[]> => {
  try {
    const response = await axios.get<PaginatedResponse<Product>>(
      `${API_BASE_URL}products/products/?page=1&page_size=50`,
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

    return response.data.results.slice(0, 50); // S'assurer de ne pas dépasser 50
  } catch (error) {
    console.error('Erreur API détaillée:', error);
    throw new Error('Erreur lors de la récupération des produits');
  }
};

// Service pour récupérer les produits avec pagination
export const getProductsPaginated = async (
  token: string| null, 
  page: number = 1, 
  pageSize: number = 20
): Promise<PaginatedResponse<Product>> => {
  try {
    const response = await axios.get<PaginatedResponse<Product>>(
      `${API_BASE_URL}products/products/?page=${page}&page_size=${pageSize}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.data?.results) {
      console.warn('Réponse API vide mais réussie');
      return {
        count: 0,
        next: null,
        previous: null,
        results: []
      };
    }

    return response.data;
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

// Récupérer exactement 50 catégories avec pagination
// export const getCategories = async (): Promise<Category[]> => {
//   try {
//     const allCategories: Category[] = [];
//     let currentPage = 1;
//     const pageSize = 10; // Ajustez selon votre API
//     const maxCategories = 9000;

//     while (allCategories.length < maxCategories) {
//       const response = await fetch(
//         `https://backend.barakasn.com/api/v0/products/categories/?page=${currentPage}&page_size=${pageSize}`
//       );

//       if (!response.ok) {
//         throw new Error(`Erreur HTTP: ${response.status}`);
//       }

//       const data: PaginatedCategoryResponse = await response.json();

//       // Vérifiez que la réponse contient bien des données
//       if (!data?.results || data.results.length === 0) {
//         console.warn('Aucune catégorie trouvée sur cette page');
//         break; // Sortir de la boucle s'il n'y a plus de catégories
//       }

//       // Ajouter les catégories récupérées
//       const remainingSlots = maxCategories - allCategories.length;
//       const categoriesToAdd = data.results.slice(0, remainingSlots);
//       allCategories.push(...categoriesToAdd);

//       // Si on a atteint 50 catégories ou qu'il n'y a plus de pages
//       if (allCategories.length >= maxCategories || data.results.length < pageSize) {
//         break;
//       }

//       currentPage++;
//     }

//     console.log(`Récupération de ${allCategories.length} catégories`);
//     return allCategories.slice(0, maxCategories); // S'assurer qu'on ne dépasse pas 50
    
//   } catch (error) {
//     console.error('Erreur lors de la récupération des catégories:', error);
//     throw new Error('Erreur lors de la récupération des catégories');
//   }
// };

export const getCategories = async () => {
  const response = await fetch('https://backend.barakasn.com/api/v0/products/categories/');
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des catégories');
  }
  return response.json();
};

// Alternative plus simple si votre API supporte une page_size plus grande
export const getCategories50Simple = async (): Promise<Category[]> => {
  try {
    const response = await fetch(
      'https://backend.barakasn.com/api/v0/products/categories/?page=1&page_size=50'
    );

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data: PaginatedCategoryResponse = await response.json();

    // Vérifiez que la réponse contient bien des données
    if (!data?.results) {
      console.warn('Réponse API vide mais réussie');
      return [];
    }

    return data.results.slice(0, 50); // S'assurer de ne pas dépasser 50
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    throw new Error('Erreur lors de la récupération des catégories');
  }
};

// Version qui garde votre structure originale mais limite à 50
export const getCategoriesOriginalStyle = async (): Promise<Category[]> => {
  try {
    const response = await fetch('https://backend.barakasn.com/api/v0/products/categories/');
    
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des catégories');
    }
    
    const data = await response.json();
    
    // Si c'est un tableau direct
    if (Array.isArray(data)) {
      return data.slice(0, 50);
    }
    
    // Si c'est une réponse paginée
    if (data.results && Array.isArray(data.results)) {
      return data.results.slice(0, 50);
    }
    
    return [];
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    throw new Error('Erreur lors de la récupération des catégories');
  }
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