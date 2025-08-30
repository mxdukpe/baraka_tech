/**
 * Ce fichier définit l'écran d'accueil de l'application adaptatif.
 * Il s'adapte automatiquement aux différentes tailles d'écran.
 *
 * @module HomeScreen
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, RefreshControl,
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  FlatList, 
  SafeAreaView, 
  Alert, 
  Dimensions, 
  Switch, 
  Share, 
  TouchableWithoutFeedback, 
  ActivityIndicator, 
  Animated, 
  
  Platform, AppState, 
  StatusBar, 
  Modal, 
  Linking, 
  Keyboard,ImageBackground,
  TextInput
} from 'react-native';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';
import { Icon, Badge } from 'react-native-elements';
import { Ionicons } from '@expo/vector-icons';
import { usersData } from '../../data/userData';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProducts, getProducts50Simple, getProductsPaginated  } from '../../services/apiService';
import * as Print from 'expo-print';
import { Product, Order, OrderItem } from '../../services/types';
import { useCart } from './useCart';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import debounce from 'lodash.debounce';
import { Asset } from 'expo-asset';
import axios from 'axios';
import HeaderComponent from './HeaderComponent';

import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

// Fonction pour obtenir les dimensions responsives
const getResponsiveDimensionsForModal = () => {
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isLargeScreen = width >= 1024;
  const isLandscape = width > height;
  
  return {
    width,
    height,
    isTablet,
    isLargeScreen,
    isLandscape,
    isSmallScreen: width < 375,
    // Colonnes adaptatives - 3 en paysage, sinon 2 (ou plus pour tablettes)
    productColumns: 3,
    categoryColumns: isLandscape ? 6 : (isTablet ? 5 : 4),
    // Padding adaptatif
    horizontalPadding: isTablet ? 30 : 20,
    verticalPadding: isTablet ? 25 : 15,
    // Espacement des icônes adaptatif
    iconSpacing: isLandscape ? 15 : (isTablet ? 25 : 20),
    // Tailles d'éléments - ajustées pour le mode paysage
    cardWidth: isLandscape ? (width - 60) / 3 : (isTablet ? (width - 60) / 3 : (width - 40) / 2),
    headerHeight: isTablet ? 80 : 60,
    bannerHeight: isTablet ? 200 : 180,
    productImageHeight: isTablet ? 150 : 120,
    categoryImageSize: isTablet ? 80 : 60,
    // Tailles de police
    titleFontSize: isTablet ? 22 : 18,
    subtitleFontSize: isTablet ? 18 : 16,
    bodyFontSize: isTablet ? 16 : 14,
    captionFontSize: isTablet ? 14 : 12,
    // Espacements
    sectionSpacing: isTablet ? 35 : 25,
    itemSpacing: isTablet ? 20 : 15,
  };
};

const getResponsiveDimensions = () => {
  // const { width, height } = Dimensions.get('window');
  // const isTablet = width >= 768;
  const { width, height } = Dimensions.get('window');
  const isSmallScreen = width < 375;
  const isTablet = width >= 768;
  const isLargeScreen = width >= 1024;
  const isLandscape = width > height;
  const isPortrait = height > width;
  
  // Ajustements spécifiques pour les petits écrans Android
  if (isSmallScreen) {
    return {
      productColumns: 2,
      productCardWidth: (width - 36) / 2, // 36 = padding(24) + margins(12)
      productSpacing: 4,
      productMargin: 3,
      productImageHeight: 120,
      bodyFontSize: 11,
      subtitleFontSize: 12,
      captionFontSize: 10,
    };
  }
  // Calculer les colonnes en fonction de l'orientation et de la taille d'écran
  let productColumns = 2; // Par défaut
  let categoryColumns = 2;
  let sidebarWidth = 200;
  
  if (isLandscape) {
    // En mode paysage
    if (isLargeScreen) {
      productColumns = 2;
      categoryColumns = 3;
      sidebarWidth = 280;
    } else if (isTablet) {
      productColumns = 2;
      categoryColumns = 3;
      sidebarWidth = 250;
    } else {
      productColumns = 2;
      categoryColumns = 2;
      sidebarWidth = 200;
    }
  } else {
    // En mode portrait
    if (isLargeScreen) {
      productColumns = 2;
      categoryColumns = 2;
      sidebarWidth = 300;
    } else if (isTablet) {
      productColumns = 2;
      categoryColumns = 2;
      sidebarWidth = 250;
    } else {
      productColumns = 2;
      categoryColumns = 2;
      sidebarWidth = width < 400 ? 180 : 200;
    }
  }
  
  // Ajustements pour les très petits écrans
  if (width < 375) {
    productColumns = 2;
    categoryColumns = Math.max(1, categoryColumns - 1);
    sidebarWidth = Math.min(160, sidebarWidth);
  }
  
  // Calculer les dimensions des cartes en fonction du nombre de colonnes
  const availableWidth = width - sidebarWidth - 40; // 40 pour les paddings
  const cardSpacing = isTablet ? 12 : 8;
  const totalSpacing = cardSpacing * (productColumns + 1);
  const productCardWidth = (availableWidth - totalSpacing) / productColumns;
  const categoryCardWidth = (availableWidth - (cardSpacing * (categoryColumns + 1))) / categoryColumns;
  
  return {
    width,
    height,
    isTablet,
    isLargeScreen,
    isLandscape,
    isPortrait,
    isSmallScreen: width < 375,
    productColumns,
    categoryColumns,
    sidebarWidth,
    
    // Dimensions calculées dynamiquement
    productCardWidth: Math.max(140, productCardWidth), // Minimum 140px
    categoryCardWidth: Math.max(150, categoryCardWidth), // Minimum 150px
    
    // Padding adaptatif
    horizontalPadding: isTablet ? 20 : 16,
    verticalPadding: isTablet ? 20 : 16,
    
    // Espacement entre les produits - adaptatif
    productSpacing: isLandscape ? (isTablet ? 12 : 8) : (isTablet ? 10 : 6),
    productMargin: isLandscape ? (isTablet ? 8 : 6) : (isTablet ? 6 : 4),
    
    // Hauteurs adaptatives
    headerHeight: isTablet ? 70 : 60,
    productImageHeight: isLandscape ? (isTablet ? 140 : 120) : (isTablet ? 160 : 140),
    categoryImageSize: isTablet ? 70 : 60,
    
    // Tailles de police adaptatives
    titleFontSize: isTablet ? 20 : (isLandscape ? 16 : 18),
    subtitleFontSize: isTablet ? 16 : (isLandscape ? 13 : 14),
    bodyFontSize: isTablet ? 15 : (isLandscape ? 12 : 13),
    captionFontSize: isTablet ? 13 : (isLandscape ? 10 : 11),
    
    // Espacements adaptatifs
    sectionSpacing: isTablet ? 24 : (isLandscape ? 16 : 20),
    itemSpacing: isTablet ? 16 : (isLandscape ? 10 : 12),
    
  };
};

const { width: screenWidth } = Dimensions.get('window');

type HomeScreenProps = {
  navigation: any;
  route: any;
};

// Types pour la modal
interface CategoryData {
  id: string;
  name: string;
  productCount: number;
  image?: string;
}


// Interface pour les messages
interface Message {
  id: number;
  title: string;
  message: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  image?: string;
  priority?: number;
}

interface MessagesCarouselProps {
  token: string;
  theme: any;
  responsive: any;
  onMessagePress?: (message: Message) => void;
}



const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, route }) => {
  // const responsive = getResponsiveDimensions();
  const responsiveModal = getResponsiveDimensionsForModal();
  const [menuVisible, setMenuVisible] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; productCount: number; image?: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'categories' | 'products'>('categories');
  const [product, setProduct] = useState<Product | null>(null);
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [token, setToken] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  // const [shareModalVisible, setShareModalVisible] = useState(false);
  const [customPrices, setCustomPrices] = useState<Record<string, string>>({});
  // const [shareWithPrice, setShareWithPrice] = useState(true);
  const [useCustomPrices, setUseCustomPrices] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [userData, setUserData] = useState(null);
  const [count, setCount] = useState(0);
  // const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    phone_number: ''
  });
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  // État pour la modal de partage unifié
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [shareWithPrice, setShareWithPrice] = useState(true);
  const [shareWithDescription, setShareWithDescription] = useState(true);
  const [shareWithImage, setShareWithImage] = useState(true);
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const { width, height } = Dimensions.get('window');
  const isLandscape = width > height;
  const numColumns = 2; // Toujours 2 colonnes

  const cardWidth = (width - (numColumns * 10 + 20)) / numColumns;
  
  // const { cartItems, totalCartItems, saveCart } = useCart();
  const { addedProduct } = route.params || {};
  const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const allCartItems = [...localCartItems, ...orders];
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

     // const [products, setProducts] = useState<Product[]>([]);
      const [loading, setLoading] = useState(false);
      const [hasMore, setHasMore] = useState(true);
      const [totalCount, setTotalCount] = useState(0);
      const [pageSize, setPageSize] = useState(20); // Nombre de produits par page
      const [enabled, setEnabled] = useState(true); // Pour contrôler
      const [currentPage, setCurrentPage] = useState(1);
      // const [error, setError] = useState<string | null>(null);
        const [responsive, setResponsive] = useState(getResponsiveDimensions());
        const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
        // État pour le flou de sécurité
  const [isAppInBackground, setIsAppInBackground] = useState(false);

  useEffect(() => {
    // Empêcher les captures d'écran
    const enableScreenshotProtection = async () => {
      try {
        await ScreenshotPrevent.enabled(true);
        console.log('Protection contre les captures d\'écran activée');
      } catch (error) {
        console.warn('Erreur activation protection captures:', error);
      }
    };

    // Désactiver la protection quand le composant est détruit
    const disableScreenshotProtection = async () => {
      try {
        await ScreenshotPrevent.enabled(false);
      } catch (error) {
        console.warn('Erreur désactivation protection captures:', error);
      }
    };

    enableScreenshotProtection();

    // Écouter les changements d'état de l'app
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      disableScreenshotProtection();
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App passe en arrière-plan - activer le flou
      setIsAppInBackground(true);
    } else if (nextAppState === 'active') {
      // App revient au premier plan - désactiver le flou
      setIsAppInBackground(false);
    }
  };
      
        // Écouter les changements de dimensions d'écran
        useEffect(() => {
          const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setScreenDimensions(window);
            setResponsive(getResponsiveDimensions());
          });
      
          return () => subscription?.remove();
        }, []);
    
        // const [currentPage, setCurrentPage] = useState(1);
        // const [error, setError] = useState<string | null>(null);
      
         // Fonction pour charger une page
        const loadPage = useCallback(async (page: number, reset: boolean = false) => {
          if (loading || !enabled || !token) return;
      
          setLoading(true);
          setError(null);
      
          try {
            const response = await getProductsPaginated(token, page, pageSize);
            
            setProducts(prevProducts => 
              reset ? response.results : [...prevProducts, ...response.results]
            );
            
            setHasMore(response.next !== null);
            setCurrentPage(page);
            setTotalCount(response.count);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
            setError(errorMessage);
            console.error('Erreur de chargement:', err);
          } finally {
            setLoading(false);
          }
        }, [token, pageSize, loading, enabled]);
      
        // Charger plus de produits
        const loadMore = useCallback(() => {
          if (hasMore && !loading && token) {
            loadPage(currentPage + 1);
          }
        }, [currentPage, hasMore, loading, loadPage, token]);
      
        // Actualiser la liste
        const refresh = useCallback(() => {
          if (!token) {
            setError('Token d\'authentification manquant');
            return;
          }
          
          setProducts([]);
          setCurrentPage(1);
          setHasMore(true);
          setError(null);
          loadPage(1, true);
        }, [loadPage, token]);
      
        // Charger la première page au montage si token disponible
        useEffect(() => {
          if (enabled && token) {
            loadPage(1, true);
          } else if (!token) {
            setError('Token d\'authentification manquant');
          }
        }, [token, enabled]); // Retirer loadPage des dépendances pour éviter les boucles
      
      

  
  
  // Calculer le nombre total de produits dans le panier
  const getTotalCartItemsCount = () => {
    return allCartItems.reduce((total, order) => {
      return total + order.items.reduce((orderTotal, item) => orderTotal + item.quantity, 0);
    }, 0);
  };

  const { loadCart } = useCart();
  const { cartItems, totalCartItems, saveCart } = useCart();


const [cartItemsCount, setCartItemsCount] = useState(0);

  useEffect(() => {
    const loadCartItems = async () => {
      try {
        const localCart = await AsyncStorage.getItem('local_cart');
        if (localCart) {
          const cartItems = JSON.parse(localCart);
          // Calculer le nombre total d'articles
          const totalItems = cartItems.reduce((total, order) => {
            return total + order.items.reduce((sum, item) => sum + item.quantity, 0);
          }, 0);
          setCartItemsCount(totalItems);
        }
      } catch (error) {
        console.warn('Erreur lors du chargement du panier:', error);
      }
    };

    loadCartItems();
  }, []);

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  useEffect(() => {
    const fetchAllProducts = async () => {
      if (!token) return;

      try {
        setIsLoading(true);
        setLoadingError(null);
        
        // Utiliser la fonction simplifiée qui récupère directement 50 produits
        const products = await getProducts50Simple(token);
        
        console.log(`${products.length} produits récupérés:`, products);
        
        setAllProducts(products);
        
        // Créer les catégories avec le nombre de produits
        const categoryMap = new Map();
        products.forEach(product => {
          const categoryName = product.category.name;
          if (categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, {
              ...categoryMap.get(categoryName),
              productCount: categoryMap.get(categoryName).productCount + 1
            });
          } else {
            categoryMap.set(categoryName, {
              id: product.category.id || categoryName,
              name: categoryName,
              productCount: 1,
              image: product.images?.[0]?.image
            });
          }
        });
        
        const categoriesArray = Array.from(categoryMap.values());
        console.log(`${categoriesArray.length} catégories créées:`, categoriesArray);
        
        setCategories(categoriesArray);
        
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        setLoadingError('Échec du chargement des produits');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllProducts();
  }, [token]);

  useEffect(() => {
    const fetchPopularProducts = async () => {
      if (!token) return;

      try {
        const data = await getProducts(token);
        const shuffled = data.slice(0, 4).sort(() => 0.5 - Math.random());
        const selectedProducts = shuffled.slice(0, 2);
        
        const jewelryImages = [
          require('../../assets/images/diamond-necklace.webp'),
          require('../../assets/images/gold-ring.webp'),
          require('../../assets/images/silver-bracelet.webp'),
          require('../../assets/images/pearl-earrings.jpeg')
        ];

        const combinedProducts = selectedProducts.map((product, index) => ({
          ...product,
          id: product.id.toString(),
          price: `${product.prices[0]?.price || '0'} FCFA`,
          image: jewelryImages[index % jewelryImages.length],
          quantity: productQuantities[product.id] || 1
        }));

        setPopularProducts(combinedProducts);
      } catch (error) {
        console.error("Erreur API, utilisation des produits par défaut:", error);
      }
    };

    fetchPopularProducts();
  }, [token, productQuantities]);

  // Fonction de recherche améliorée
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredProducts([]);
      return;
    }
    
    const searchTerm = query.toLowerCase().trim();
    const results = allProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm) ||
      product.category?.name?.toLowerCase().includes(searchTerm) ||
      product.brand?.name?.toLowerCase().includes(searchTerm)
    );
    
    setFilteredProducts(results);
  }, [allProducts]);

  // Recherche avec debounce corrigée
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      performSearch(query);
    }, 300),
    [performSearch]
  );

  // Effet pour déclencher la recherche quand searchQuery change
  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  
  // Fonction handleSearch corrigée
  const handleSearch = async (query?: string) => {
    const searchTerm = query || searchQuery;
    
    if (searchTerm.trim() === '') {
      setFilteredProducts([]);
      return;
    }
    
    Keyboard.dismiss();
    
    // Sauvegarder dans les recherches récentes
    const updatedSearches = [searchTerm, ...recentSearches.filter(item => item !== searchTerm)].slice(0, 5);
    setRecentSearches(updatedSearches);
    await AsyncStorage.setItem('recent_searches', JSON.stringify(updatedSearches));
    
    // Effectuer la recherche
    performSearch(searchTerm);
  };

  // Correction de la fonction handleRecentSearchPress
  const handleRecentSearchPress = (query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  // Fonction pour gérer le changement de texte dans l'input
  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);
    // La recherche se fera automatiquement via l'effet useEffect avec debounce
  };


  const getPriceByCriterion = (product: Product) => {
    return product.prices[0];
  };


  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };

  const closeMenu = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
  };

  // Fonction pour gérer la navigation avec fermeture du menu
  const handleNavigation = (screenName: string) => {
    closeMenu();
    navigation.navigate(screenName);
  };

  // Charger l'état au démarrage
  useEffect(() => {
    const loadPricePreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem('showPrices');
        if (savedPreference !== null) {
          setShowPrices(savedPreference === 'true');
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la préférence:', error);
      }
    };
    loadPricePreference();
  }, []);

  // Sauvegarder quand l'état change
  useEffect(() => {
    const savePricePreference = async () => {
      try {
        await AsyncStorage.setItem('showPrices', showPrices.toString());
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
      }
    };
    savePricePreference();
  }, [showPrices]);

  const getImageUri = (imagePath: string | undefined) => {
    if (!imagePath) return undefined;
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('/media/')) {
      return `https://backend.barakasn.com${imagePath}`;
    }
    
    if (imagePath.includes('product_iamges')) {
      return `https://backend.barakasn.com/media/${imagePath}`;
    }
    
    return `https://backend.barakasn.com/media/${imagePath}`;
  };
  
  // Fonction pour créer un message de partage unifié
  const generateUnifiedShareMessage = () => {
    if (!product) return '';
    
    let message = `🛍️ *${product.name}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (shareWithPrice) {
      const priceToUse = useCustomPrice ? customPrice : (product.prices[0]?.price || '0');
      message += `💰 *Prix:* ${formatPrice(priceToUse)} FCFA\n\n`;
    }
    
    if (shareWithDescription && product.description) {
      message += `📝 *Description:*\n${product.description}\n\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📱 *Contactez-nous pour plus d'informations !*\n`;
    message += `🛒 *Commandez maintenant !*`;
    
    return message;
  };
  
  // Fonction pour convertir l'image par défaut en base64
  const getDefaultImageBase64 = async () => {
    try {
      // Charger l'asset de l'image par défaut
      const asset = Asset.fromModule(require('../../assets/images/baraka_icon.png'));
      await asset.downloadAsync();
      
      // Lire le fichier et le convertir en base64
      const base64 = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('Erreur lors du chargement de l\'image par défaut:', error);
      return null;
    }
  };
  
  // Fonction pour vérifier si une image existe
  const checkImageExists = async (imageUrl: string): Promise<boolean> => {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  };
  
  // Fonction pour obtenir l'URL de l'image ou l'image par défaut
  const getImageSource = async (imagePath: string | undefined, defaultImageBase64: string | null): Promise<string> => {
    if (!imagePath) {
      return defaultImageBase64 || '';
    }
    
    const imageUrl = `https://backend.barakasn.com${imagePath}`;
    const exists = await checkImageExists(imageUrl);
    
    if (exists) {
      return imageUrl;
    } else {
      return defaultImageBase64 || '';
    }
  };
  
  const generateSingleProductPDF = async () => {
    if (!product) return;
  
    setIsSharing(true);
  
    try {
      const priceToUse = useCustomPrice ? customPrice : (product.prices[0]?.price || '0');
      
      // Charger l'image par défaut en base64
      const defaultImageBase64 = await getDefaultImageBase64();
      
      // Préparer les images avec vérification d'existence
      const mainImageSource = product.images && product.images.length > 0 
        ? await getImageSource(product.images[0]?.image, defaultImageBase64)
        : defaultImageBase64 || '';
      
      // Préparer les autres images
      const otherImagesPromises = product.images && product.images.length > 1 
        ? product.images.slice(1).map(async (image, index) => {
            const imageSource = await getImageSource(image.image, defaultImageBase64);
            return { source: imageSource, index: index + 2 };
          })
        : [];
      
      const otherImages = await Promise.all(otherImagesPromises);
      
      // Créer le HTML pour le PDF avec gestion des images par défaut
      let html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .product-title { color: #F58320; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
              .product-image-container { text-align: center; margin-bottom: 20px; }
              .product-image { max-width: 100%; height: 300px; object-fit: contain; margin-bottom: 15px; }
              .image-grid { margin-bottom: 20px; }
              .image-grid h3 { text-align: center; color: #F58320; margin-bottom: 15px; }
              .image-row { display: flex; justify-content: center; gap: 15px; margin-bottom: 15px; flex-wrap: wrap; }
              .image-grid-item { width: 200px; text-align: center; }
              .image-grid-item img { width: 100%; height: 150px; object-fit: contain; border: 1px solid #ddd; border-radius: 8px; }
              .image-caption { font-size: 12px; color: #666; margin-top: 5px; }
              .details-container { margin-bottom: 20px; }
              .detail-row { display: flex; margin-bottom: 10px; }
              .detail-label { font-weight: bold; width: 120px; }
              .detail-value { flex: 1; }
              .price { font-size: 28px; color: #F58320; font-weight: bold; text-align: center; margin: 20px 0; }
              .description { margin-top: 20px; line-height: 1.5; }
              .footer { margin-top: 30px; text-align: center; font-style: italic; color: #666; }
              .page-break { page-break-after: always; }
              .no-image-text { color: #999; font-style: italic; text-align: center; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="product-title">${product.name}</div>
            </div>
            
            ${mainImageSource ? `
              <div class="product-image-container">
                <img class="product-image" src="${mainImageSource}" alt="Image principale du produit" />
              </div>
            ` : `
              <div class="no-image-text">
                <p>Image du produit non disponible</p>
              </div>
            `}
            
            <div class="price">${formatPrice(priceToUse)} FCFA</div>
            
            ${product.description ? `
              <div class="description">
                <h3>Description</h3>
                <p>${product.description}</p>
              </div>
            ` : ''}
            
            ${otherImages.length > 0 ? `
              <div class="image-grid">
                <h3>Autres images du produit</h3>
                ${otherImages.map((imageData, index) => {
                  // Créer des rangées de 2 images
                  if (index % 2 === 0) {
                    const nextImage = otherImages[index + 1];
                    return `
                      <div class="image-row">
                        <div class="image-grid-item">
                          <img src="${imageData.source}" alt="Image ${imageData.index}" />
                          <div class="image-caption">Image ${imageData.index}</div>
                        </div>
                        ${nextImage ? `
                          <div class="image-grid-item">
                            <img src="${nextImage.source}" alt="Image ${nextImage.index}" />
                            <div class="image-caption">Image ${nextImage.index}</div>
                          </div>
                        ` : ''}
                      </div>
                    `;
                  }
                  return '';
                }).join('')}
              </div>
            ` : ''}
            
            <div class="footer">
              <p>Pour plus d'informations, veuillez nous contacter.</p>
              <p>Généré le ${new Date().toLocaleDateString()}</p>
            </div>
          </body>
        </html>
      `;
  
      // Générer le PDF
      const { uri } = await Print.printToFileAsync({ 
        html,
        width: 612, // Largeur A4 en points
        height: 792, // Hauteur A4 en points
      });
      
      // Partager le PDF
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Partager la fiche produit',
        UTI: 'com.adobe.pdf'
      });
  
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setIsSharing(false);
    }
  };

  const openShareModal = (productToShare: Product) => {
    setProduct(productToShare); // Définir le produit à partager
    setShareModalVisible(true);
  };

  const renderShareModal = () => {
    if (!product) return null;
    
    const originalPrice = product.prices && product.prices.length > 0 
      ? product.prices[0].price 
      : '0';
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={shareModalVisible}
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Partager le produit
              </Text>
              <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

              {/* Options de partage */}
              <View style={styles.shareOptions}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Options de partage
                  </Text>
                  
                  <TouchableOpacity 
                      style={styles.optionRow}
                      onPress={() => setShareWithPrice(!shareWithPrice)}
                  >
                      <Ionicons 
                          name={shareWithPrice ? "checkbox" : "square-outline"} 
                          size={20} 
                          color="#F58320" 
                      />
                      <Text style={[styles.optionText, { color: theme.text }]}>
                          Inclure les prix
                      </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                      style={styles.optionRow}
                      onPress={() => setShareWithDescription(!shareWithDescription)}
                  >
                      <Ionicons 
                          name={shareWithDescription ? "checkbox" : "square-outline"} 
                          size={20} 
                          color="#F58320" 
                      />
                      <Text style={[styles.optionText, { color: theme.text }]}>
                          Inclure les descriptions
                      </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                      style={styles.optionRow}
                      onPress={() => setShareWithImage(!shareWithImage)}
                  >
                      <Ionicons 
                          name={shareWithImage ? "checkbox" : "square-outline"} 
                          size={20} 
                          color="#F58320" 
                      />
                      <Text style={[styles.optionText, { color: theme.text }]}>
                          Inclure les images
                      </Text>
                  </TouchableOpacity>

                  {shareWithPrice && (
                      <TouchableOpacity 
                          style={styles.optionRow}
                          onPress={() => setUseCustomPrice(!useCustomPrice)}
                      >
                          <Ionicons 
                              name={useCustomPrice ? "checkbox" : "square-outline"} 
                              size={20} 
                              color="#F58320" 
                          />
                          <Text style={[styles.optionText, { color: theme.text }]}>
                              Utiliser des prix personnalisés
                          </Text>
                      </TouchableOpacity>
                  )}
              </View>

              {/* Prix personnalisé */}
              {shareWithPrice && useCustomPrice && (
                <View style={styles.customPriceSection}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Prix personnalisé
                  </Text>
                  <View style={styles.priceInputContainer}>
                    <TextInput
                      style={[styles.customPriceInput, { 
                        color: theme.text, 
                        borderColor: theme.text + '40',
                        backgroundColor: theme.background 
                      }]}
                      value={customPrice}
                      onChangeText={setCustomPrice}
                      placeholder="Entrez le prix"
                      keyboardType="numeric"
                      placeholderTextColor={theme.text + '60'}
                    />
                    <Text style={[styles.currencyLabel, { color: theme.text }]}>FCFA</Text>
                  </View>
                </View>
              )}

              {/* Aperçu du message */}
              <View style={styles.previewSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Aperçu du message
                </Text>
                <View style={[styles.previewBox, { 
                  backgroundColor: theme.background, 
                  borderColor: theme.text + '20' 
                }]}>
                  <Text style={[styles.previewText, { color: theme.text }]}>
                    {generateUnifiedShareMessage()}
                  </Text>
                </View>
              </View>

              {/* Aperçu de l'image */}
              {shareWithImage && product.images && product.images.length > 0 && (
                <View style={styles.imagePreviewSection}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Image à partager (image {0 + 1})
                  </Text>
                  <Image 
                    source={{ uri: getImageUri(product.images[0]?.image) }}
                    style={styles.sharePreviewImage}
                    defaultSource={require('../../assets/images/baraka_icon.png')}
                  />
                </View>
              )}
            </ScrollView>

            
              {/* Nouveau bouton pour générer PDF */}
              <TouchableOpacity 
                style={[
                  styles.pdfButton,
                  { backgroundColor: '#4CAF50' }
                ]}
                onPress={generateSingleProductPDF}
                disabled={isSharing}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="share-social" size={20} color="white" />
                )}
                <Text style={styles.pdfButtonText}>
                  {isSharing ? 'Partage...' : 'Partager'}
                </Text>
              </TouchableOpacity>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: theme.text + '40' }]}
                onPress={() => setShareModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                  Annuler
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Composant de rendu des catégories avec design horizontal
  const renderCategory = ({ item }: { item: { id: string; name: string; productCount: number; image?: string } }) => {
    return (
      <TouchableOpacity
        style={[styles.categoryCard, { backgroundColor: theme.background }]}
        onPress={() => handleCategoryPress(item.name)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryImageContainer}>
          <View style={[styles.categoryImagePlaceholder, { backgroundColor: '#F58320' }]}>
            <Ionicons name="grid" size={32} color="white" />
          </View>
          <View style={styles.categoryOverlay}>
            <Text style={styles.categoryProductCount}>{item.productCount}</Text>
          </View>
        </View>
        
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryName, { color: theme.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.categoryProductText, { color: '#F58320' }]}>
            {item.productCount} produit{item.productCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  
  // Composant renderProductCard adapté avec dimensions responsives
  const renderPopularProductCard = ({ item }: { item: Product }) => {
     const stockStatus = item.stock === 0;
        const productImage = item.images?.[0]?.image;
        const productPrice = getPriceByCriterion(item);
        const isSelected = selectedProducts.includes(item.id.toString());
        
        // Description encore plus courte pour les colonnes rapprochées
        const descriptionLength = 20;
        const limitedDescription = item.description 
          ? item.description.length > descriptionLength 
            ? `${item.description.substring(0, descriptionLength - 3)}...` 
            : item.description
          : '';
    
        return (
        <TouchableOpacity
          style={[
            styles.MODALProductCard,
            {
              width: responsive.productCardWidth,
              marginHorizontal: 1, // Marge horizontale réduite
              marginBottom: 4, // Marge inférieure réduite
              height: 180, // Hauteur réduite pour plus de compacité
            },
            isSelected && styles.selectedProductCardStyle
          ]}
          onPress={() => {
            navigation.navigate('ProductDetailScreen', { productId: item.id });
          }}
        >
          {/* Conteneur image avec badges */}
          <View style={[
            styles.MODALProductImageContainer,
            { height: 90 } // Hauteur d'image réduite
          ]}>
            {productImage ? (
              <Image
                source={{ uri: `https://backend.barakasn.com${productImage}` }}
                style={[styles.MODALProductImage, { height: 90 }]}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={require('../../assets/images/baraka_icon.png')}
                style={[styles.MODALProductImage, { height: 90 }]}
                resizeMode="contain"
              />
            )}
    
            {/* Bouton de sélection */}
            {/* <TouchableOpacity 
              onPress={() => toggleProductSelection(item.id.toString())}
              style={styles.selectionButton}
            >
              <Ionicons 
                name={isSelected ? "checkbox" : "square-outline"} 
                size={18} // Taille d'icône réduite
                color={isSelected ? "#4CAF50" : "#666"} 
              />
            </TouchableOpacity> */}
          </View> 
    
          {/* Conteneur informations produit */}
          <View style={styles.MODALProductInfo}>
            <Text 
              style={styles.MODALProductName} 
              numberOfLines={2}
            >
              {item.name}
            </Text>
            
            {/* Prix */}
            <Text style={styles.MODALProductPrice}>
              {showPrices 
                ? productPrice ? `${formatPrice(productPrice.price)} FCFA` : 'Prix N/A'
                : ' '}
            </Text>
            
            {/* Badge de statut de stock */}
            <View style={[
              styles.MODALStockIndicator,
              { 
                backgroundColor: stockStatus ? '#FF3B30' : '#34C759',
              }
            ]}>
              <Text style={styles.MODALStockText}>
                {stockStatus ? 'RUPTURE' : 'STOCK'}
              </Text>
            </View>

              
              <TouchableOpacity 
                onPress={() => openShareModal(item)}
                style={styles.rendermodalShareButton}>
                <Ionicons name="share-social" size={18} color="#F58320" />
              </TouchableOpacity>

    
            {/* Indicateur de sélection */}
            {isSelected && (
              <View style={styles.selectedIndicator}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              </View>
            )}
          </View>
        </TouchableOpacity>
        );
  };

  // Composant de rendu des produits avec design amélioré
  const renderProduct = ({ item }: { item: Product }) => {
    const stockStatus = item.stock === 0;
        const productImage = item.images?.[0]?.image;
        const productPrice = getPriceByCriterion(item);
        const isSelected = selectedProducts.includes(item.id.toString());
        
        // Description encore plus courte pour les colonnes rapprochées
        const descriptionLength = 20;
        const limitedDescription = item.description 
          ? item.description.length > descriptionLength 
            ? `${item.description.substring(0, descriptionLength - 3)}...` 
            : item.description
          : '';
    
        return (
        <TouchableOpacity
          style={[
            styles.MODALProductCard,
            {
              width: responsive.productCardWidth,
              marginHorizontal: 1, // Marge horizontale réduite
              marginBottom: 4, // Marge inférieure réduite
              height: 180, // Hauteur réduite pour plus de compacité
            },
            isSelected && styles.selectedProductCardStyle
          ]}
          onPress={() => {
            navigation.navigate('ProductDetailScreen', { productId: item.id });
          }}
        >
          {/* Conteneur image avec badges */}
          <View style={[
            styles.MODALProductImageContainer,
            { height: 90 } // Hauteur d'image réduite
          ]}>
            {productImage ? (
              <Image
                source={{ uri: `https://backend.barakasn.com${productImage}` }}
                style={[styles.MODALProductImage, { height: 90 }]}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={require('../../assets/images/baraka_icon.png')}
                style={[styles.MODALProductImage, { height: 90 }]}
                resizeMode="contain"
              />
            )}
    
            {/* Bouton de sélection */}
            {/* <TouchableOpacity 
              onPress={() => toggleProductSelection(item.id.toString())}
              style={styles.selectionButton}
            >
              <Ionicons 
                name={isSelected ? "checkbox" : "square-outline"} 
                size={18} // Taille d'icône réduite
                color={isSelected ? "#4CAF50" : "#666"} 
              />
            </TouchableOpacity> */}
          </View> 
    
          {/* Conteneur informations produit */}
          <View style={styles.MODALProductInfo}>
            <Text 
              style={styles.MODALProductName} 
              numberOfLines={2}
            >
              {item.name}
            </Text>
            
            {/* Prix */}
            <Text style={styles.MODALProductPrice}>
              {showPrices 
                ? productPrice ? `${formatPrice(productPrice.price)} FCFA` : 'Prix N/A'
                : ' '}
            </Text>
            
            {/* Badge de statut de stock */}
            <View style={[
              styles.MODALStockIndicator,
              { 
                backgroundColor: stockStatus ? '#FF3B30' : '#34C759',
              }
            ]}>
              <Text style={styles.MODALStockText}>
                {stockStatus ? 'RUPTURE' : 'STOCK'}
              </Text>
            </View>
    
            {/* Indicateur de sélection */}
            {isSelected && (
              <View style={styles.selectedIndicator}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              </View>
            )}
          </View>
        </TouchableOpacity>
        );
  };
      

  // État pour la modal
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedCategoryData, setSelectedCategoryData] = useState<CategoryData | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);


  const handleCategoryPress = (categoryName: string) => {
    const filteredProducts = allProducts.filter(product => product.category.name === categoryName);
    const categoryInfo = categories.find(cat => cat.name === categoryName);

    if (categoryInfo) {
      navigation.navigate('CategoryProductsScreen', { 
        category: categoryInfo,
        products: filteredProducts 
      });
    }
  };


  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [filteredCategoryProducts, setFilteredCategoryProducts] = useState<Product[]>([]);

  // Fonction pour filtrer les produits en fonction de la recherche
  const filterProducts = (query: string) => {
    if (!query.trim()) {
      setFilteredCategoryProducts([]);
      return;
    }

    const filtered = categoryProducts.filter(product => 
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(query.toLowerCase()))
    );

    setFilteredCategoryProducts(filtered);
  };

  // Appelé lorsque le texte de recherche change
  const handleSearchChange = (text: string) => {
    setModalSearchQuery(text);
    filterProducts(text);
  };

  // Composant Modal pour afficher les produits de la catégorie
  const CategoryModal = ({
    modalVisible,
    setModalVisible,
    modalSearchQuery,
    setModalSearchQuery,
    filteredCategoryProducts,
    categoryProducts,
    theme,
    responsiveModal
  }: {
    modalVisible: boolean;
    setModalVisible: (visible: boolean) => void;
    modalSearchQuery: string;
    setModalSearchQuery: (query: string) => void;
    filteredCategoryProducts: Product[];
    categoryProducts: Product[];
    theme: any;
    responsiveModal: any;
  }) => {
    const productsToShow = modalSearchQuery.trim() !== '' ? filteredCategoryProducts : categoryProducts;
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
        }}
        style={styles.fullScreenModal}
      >
        <SafeAreaView style={[styles.modalContainer, { paddingTop: 0 }]}>
          <StatusBar barStyle="light-content" backgroundColor="#F58320" />
          
          <View style={[styles.modalCategorieHeader, 
            { 
              height: responsiveModal.headerHeight,
              paddingHorizontal: responsiveModal.horizontalPadding
            }
          ]}>
            <TouchableOpacity 
              onPress={() => {
                setModalVisible(false);
                setModalSearchQuery('');
              }}>
              <Ionicons name="arrow-back" size={24} color="#F58320" />
            </TouchableOpacity>
            
            <View style={styles.profileContainer}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un produit..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearchInputChange}
                onSubmitEditing={() => handleSearch()}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchButton}>
                <Ionicons name="search-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
  
          {/* <View style={styles.modalCategorieContent}>
            {productsToShow.length > 0 ? (
              <FlatList
                data={productsToShow}
                renderItem={renderProductInModal}
                keyExtractor={(item) => item.id.toString()}
                numColumns={responsiveModal.productColumns} // Utilise le nombre de colonnes adaptatif
                columnWrapperStyle={[styles.modalProductRow,
                  { 
                    justifyContent: responsiveModal.isLandscape ? 'space-between' : 'space-between',
                    marginBottom: responsiveModal.isLandscape ? 0 : 16,
                  }]}
                contentContainerStyle={styles.modalProductList}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.modalProductSeparator} />}
              />
            ) : (
              <View style={styles.emptyModalContainer}>
                <Ionicons name="cube-outline" size={64} color="#ccc" />
                <Text style={styles.emptyModalText}>
                  {modalSearchQuery.trim() !== '' 
                    ? `Aucun produit trouvé pour "${modalSearchQuery}"`
                    : 'Aucun produit disponible dans cette catégorie'
                  }
                </Text>
              </View>
            )}
          </View> */}
        </SafeAreaView>
      </Modal>
    );
  };

  const handleMessagePress = (message) => {
  // Vous pouvez naviguer vers un écran de détail ou afficher une modal
  Alert.alert(
    message.title,
    message.content,
    [
      { text: 'Fermer', style: 'cancel' },
      { 
        text: 'Voir plus', 
        onPress: () => {
          // Navigation vers écran de détail du message
          navigation.navigate('MessageDetailScreen', { messageId: message.id });
        }
      }
    ]
  );
};

  // Rendu du footer (indicateur de chargement)
  const renderFooter = () => {
    if (!loading) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.footerText}>Chargement...</Text>
      </View>
    );
  };

  // Rendu de l'en-tête
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Nos Produits</Text>
      <Text style={styles.headerSubtitle}>
        {products.length} sur {totalCount} produits
      </Text>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );

  // Gestion de la fin de liste atteinte
  const handleEndReached = () => {
    if (hasMore && !loading && !error) {
      loadMore();
    }
  };

  // Gestion du pull-to-refresh
  const handleRefresh = () => {
    if (!token) {
      Alert.alert(
        'Authentification requise',
        'Veuillez vous connecter pour voir les produits'
      );
      return;
    }
    refresh();
  };

  return (
    <TouchableWithoutFeedback>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {isAppInBackground && Platform.OS === 'ios' && (
                <BlurView
                  style={styles.securityBlur}
                  blurType="light"
                  blurAmount={25}
                  reducedTransparencyFallbackColor="white"
                />
              )}
        
              {isAppInBackground && Platform.OS === 'android' && (
                <View style={styles.securityOverlay} />
              )}
       {/* Barre des tâches fixe en haut */}
        <HeaderComponent 
          navigation={navigation}
          title="Baraka Electronique"
          // showCart={false} // Optionnel: masquer l'icône panier
        />

        {/* Contenu scrollable avec padding pour le header */}
        <ScrollView 
          style={{ flex: 1, paddingTop: responsive.headerHeight }}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={closeMenu}
        >

          {/* Pub & Promos */}
          <AutoScrollingCarousel />

          {/* NOUVEAU: Carrousel des messages de l'API */}
          {token && (
            <MessagesCarousel
              token={token}
              theme={theme}
              responsive={responsive}
              onMessagePress={handleMessagePress}
            />
          )}

          <>
            {viewMode === 'categories' ? (
              <>
                <View style={styles.categoryHeader}>
                  <Text style={[styles.subtitle, { color: theme.text }]}>
                    Découvrez nos catégories
                  </Text>
                  <Text style={[styles.categoryCount, { color: '#F58320' }]}>
                    {categories.length} catégories
                  </Text>
                </View>
                
                <FlatList
                key="categories-horizontal"
                data={categories}
                renderItem={renderCategory}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesHorizontalList}
                ItemSeparatorComponent={() => <View style={styles.categorySeparator} />}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="grid-outline" size={64} color="#ccc" />
                    <Text style={[styles.emptyText, { color: theme.text }]}>
                      Aucune catégorie disponible
                    </Text>
                  </View>
                }
                />
                          
                {/* Ajout de la modal */}
                <CategoryModal
                  modalVisible={modalVisible}
                  setModalVisible={setModalVisible}
                  modalSearchQuery={modalSearchQuery}
                  setModalSearchQuery={setModalSearchQuery}
                  filteredCategoryProducts={filteredCategoryProducts}
                  categoryProducts={categoryProducts}
                  // renderProductInModal={renderProductInModal}
                  theme={theme}
                  responsiveModal={responsiveModal}
                />
              </>
            ) : (
              <>
                <View style={styles.productsHeader}>
                  <TouchableOpacity 
                    style={styles.backToCategories}
                    onPress={() => setViewMode('categories')}
                  >
                    <Ionicons name="arrow-back" size={24} color="#F58320" />
                    <Text style={[styles.backText, { color: '#F58320' }]}>Catégories</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.categoryBadge}>
                    <Text style={[styles.categoryBadgeText, { color: theme.text }]}>
                      {selectedCategory}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.resultsCount, { color: theme.text }]}>
                  {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} trouvé{filteredProducts.length !== 1 ? 's' : ''}
                </Text>

                <FlatList
                  key={viewMode}
                  data={products}
                  renderItem={renderProduct}
                  ListHeaderComponent={renderHeader}
                  ListFooterComponent={renderFooter}
                  // ListEmptyComponent={renderEmpty}
                  onEndReached={handleEndReached}
                  onEndReachedThreshold={0.1} // Charger quand à 10% de la fin
                  refreshControl={
                    <RefreshControl
                      refreshing={loading && products.length === 0}
                      onRefresh={handleRefresh}
                      colors={['#007AFF']} // Android
                      tintColor="#007AFF" // iOS
                    />
                  }
                  showsVerticalScrollIndicator={false}
                  keyExtractor={(item) => item.id.toString()}
                  numColumns={2}
                  columnWrapperStyle={[styles.productRow,
                  { 
                    paddingHorizontal: responsive.horizontalPadding,
                    justifyContent: responsive.isLargeScreen ? 'flex-start' : 'space-between',
                    marginBottom: -6, // Ajoutez cet espace entre les rangées
                  }]}
                  contentContainerStyle={styles.productList}
                  // showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Ionicons name="search-outline" size={64} color="#ccc" />
                      <Text style={[styles.emptyText, { color: theme.text }]}>
                        Aucun produit trouvé dans cette catégorie
                      </Text>
                      <TouchableOpacity 
                        style={styles.emptyActionButton}
                        onPress={() => setViewMode('categories')}
                      >
                        <Text style={styles.emptyActionText}>Voir toutes les catégories</Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
              </>
            )}
          </>
          <BrandsCarousel />

          {/* </View> */}

          {/* Produits populaires */}
          <FlatList
          data={products}
          renderItem={renderPopularProductCard}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          // ListEmptyComponent={renderEmpty}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.1} // Charger quand à 10% de la fin
          refreshControl={
            <RefreshControl
              refreshing={loading && products.length === 0}
              onRefresh={handleRefresh}
              colors={['#007AFF']} // Android
              tintColor="#007AFF" // iOS
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={products.length === 0 ? styles.emptyList : undefined}
          
          numColumns={responsive.productColumns} // Utilisation du nombre de colonnes dynamique
          columnWrapperStyle={responsive.productColumns > 1 ? styles.productRow : undefined}
          // contentContainerStyle={styles.productList}
          ListEmptyComponent={
            <Text style={[styles.errorText, {color: theme.text}]}>
              Aucun produit disponible
            </Text>
          }
        />

        </ScrollView>
      {renderShareModal()}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};


interface Brand {
  id: string;
  name: string;
}

interface BrandsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Brand[];
}

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface Brand {
  id: string;
  name: string;
  image?: string;
}

interface BrandsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Brand[];
}

const BrandsCarousel = () => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const responsive = getResponsiveDimensions();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigation = useNavigation<NavigationProp>();

  // Charger le token
  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  // Fetch brands data
  const fetchBrands = async () => {
    try {
      if (!token) return;

      setLoading(true);
      const response = await fetch('https://backend.barakasn.com/api/v0/products/brands/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const data: BrandsResponse = await response.json();
      setBrands(data?.results || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products
  const fetchAllProducts = async () => {
    if (!token) return;
    try {
      const products = await getProducts50Simple(token);
      setAllProducts(products);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Auto-scroll carousel
  useEffect(() => {
    if (brands.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % brands.length;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex, brands.length]);

  // Fetch data when token is available
  useEffect(() => {
    if (token) {
      fetchBrands();
      fetchAllProducts();
    }
  }, [token]);

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [brandProducts, setBrandProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Get initials for brand logo
  const getBrandInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Construire l'URL d'image correcte
  const getBrandImageUri = (brand: Brand): string | null => {
    const brandImage = brand.image;
    
    if (!brandImage) return null;
    
    // Si l'image contient déjà le domaine complet, l'utiliser telle quelle
    if (brandImage.startsWith('http')) {
      return brandImage;
    } else {
      // Sinon, construire l'URL avec le bon format
      return `https://backend.barakasn.com/media/${brandImage}`;
    }
  };

  const handleBrandSelect = (brand: Brand) => {
    setLoadingProducts(true);
    setSelectedBrand(brand);
    
    // Filtrer les produits par marque
    const productsForBrand = allProducts.filter(product => {
      if (!product.brand || !product.brand.id || !brand.id) return false;
      return product.brand.id.toString() === brand.id.toString();
    });
    
    setBrandProducts(productsForBrand);
    setLoadingProducts(false);
  };

  // Render each brand item
  const renderBrandItem = ({ item }: { item: Brand }) => {
    const productCount = allProducts.filter(
      p => p.brand?.id && item.id && p.brand.id.toString() === item.id.toString()
    ).length;

    const imageUri = getBrandImageUri(item);

    return (
      <TouchableOpacity
        onPress={() => handleBrandSelect(item)}
        style={[styles.categoryCard, { backgroundColor: theme.background }]}
        activeOpacity={0.8}>

        <View style={styles.categoryImageContainer}>
          {imageUri ? (
            <View style={styles.categoryImagePlaceholder}>
              <Image
                source={{ uri: imageUri }}
                style={[
                  styles.brandImage,
                  { 
                    height: 100,
                    width: '100%',
                    borderRadius: 8
                  }
                ]}
                resizeMode="contain"
                onError={(e) => {
                  console.log('Erreur chargement image marque:', item.image, 'URL finale:', imageUri);
                  console.log('Erreur:', e.nativeEvent.error);
                }}
              />
            </View>
          ) : (
            <View style={[styles.categoryImagePlaceholder, { backgroundColor: '#F58320' }]}>
              <Text style={styles.brandInitials}>
                {getBrandInitials(item.name)}
              </Text>
            </View>
          )}
          
          <View style={styles.categoryOverlay}>
            <Text style={styles.categoryProductCount}>{productCount}</Text>
          </View>
        </View>
        
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryName, { color: theme.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.categoryProductText, { color: '#F58320' }]}>
            {productCount} produit{productCount > 1 ? 's' : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F58320" />
      </View>
    );
  }

  if (brands.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={{ color: theme.text }}>Aucune marque disponible</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Nos Marques
      </Text>
      
      <FlatList
        key="flatListRef"
        data={brands.slice(0, 5)}
        renderItem={renderBrandItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesHorizontalList}
        ItemSeparatorComponent={() => <View style={styles.categorySeparator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="grid-outline" size={64} color="#ccc" />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              Aucune marque disponible
            </Text>
          </View>
        }
      />

      {/* Bouton Voir plus */}
      {brands.length > 5 && (
        <TouchableOpacity
          onPress={() => navigation.navigate('BrandsScreen')}
          style={styles.seeMoreButton}
        >
          <Text style={styles.seeMoreText}>Voir plus</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const AutoScrollingCarousel = () => {
  
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const responsive = getResponsiveDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Récupération des produits depuis l'API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://backend.barakasn.com/api/v0/products/products/');
      const data = await response.json();
      
      // Prendre seulement les 5 premiers produits
      const selectedProducts = data.slice(0, 5).map((product, index) => ({
        id: product.id.toString(),
        title: product.name,
        subtitle: product.description || 'Découvrez ce produit',
        image: product.image ? { uri: product.image } : require('../../assets/images/bijoux.jpg'),
        price: product.price,
        backgroundColor: getCarouselColors(index).backgroundColor,
        textColor: getCarouselColors(index).textColor,
        type: product.category || 'produit'
      }));
      
      setProducts(selectedProducts);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      // En cas d'erreur, utiliser des données par défaut
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour obtenir des couleurs variées pour le carrousel
  const getCarouselColors = (index) => {
    const colorSchemes = [
      { backgroundColor: '#FFE8D6', textColor: '#D4A373' },
      { backgroundColor: '#F0E6EF', textColor: '#7F5A83' },
      { backgroundColor: '#E6F9FF', textColor: '#00A8E8' },
      { backgroundColor: '#FFF0E6', textColor: '#FF8C42' },
      { backgroundColor: '#E8F5E8', textColor: '#4A7C59' }
    ];
    return colorSchemes[index % colorSchemes.length];
  };

  // Chargement initial des produits
  useEffect(() => {
    fetchProducts();
  }, []);

  // Défilement automatique
  useEffect(() => {
    if (products.length === 0) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % products.length;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true
      });
    }, 5000); // Change toutes les 5 secondes

    return () => clearInterval(interval);
  }, [currentIndex, products.length]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.carouselItem, 
        { 
          backgroundColor: theme.header.backgroundColor,
          shadowColor: theme.header.text,
          marginHorizontal: responsive.horizontalPadding
        }
      ]}
      onPress={() => Alert.alert(item.title, `${item.subtitle}\n\nPrix: ${item.price ? item.price + ' FCFA' : 'Prix non disponible'}`)}
    >
      <View style={styles.carouselTextContainer}>
        <Text style={[styles.carouselBadge, { backgroundColor: item.textColor }]}>
          {item.type.toUpperCase()}
        </Text>
        <Text style={[
          styles.carouselTitle, 
          { 
            color: item.textColor,
            fontSize: responsive.titleFontSize
          }
        ]}>
          {item.title}
        </Text>
        <Text style={[
          styles.carouselSubtitle, 
          { 
            color: item.textColor,
            fontSize: responsive.subtitleFontSize
          }
        ]}>
          {item.subtitle}
        </Text>
        {showPrices && item.price && (
          <Text style={[
            styles.carouselPrice,
            {
              color: item.textColor,
              fontSize: responsive.subtitleFontSize * 0.9,
              fontWeight: 'bold',
              marginTop: 4
            }
          ]}>
            {item.price} FCFA
          </Text>
        )}
      </View>
      <Image 
        source={item.image} 
        style={[
          styles.carouselImage,
          {
            width: responsive.isTablet ? 150 : 120,
            height: responsive.isTablet ? 150 : 120
          }
        ]} 
        defaultSource={require('../../assets/images/bijoux.jpg')}
      />
    </TouchableOpacity>
  );

  // Affichage du loading
  if (loading) {
    return (
      <View style={[styles.carouselContainer, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#F58320" />
        <Text style={[styles.loadingText, { color: theme.header.text }]}>
          Chargement des produits...
        </Text>
      </View>
    );
  }

  // Affichage si aucun produit
  if (products.length === 0) {
    return (
      <View style={[styles.carouselContainer, styles.emptyContainer]}>
        <Text style={[styles.emptyText, { color: theme.header.text }]}>
          Aucun produit disponible
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchProducts}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={flatListRef}
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // onMomentumScrollEnd={(event) => {
        //   // Optionnel: synchroniser l'index avec le scroll manuel
        //   const index = Math.round(
        //     event.nativeEvent.contentOffset.x / (width - responsive.horizontalPadding * 2)
        //   );
        //   if (index >= 0 && index < products.length) {
        //     setCurrentIndex(index);
        //   }
        // }}
      />
      <View style={styles.carouselPagination}>
        {products.map((_, index) => (
          <View
            key={index}
            style={[
              styles.carouselDot,
              {
                backgroundColor: 
                  index === currentIndex ? '#F58320' : '#D8D8D8',
                width: index === currentIndex ? 20 : 8,
              }
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const MessagesCarousel: React.FC<MessagesCarouselProps> = ({ 
  theme, 
  responsive,
  onMessagePress 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
    const [token, setToken] = useState<string | null>(null);
      const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Charger les messages au montage du composant
  
  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  const fetchAllMessages = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await axios.get('https://backend.barakasn.com/api/v0/messages/messages/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      setMessages(response.data.results || []);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMessages();
  }, [token]);


  
  const handleMessagePress = (message: Message) => {
    setSelectedMessage(message);
    Alert.alert(
        message.title,
        message.message,
        [{ text: 'OK' }]
      );
  };

  const handleBackPress = () => {
    setSelectedMessage(null);
  };

  
    // if (selectedMessage) {
    //   return (
    //     <SafeAreaView style={styles.container}>
    //       <StatusBar barStyle="dark-content" />
          
    //       <View style={styles.headerText}>
    //         <TouchableOpacity onPress={handleBackPress}>
    //           <Text style={styles.backButton}>← Retour</Text>
    //         </TouchableOpacity>
    //         <Text style={styles.headerTitle}>Détail du message</Text>
    //       </View>
  
    //       <ScrollView style={styles.detailContainer}>
    //         <Text style={styles.detailTitle}>{selectedMessage.title}</Text>
    //         <Text style={styles.detailContent}>{selectedMessage.message}</Text>
    //       </ScrollView>
    //     </SafeAreaView>
    //   );
    // }
  

  // Formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Composant de rendu d'un message
  const renderMessage = ({ item }: { item: Message }) => {
    const messageDate = formatDate(item.created_at);
    
    return (
      <TouchableOpacity
        style={[
          styles.messageCard,
          {
            backgroundColor: theme.background || '#FFFFFF',
            width: screenWidth - (responsive.horizontalPadding * 2),
          }
        ]}
        onPress={() => handleMessagePress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.messageContent}>
          {/* Badge de priorité */}
          {item.priority && item.priority > 0 && (
            <View style={[styles.priorityBadge, {
              backgroundColor: item.priority >= 5 ? '#FF3B30' : '#F58320'
            }]}>
              <Text style={styles.priorityText}>
                {item.priority >= 5 ? 'URGENT' : 'IMPORTANT'}
              </Text>
            </View>
          )}
          
          {/* Icône et contenu */}
          <View style={styles.messageTextContainer}>
            <View style={styles.messageHeader}>
              <Ionicons 
                name="notifications" 
                size={20} 
                color="#F58320" 
                style={styles.messageIcon}
              />
              <Text style={[styles.messageTitle, { color: theme.text || '#333' }]}>
                {item.title}
              </Text>
            </View>
            
            <Text 
              style={[styles.messageText, { color: theme.text || '#666' }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.message}
            </Text>
            
            {/* <Text style={[styles.messageDate, { color: theme.text + '80' || '#999' }]}>
              {messageDate}
            </Text> */}
          </View>

          {/* Image optionnelle */}
          {item.image && (
            <View style={styles.messageImageContainer}>
              <Image 
                source={{ uri: `https://backend.barakasn.com${item.image}` }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            </View>
          )}
        </View>
        
        {/* Flèche d'action */}
        <View style={styles.messageArrow}>
          <Ionicons name="chevron-forward" size={16} color="#F58320" />
        </View>
      </TouchableOpacity>
    );
  };

  // Affichage du loading
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { marginHorizontal: responsive.horizontalPadding }]}>
        <ActivityIndicator size="small" color="#F58320" />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Chargement des messages...
        </Text>
      </View>
    );
  }

  // Affichage de l'erreur
  if (error) {
    return (
      <View style={[styles.errorContainer, { marginHorizontal: responsive.horizontalPadding }]}>
        <Ionicons name="alert-circle" size={24} color="#FF3B30" />
        <Text style={[styles.errorText, { color: theme.text }]}>
          {error}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchAllMessages}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Si aucun message
  if (messages.length === 0) {
    return null; // Ne rien afficher s'il n'y a pas de messages
  }

  return (
    <View style={[styles.carouselMessageContainer, { marginHorizontal: responsive.horizontalPadding }]}>
      {/* En-tête du carrousel */}
      <View style={styles.carouselHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="megaphone" size={20} color="#F58320" />
          <Text style={[styles.carouselMessageTitle, { color: theme.text }]}>
            Messages
          </Text>
        </View>
        <Text style={[styles.messageCounter, { color: '#F58320' }]}>
          {currentIndex + 1}/{messages.length}
        </Text>
      </View>

      {/* Carrousel des messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / (screenWidth - responsive.horizontalPadding * 2)
          );
          setCurrentIndex(index);
        }}
        contentContainerStyle={styles.carouselContent}
        ItemSeparatorComponent={() => <View style={styles.messageSeparator} />}
        onScrollToIndexFailed={(info) => {
          console.warn('Scroll to index failed:', info);
        }}
      />

      {/* Indicateurs de pagination */}
      {messages.length > 1 && (
        <View style={styles.pagination}>
          {messages.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.paginationDot,
                {
                  backgroundColor: index === currentIndex ? '#F58320' : '#D8D8D8',
                  width: index === currentIndex ? 20 : 8,
                }
              ]}
              onPress={() => {
                setCurrentIndex(index);
                flatListRef.current?.scrollToIndex({
                  index,
                  animated: true
                });
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 8, // Réduit encore plus l'espacement général
    // paddingTop: 10,
  },brandImage: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  brandInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },

  // Réduire davantage l'espacement entre les colonnes
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 4, // Espace entre les lignes réduit
    gap: 4, // Espace entre les colonnes réduit
  },

  // Cartes produits encore plus compactes
  MODALProductCard: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 4, // Padding réduit
    marginBottom: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    flex: 1,
    marginHorizontal: 2, // Marge horizontale réduite
  },

  // Image container plus compact
  MODALProductImageContainer: {
    position: 'relative',
    marginBottom: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // Image produit
  MODALProductImage: {
    width: '100%',
    borderRadius: 4,
    backgroundColor: '#f8f8f8',
  },

  // Info produit plus compacte
  MODALProductInfo: {
    flex: 1,
    paddingTop: 2,
  },

  // Textes plus compacts
  MODALProductName: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
    lineHeight: 12,
    fontSize: 10, // Taille de police réduite
  },

  MODALProductDescription: {
    color: '#666',
    marginBottom: 3,
    fontSize: 8, // Taille de police réduite
  },

  MODALProductPrice: {
    fontWeight: 'bold',
    color: '#F58320',
    marginTop: 2,
    fontSize: 10, // Taille de police réduite
  },

  // Boutons plus compacts
  selectionButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 1,
  },

  // Indicateur de stock
  MODALStockIndicator: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },

  MODALStockText: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 8, // Taille réduite
  },

  // Indicateur de sélection
  selectedIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 1,
  },

  // Barre de sélection plus compacte
  selectedProductsBar: {
    position: 'absolute',
    top: 60, // Ajusté pour les petits écrans
    left: 8, // Réduit de 10 à 8
    right: 8, // Réduit de 10 à 8
    zIndex: 50,
    borderRadius: 10,
    padding: 8, // Réduit de 12 à 8
    marginBottom: 8, // Espacement réduit
  },

  // Chip de produit sélectionné plus compact
  selectedProductChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 16, // Légèrement réduit
    paddingHorizontal: 8, // Réduit de 12 à 8
    paddingVertical: 4, // Réduit de 6 à 4
    marginRight: 6, // Réduit de 8 à 6
    maxWidth: 120, // Réduit de 150 à 120
  },
  
  // Styles pour la carte produit sélectionnée
  selectedProductCardStyle: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#F8FFF8',
  },
  // menuHeader: {
  //   borderBottomWidth: 1,
  //   borderBottomColor: 'rgba(255,255,255,0.1)',
  // },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#F58320',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  carouselPrice: {
    // Ce style sera appliqué dynamiquement
  },

fullScreenModal: {
    flex: 1,
    marginTop: 10,
  },
  
  pdfButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    minHeight: 50,
  },
  pdfButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  userInfo: {
    marginBottom: 5,
  },
  userEmail: {
    marginBottom: 2,
  },
  notificationBadge: {
    backgroundColor: '#ff4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 'auto',
    marginRight: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 15,
    // borderBottomLeftRadius: 20,
    // borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  profileContainer: { 
    justifyContent: "center",
    alignItems: "center",
  },
  profileText: {
    fontWeight: "bold",
  },
  
  // Nouveau container pour les icônes avec espacement adaptatif
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  icon1Container: {
    position: 'relative',
  },


  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 30,
    width: 290, // Largeur réduite pour plus d'élégance
    height: 45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#F58320',
    width: 45,
    height: 45,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto', // Pousse le bouton à droite
  },
  searchIcon: {
    marginLeft: 10,
  },

  
  // Styles pour la vue grille (améliorés)
  productCard: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    backgroundColor: '#f8f8f8',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  productCategory: {
    opacity: 0.7,
  },
  productCategoryParent: {
    fontWeight: '500',
  },
  priceStockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  productPrice: {
    fontWeight: 'bold',
  },
  stockCount: {
    fontSize: 10,
    opacity: 0.8,
  },
  shareButton: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 25,
    width: 40,
    position: 'absolute',
    right: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  stockIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },

  
  rendermodalShareButton: {
    position: 'absolute',
    bottom: 0,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 6,
  },
  rendermodalStockIndicator: {
    position: 'absolute',
    bottom: -25,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rendermodalStockText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  productCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  // productCard: {
  //   backgroundColor: '#fff',
  //   borderRadius: 8,
  //   padding: 8,
  //   margin: 8,
  //   height: 500,
  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.1,
  //   shadowRadius: 4,
  //   elevation: 2,
  // },
  // productImageContainer: {
  //   aspectRatio: 1,
  //   borderRadius: 8,
  //   overflow: 'hidden',
  //   backgroundColor: '#f5f5f5',
  //   marginBottom: 8,
  // },
  // productImage: {
  //   width: '100%',
  //   height: '100%',
  // },
  // productInfo: {
  //   paddingHorizontal: 4,
  // },
  // productName: {
  //   fontSize: 14,
  //   fontWeight: '500',
  //   marginBottom: 4,
  //   color: '#333',
  // },
  // productPrice: {
  //   fontSize: 14,
  //   fontWeight: 'bold',
  //   color: '#F58320',
  // },


// Styles pour la modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    maxHeight: '75%',
  },
  shareOptions: {
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 10,
  },
  customPriceSection: {
    marginBottom: 20,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customPriceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  productPreview: {
    marginBottom: 20,
  },
  productPreviewCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productPreviewInfo: {
    flex: 1,
  },
  previewProductName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  previewSection: {
    marginBottom: 20,
  },
  previewBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  shareModalButton: {
    flex: 1,
    backgroundColor: '#F58320',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    minHeight: 50,
  },
  shareModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },


  shareMethodSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'left',
  },
  
  shareMethodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  
  shareMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  
  shareMethodButtonActive: {
    backgroundColor: '#F58320',
    borderColor: '#F58320',
  },
  
  shareMethodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  
  shareMethodButtonTextActive: {
    color: '#FFFFFF',
  },
  
  
  imagePreviewSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  
  sharePreviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
    // backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  modalproductcard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    height: 290,
    // Retirez marginBottom d'ici car il est géré dynamiquement
  },

  // Option 1: Ajouter de l'espacement dans le conteneur de la liste
  productList: {
    paddingBottom: 16,
    paddingTop: 8,
    // Ajoutez ceci pour un espacement uniforme entre les rangées :
    gap: 16, // Espacement vertical entre les éléments (iOS 14+ et Android)
  },

  // Option 2: Modifier le style de la rangée pour plus d'espacement
  modalProductRow: {
    justifyContent: 'space-between',
    marginBottom: 20, // Augmentez cette valeur pour plus d'espace entre les rangées
    paddingHorizontal: 8,
  },

  // Option 3: Style alternatif pour le conteneur de produit avec plus d'espacement
  modalproductcardWithSpacing: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    height: 290,
    marginBottom: 24, // Espacement vertical plus important
    marginTop: 8,     // Petit espacement en haut
  },

  // Autres styles inchangés...
  modalProductImageContainer: {
    position: 'relative',
    marginBottom: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },

  modalProductImage: {
    width: '100%',
    borderRadius: 6,
    backgroundColor: '#f8f8f8',
  },

  modalShareButton: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  modalStockIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },

  modalStockText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'white',
  },

  modalProductInfo: {
    flex: 1,
  },

  modalProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 16,
  },

  modalProductDescription: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
  },

  modalProductPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F58320',
    marginTop: 4,
  },

  
  // Styles pour les cartes produits - optimisés pour 2 colonnes
  modalProductCard: {
    backgroundColor: '#fff',
    borderRadius: 10, // Légèrement réduit
    padding: 8, // Réduit
    elevation: 2, // Réduit
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    height: 300,
  },

  modalProductCategory: {
    fontSize: 9, // Réduit
    color: '#555',
  },

  modalProductBrand: {
    fontSize: 11, // Réduit
    color: '#F58320',
    fontWeight: '500',
  },

  // Styles pour la rangée de produits - optimisés
  // emptyContainer: {
  //   flex: 1,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   paddingVertical: 40, // Réduit
  //   paddingHorizontal: 20,
  // },
  // emptyText: {
  //   fontSize: 16,
  //   textAlign: 'center',
  //   marginTop: 16,
  //   lineHeight: 22,
  // },

  brandCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },

  categoryPill: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },

modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
modalCategorieHeader: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    // paddingVertical: 10, // Réduit de 15 à 10
    // backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
},
  closeButton: {
    padding: 8,
  },
  modalHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  modalCategorieTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  modalCategorieContent: {
    flex: 1,
    padding: 16,
  },
  modalProductList: {
    paddingBottom: 20,
  },
  modalProductSeparator: {
    height: 16,
  },
  emptyModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },

categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  categoryCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  categoriesHorizontalList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  categoryCard: {
    width: 120,
    height: 140,
    borderRadius: 15,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  categoryImageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  
  categoryImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  categoryOverlay: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  categoryProductCount: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  categoryInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  
  categoryProductText: {
    fontSize: 10,
    fontWeight: '500',
  },
  
  categorySeparator: {
    width: 15,
  },
  
  // Styles pour l'en-tête des produits
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  
  backToCategories: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  backText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  
  categoryBadge: {
    backgroundColor: '#F58320',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  
  categoryBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  resultsCount: {
    fontSize: 14,
    marginBottom: 15,
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  
  
  stockModalIndicator: {
    position: 'absolute',
    top: 0,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  
  stockText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  
  // productCategory: {
  //   opacity: 0.7,
  //   marginBottom: 2,
  // },
  
  // productCategoryParent: {
  //   fontWeight: '500',
  //   marginBottom: 4,
  // },
  
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  
  addButton: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  
rendermodalProductCard: {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 12,
  width: (screenWidth - 64) / 2, // Augmentez l'espace entre les colonnes
  height: 320, // Ajustez la hauteur pour plus d'espace
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  marginTop: 100, // Espace vertical
  marginHorizontal: 8, // Espace horizontal
},
  rendermodalProductDescription: {
  fontSize: 12,
  color: '#666',
  marginTop: 4,
},

  rendermodalProductImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  rendermodalProductImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  rendermodalProductInfo: {
    flex: 1,
  },
  rendermodalProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  rendermodalProductPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F58320',
  },
  
  
  emptyActionButton: {
    backgroundColor: '#F58320',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  
  emptyActionText: {
    color: 'white',
    fontWeight: '600',
  },
  
  // Styles pour les contrôles
  togglePricesButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 10,
  },

  // Styles pour les catégories
  categoriesList: {
    paddingBottom: 20,
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  categoryArrow: {
    marginLeft: 8,
  },
  
  // Styles pour les produits

  
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  
  badge1Text: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },


  categoriesScroll: {
    paddingLeft: 0,
  },
  categoriesScrollContent: {
    paddingRight: 0,
  },
  selectedCategoryCard: {
    transform: [{ scale: 1.05 }],
  },
  category: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  categoryText: {
    textAlign: "center",
    width: 80,
    marginTop: 5,
    fontWeight: '500',
  },
  section: {
    marginBottom: 25,
  },


  popularProductContainer: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },

  popularProductsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  popularProductWrapper: {
    width: '48%',
    marginBottom: 15,
  },
  popularProductCard: {
    borderRadius: 12,
    padding: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  popularProductImageContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  popularProductImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  popularProductInfo: {
    marginBottom: 10,
  },
  popularProductName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  popularProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F58320',
  },
  popularProductActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  popularProductActionButton: {
    padding: 5,
  },
  popularProductQuantity: {
    fontSize: 16,
    fontWeight: '600',
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    padding: 10,
  },
  seeMoreText: {
    marginRight: 5,
    fontWeight: '500',
  },



  // CAROUSEL automatique
  carouselContainer: {
    marginBottom: 25,
    borderRadius: 15,
    overflow: 'hidden',
  },
  carouselItem: {
    height: 180,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  carouselTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  carouselBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  carouselTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  carouselSubtitle: {
    fontSize: 16,
  },
  carouselImage: {
    resizeMode: 'contain',
  },
  carouselPagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  carouselDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },

  // BANNIERE notification
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notificationIcon: {
    marginRight: 10,
  },
  notificationText: {
    flex: 1,
    fontWeight: '500',
  },
  notificationPagination: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  notificationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  
  banner: {
    padding: 20,
    elevation: 3,
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  bannerSubtitle: {
    fontSize: 16,
  },
  bannerImage: {
    resizeMode: 'contain',
  },
  jewelryCard: {
    width: 160,
    marginRight: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jewelryImage: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  jewelryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  jewelryPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8b4513',
  },
  jewelryContainer: {
    paddingLeft: 15,
    paddingBottom: 10,
  },
  newArrivalsContainer: {
    paddingLeft: 20,
  },
  newArrivalCard: {
    width: 250,
    backgroundColor: '#FFF5EC',
    borderRadius: 15,
    marginRight: 15,
    overflow: 'hidden',
  },
  newArrivalImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  newArrivalTextContainer: {
    padding: 15,
  },
  newArrivalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F58320',
    marginBottom: 5,
  },
  newArrivalSubtitle: {
    fontSize: 14,
    color: '#666',
  },

  // Menu avec image de fond
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },

  menuDropdown: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%', // Utilise 100% de la hauteur de l'écran
    width: Math.min(550, Dimensions.get('window').width * 0.85), // Largeur adaptive
    zIndex: 1000,
  },

  menuHeader: {
    padding: 20,
    // paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: -20,
  },

  menuHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    // marginBottom: 5,
  },

  menuHeaderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    // marginBottom: 3,
  },

  menuScrollContainer: {
    paddingBottom: 50,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    // borderBottomWidth: 1,
    // borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    // width: 50,
  },

  menuIcon: {
    marginRight: 15,
    width: 24,
  },

  menuItemText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
    fontWeight: '500',
  },

  menuSwitch: {
    position: 'relative',
    right: 300,
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }]
  },

  messageBadge: {
    position: 'relative',
    right: 300,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  messageBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '600',
  },
  
cartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
},
cartButton: {
    padding: 5,
},
cartIconContainer: {
    backgroundColor: '#FFF5EC',
    padding: 8,
    borderRadius: 8,
},
promoBanner: {
    backgroundColor: '#F58320',
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
},
promoContent: {
    alignItems: 'center',
},
promoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
},
promoSubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
},

  categorytitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subCategoryItem: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  subCategoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subCategoryDescription: {
    fontSize: 14,
    color: '#666',
  },
  // Styles pour les états vides


  
  
  carouselMessageContainer: {
    marginBottom: 20,
  },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carouselMessageTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  messageCounter: {
    fontSize: 12,
    fontWeight: '500',
  },
  carouselContent: {
    paddingBottom: 10,
  },
  messageCard: {
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 100,
  },
  messageContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageTextContainer: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageIcon: {
    marginRight: 8,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  messageDate: {
    fontSize: 11,
    opacity: 0.7,
  },
  messageImageContainer: {
    marginLeft: 12,
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  messageImage: {
    width: '100%',
    height: '100%',
  },
  messageArrow: {
    marginLeft: 12,
    padding: 4,
  },
  priorityBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  messageSeparator: {
    width: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
    // transition: 'all 0.3s ease',
  },
  // loadingContainer: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   padding: 20,
  //   backgroundColor: '#F8F9FA',
  //   borderRadius: 12,
  //   marginBottom: 20,
  // },
  // loadingText: {
  //   marginLeft: 10,
  //   fontSize: 14,
  // },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 8,
  },
  // retryButton: {
  //   backgroundColor: '#F58320',
  //   paddingHorizontal: 16,
  //   paddingVertical: 8,
  //   borderRadius: 6,
  //   marginTop: 8,
  // },
  // retryButtonText: {
  //   color: 'white',
  //   fontSize: 12,
  //   fontWeight: '600',
  // },


  
  headerText: {
    padding: 16,
    top: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    fontSize: 16,
    color: '#0066cc',
    marginBottom: 8,
  },
  messageCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  detailContainer: {
    padding: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  detailContent: {
    fontSize: 16,
    lineHeight: 24,
  },

  
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  errorBanner: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    marginTop: 10,
  },
  productIndex: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  indexText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  endMessage: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
  },
  endMessageText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '500',
  },

  
  
  // sectionTitle: {
  //   fontSize: 18,
  //   fontWeight: 'bold',
  //   marginHorizontal: 16,
  //   marginBottom: 12,
  // },
  listContent: {
    paddingHorizontal: 16,
  },
  brandItemContainer: {
    alignItems: 'center',
    marginRight: 12,
    padding: 12,
    borderRadius: 8,
    elevation: 2,
  },
  brandLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  // brandInitials: {
  //   fontSize: 18,
  //   fontWeight: 'bold',
  //   color: '#333',
  // },
  brandName: {
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 100,
  },
  // productCount: {
  //   color: '#888',
  //   marginTop: 4,
  // },
  // pagination: {
  //   flexDirection: 'row',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   marginTop: 12,
  // },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },securityBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },

  securityOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  // loadingContainer: {
  //   height: 120,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  // emptyContainer: {
  //   height: 120,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  
});

export default HomeScreen;