/**
 * Ce fichier définit l'écran de gestion des soldes et promotions.
 * Il permet à l'utilisateur de voir les produits en promotion avec des prix réduits.
 * Intégré avec l'API https://backend.barakasn.com/api/v0/products/products/
 *
 * @module salesPage
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet,
  Dimensions, Image, TouchableOpacity, TextInput, Alert, ScrollView,TouchableWithoutFeedback, Switch,ImageBackground,ActivityIndicator,RefreshControl,
  StatusBar, 
  Platform, AppState } from 'react-native';
import { goalsData, Goal, MiniTask } from '../../data/goalsData';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { Icon, Badge } from 'react-native-elements';
import { useCart } from './useCart';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import { Product, Order, OrderItem } from '../../services/types';
import { getProducts, getProducts50Simple, getProductsPaginated  } from '../../services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderComponent from './HeaderComponent';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';

/**
 * Type pour les catégories de produits en solde.
 */
type Category = 'Ordinateurs' | 'Tablettes' | 'Télévisions' | 'Disques durs' | 'Casques' | 'Souris' | 'Tous';

/**
 * Service API pour récupérer les produits
 */
class ProductApiService {
  private static baseUrl = 'https://backend.barakasn.com/api/v0/';

  static async fetchProducts(page: number = 1, pageSize: number = 20): Promise<{
    results: Product[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}products/products/?page=${page}&page_size=${pageSize}`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des produits:', error);
      throw error;
    }
  }

  static async fetchProductsByCategory(category: string, page: number = 1): Promise<Product[]> {
    try {
      const response = await fetch(`${this.baseUrl}/products/?category=${encodeURIComponent(category)}&page=${page}`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des produits par catégorie:', error);
      throw error;
    }
  }
}

// Fonction pour obtenir les dimensions responsives

const getResponsiveDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isLargeScreen = width >= 1024;
  const isLandscape = width > height;
  const isPortrait = height > width;
  
  // Calculer les colonnes en fonction de l'orientation et de la taille d'écran
  let productColumns = 2; // Par défaut
  let categoryColumns = 2;
  let sidebarWidth = 200;
  
  if (isLandscape) {
    // En mode paysage
    if (isLargeScreen) {
      productColumns = 4;
      categoryColumns = 3;
      sidebarWidth = 280;
    } else if (isTablet) {
      productColumns = 3;
      categoryColumns = 3;
      sidebarWidth = 250;
    } else {
      productColumns = 3;
      categoryColumns = 2;
      sidebarWidth = 200;
    }
  } else {
    // En mode portrait
    if (isLargeScreen) {
      productColumns = 3;
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
    productColumns = Math.max(1, productColumns - 1);
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

type SalesScreenProps = {
  navigation: any;
  route?: any;
};

const SalesScreen: React.FC<SalesScreenProps> = ({ navigation, route }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('Tous');
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [responsive, setResponsive] = useState(getResponsiveDimensions());
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));

  // États pour l'API - consolidés
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [enabled, setEnabled] = useState(true);

  // États existants
  const [menuVisible, setMenuVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{[key: string]: string}>({});
  const { addedProduct } = route.params || {};
  const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const allCartItems = [...localCartItems, ...orders];
  const [token, setToken] = useState<string | null>(null);
  const { loadCart, cartItems, saveCart } = useCart();
  const [cartItemsCount, setCartItemsCount] = useState(0);

  // Écouter les changements de dimensions d'écran
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
      setResponsive(getResponsiveDimensions());
    });

    return () => subscription?.remove();
  }, []);

  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});

  const getPriceByCriterion = (product: Product) => {
    // Retourner simplement le premier prix disponible
    return product.prices && product.prices.length > 0 ? product.prices[0] : null;
  };

  // CORRECTION 1: Fonction de chargement qui attend le token obligatoirement
  const loadPage = useCallback(async (page: number, reset: boolean = false) => {
    if (loading || !enabled) return;

    // Ne pas charger si pas de token - l'API nécessite une authentification
    if (!token) {
      console.log('Token manquant, attente du token...');
      setError('Authentification requise. Chargement du token...');
      return;
    }

    console.log('Loading page:', page, 'Reset:', reset, 'Token available:', !!token);
    setLoading(true);
    setError(null);

    try {
      // Utiliser uniquement getProductsPaginated avec le token
      const response = await getProductsPaginated(token, page, pageSize);
      
      console.log('API Response:', response);

      setProducts(prevProducts => 
        reset ? response.results : [...prevProducts, ...response.results]
      );
      
      setHasMore(response.next !== null);
      setCurrentPage(page);
      setTotalCount(response.count);

      console.log('Products loaded:', response.results.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      console.error('Erreur de chargement:', err);
      
      // Si erreur 401, essayer de recharger le token
      if (errorMessage.includes('401')) {
        console.log('Token expiré, tentative de rechargement...');
        setError('Token expiré. Veuillez vous reconnecter.');
        // Optionnel: rediriger vers l'écran de connexion
        // navigation.navigate('LoginScreen');
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize, loading, enabled, token]);

  // Charger plus de produits - vérifier le token
  const loadMore = useCallback(() => {
    if (hasMore && !loading && token) {
      console.log('Loading more products...');
      loadPage(currentPage + 1);
    } else if (!token) {
      console.log('Cannot load more: no token');
    }
  }, [currentPage, hasMore, loading, loadPage, token]);

  // Actualiser la liste - ne fonctionne qu'avec un token valide
  const refresh = useCallback(() => {
    if (!token) {
      setError('Token d\'authentification manquant');
      return;
    }
    
    console.log('Refreshing products...');
    setProducts([]);
    setCurrentPage(1);
    setHasMore(true);
    setError(null);
    loadPage(1, true);
  }, [loadPage, token]);

  // CORRECTION 3: Charger la première page seulement quand le token est disponible
  useEffect(() => {
    if (enabled && token && products.length === 0 && !loading) {
      console.log('Initial load triggered with token');
      loadPage(1, true);
    } else if (!token) {
      console.log('Waiting for token...');
      setError('Chargement du token d\'authentification...');
    }
  }, [token, enabled]); // Déclencher quand le token arrive

  // Fonction pour tester le token et diagnostiquer les problèmes
  const testTokenAndApi = async () => {
    if (!token) {
      Alert.alert('Erreur', 'Aucun token d\'authentification trouvé');
      return;
    }

    try {
      // Test simple de l'API avec le token
      const response = await fetch('https://backend.barakasn.com/api/v0/products/products/?page=1&page_size=5', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Test API - Status:', response.status);
      console.log('Test API - Headers:', response.headers);

      if (response.status === 401) {
        Alert.alert('Token expiré', 'Votre session a expiré. Veuillez vous reconnecter.');
        // Supprimer le token expiré
        await AsyncStorage.removeItem('access_token');
        setToken(null);
        navigation.navigate('LoginScreen'); // Ajustez selon votre navigation
      } else if (response.ok) {
        const data = await response.json();
        console.log('Test API - Success:', data);
        Alert.alert('Succès', `Token valide. ${data.results?.length || 0} produits trouvés.`);
      } else {
        const errorData = await response.text();
        console.log('Test API - Error:', errorData);
        Alert.alert('Erreur API', `Erreur ${response.status}: ${errorData}`);
      }
    } catch (error) {
      console.error('Test API - Network Error:', error);
      Alert.alert('Erreur réseau', 'Impossible de contacter le serveur');
    }
  };

  // Charger le token avec vérification de validité
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('access_token');
        console.log('Token loaded:', storedToken ? 'Yes' : 'No');
        
        if (storedToken) {
          setToken(storedToken);
          setError(null); // Clear error when token is available
        } else {
          setError('Token d\'authentification manquant. Veuillez vous connecter.');
          console.log('No token found, user needs to login');
          // Optionnel: rediriger vers l'écran de connexion après un délai
          // setTimeout(() => navigation.navigate('LoginScreen'), 2000);
        }
      } catch (error) {
        console.error('Erreur chargement token:', error);
        setError('Erreur lors du chargement de l\'authentification');
      }
    };
    loadToken();
  }, []);

  const loadLocalCart = async () => {
    try {
      const localCart = await AsyncStorage.getItem('local_cart');
      if (localCart) {
        const cartItems = JSON.parse(localCart);
        setLocalCartItems(cartItems);
      }
    } catch (error) {
      console.warn('Erreur lors du chargement du panier local:', error);
    }
  };

  useEffect(() => {
    loadLocalCart();
    
    if (addedProduct) {
      if (addedProduct.id.startsWith('local_')) {
        setLocalCartItems(prev => {
          const existingIndex = prev.findIndex(item => 
            item.items.some(orderItem => 
              orderItem.product.id === addedProduct.items[0].product.id
            )
          );
          
          if (existingIndex !== -1) {
            const updatedItems = [...prev];
            updatedItems[existingIndex].items[0].quantity += addedProduct.items[0].quantity;
            updatedItems[existingIndex].total_price = (
              parseFloat(updatedItems[existingIndex].items[0].unit_price) * 
              updatedItems[existingIndex].items[0].quantity
            ).toString();
            return updatedItems;
          } else {
            return [...prev, addedProduct];
          }
        });
      } else {
        setOrders(prev => [...prev, addedProduct]);
      }
    }
  }, [token, addedProduct]);

  useEffect(() => {
    const loadCartItems = async () => {
      try {
        const localCart = await AsyncStorage.getItem('local_cart');
        if (localCart) {
          const cartItems = JSON.parse(localCart);
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

  // Fonctions utilitaires
  const handleNavigation = (screenName: string) => {
    closeMenu();
    navigation.navigate(screenName);
  };

  const closeMenu = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
  };

  // CORRECTION 4: Filtrer les produits par catégorie à partir de la liste des produits chargés
  const filteredProducts = selectedCategory === 'Tous' 
    ? products 
    : products.filter((product) => 
        product.category?.name?.toLowerCase().includes(selectedCategory.toLowerCase())
      );

  // Catégories disponibles
  const categories: Category[] = ['Ordinateurs', 'Tablettes', 'Télévisions', 'Disques durs', 'Casques', 'Souris'];

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toLocaleString('fr-FR');
  };

  const calculateSalePrice = (originalPrice: string | number, discountPercentage?: number) => {
    const numPrice = typeof originalPrice === 'string' ? parseFloat(originalPrice) : originalPrice;
    if (!discountPercentage) return numPrice;
    return numPrice * (1 - discountPercentage / 100);
  };

  const getLowestPrice = (product: Product) => {
  if (!product.prices || product.prices.length === 0) return null;
  
  // Trouver le prix le plus bas
  const lowestPrice = product.prices.reduce((min, priceObj) => {
    const priceValue = parseFloat(priceObj.price);
    return priceValue < min ? priceValue : min;
  }, parseFloat(product.prices[0].price));
  
  // Trouver le prix le plus élevé pour calculer la réduction
  const highestPrice = product.prices.reduce((max, priceObj) => {
    const priceValue = parseFloat(priceObj.price);
    return priceValue > max ? priceValue : max;
  }, parseFloat(product.prices[0].price));
  
  // Calculer le pourcentage de réduction (0 si pas de réduction)
  const discountPercentage = highestPrice > lowestPrice 
    ? Math.round(((highestPrice - lowestPrice) / highestPrice) * 100)
    : 0;

  return {
    price: lowestPrice.toString(),
    discountPercentage // Toujours un nombre, même si 0
  };
};

const calculateOriginalPrice = (salePrice: string, discountPercentage: number): string => {
  const salePriceNum = parseFloat(salePrice);
  const originalPrice = salePriceNum / (1 - discountPercentage / 100);
  return originalPrice.toFixed(0);
};

  // CORRECTION 5: Améliorer le rendu des produits avec gestion d'erreurs
  const renderApiProduct = ({ item }: { item: Product }) => {
    // const stockStatus = item.stock === 0;
    //           const productImage = item.images?.[0]?.image;
    const productPrice = getPriceByCriterion(item);
    // const isSelected = selectedProducts.includes(item.id.toString());
    
    // Description encore plus courte pour les colonnes rapprochées
    const descriptionLength = 20;
    const limitedDescription = item.description 
      ? item.description.length > descriptionLength 
        ? `${item.description.substring(0, descriptionLength - 3)}...` 
        : item.description
      : '';
    const stockStatus = item.stock === 0;
    const productImage = item.images?.[0]?.image;
    const priceInfo = getLowestPrice(item); // Utiliser getLowestPrice au lieu de getPriceByCriterion
    const hasDiscount = priceInfo?.discountPercentage && priceInfo.discountPercentage > 0;
  
          
    return (
    <TouchableOpacity
      style={[
        styles.MODALProductCard,
        {
          width: responsive.productCardWidth,
          marginHorizontal: 1,
          marginBottom: 4,
          height: 180,
        },
      ]}
      onPress={() => {
        navigation.navigate('ProductDetailScreen', { productId: item.id });
      }}
    >
      {/* Badge de réduction si applicable */}
      {hasDiscount && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            -{priceInfo.discountPercentage}%
          </Text>
        </View>
      )}

      {/* Conteneur image avec badges */}
      <View style={[
        styles.MODALProductImageContainer,
        { height: 90 }
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
      </View> 

      {/* Conteneur informations produit */}
      <View style={styles.MODALProductInfo}>
        <Text 
          style={styles.MODALProductName} 
          numberOfLines={2}
        >
          {item.name}
        </Text>
        
        {/* Prix avec réduction */}
        {showPrices && priceInfo ? (
          <View style={styles.priceContainer}>
            <Text style={styles.MODALProductPrice}>
              {formatPrice(priceInfo.price)} FCFA
            </Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>
                {formatPrice(calculateOriginalPrice(priceInfo.price, priceInfo.discountPercentage))} FCFA
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.MODALProductPrice}>Prix N/A</Text>
        )}
        
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
      </View>
    </TouchableOpacity>
  );
};

  // Rendu du footer (indicateur de chargement)
  const renderFooter = () => {
    if (!loading || products.length === 0) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={[styles.footerText, { color: theme.text }]}>Chargement...</Text>
      </View>
    );
  };

  // CORRECTION 6: Améliorer le rendu quand la liste est vide avec gestion du token
  const renderEmpty = () => {
    if (loading && products.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={[styles.loadingText, { color: theme.text }]}>Chargement des produits...</Text>
        </View>
      );
    }

    // Si pas de token
    if (!token) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="key-outline" size={80} color="#ccc" />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            Authentification requise
          </Text>
          <Text style={styles.emptySubtitle}>
            Veuillez vous connecter pour voir les produits
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => navigation.navigate('LoginScreen')} // Ajustez selon votre navigation
          >
            <Text style={styles.retryButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="basket-outline" size={80} color="#ccc" />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          {error ? 'Erreur de chargement' : 'Aucun produit'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {error || (selectedCategory === 'Tous' 
            ? 'Aucun produit disponible pour le moment' 
            : `Aucun produit trouvé dans la catégorie ${selectedCategory}`)}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>
            {error ? 'Réessayer' : 'Actualiser'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Gestion de la fin de liste atteinte
  const handleEndReached = () => {
    console.log('End reached. HasMore:', hasMore, 'Loading:', loading);
    if (hasMore && !loading && !error) {
      loadMore();
    }
  };

  // CORRECTION 7: Afficher des informations de débogage si aucun produit
  console.log('Current state:', {
    productsCount: products.length,
    filteredCount: filteredProducts.length,
    loading,
    error,
    hasMore,
    currentPage,
    selectedCategory
  });

  return (
    <View style={[styles.fullContainer, { backgroundColor: theme.background }]}>
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
      {/* Header */}
      <HeaderComponent 
        navigation={navigation}
        title="Produits en solde"
      />

      {/* CORRECTION 8: Afficher l'erreur avec bouton de diagnostic */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <View style={{ flexDirection: 'row', marginTop: 8, justifyContent: 'center' }}>
            <TouchableOpacity onPress={refresh} style={{ marginRight: 10 }}>
              <Text style={[styles.errorText, { textDecorationLine: 'underline' }]}>
                Réessayer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={testTokenAndApi}>
              <Text style={[styles.errorText, { textDecorationLine: 'underline' }]}>
                Diagnostiquer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bannière de soldes */}
      <View style={styles.salesBanner}>
        <View style={styles.bannerContent}>
          <Ionicons name="flash" size={30} color="white" />
          <Text style={styles.bannerTitle}>PROMOTIONS</Text>
          <Text style={styles.bannerSubtitle}>Découvrez nos meilleurs prix</Text>
        </View>
        <View style={styles.bannerDecoration}>
          <Ionicons name="gift-outline" size={40} color="rgba(255,255,255,0.3)" />
        </View>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <Text style={[styles.statsText, { color: theme.text }]}>
          {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} trouvé{filteredProducts.length !== 1 ? 's' : ''}
          {totalCount > 0 && ` sur ${totalCount} au total`}
        </Text>
      </View>

      {/* Filtres par catégorie */}
      <View style={styles.filterContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Filtrer par catégorie</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategory === 'Tous' && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory('Tous')}
          >
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === 'Tous' && styles.categoryButtonTextActive
            ]}>
              Tous
            </Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === category && styles.categoryButtonTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des produits */}
      <FlatList
        data={filteredProducts}
        renderItem={renderApiProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={responsive.productColumns}
        columnWrapperStyle={responsive.productColumns > 1 ? styles.row : undefined}
        contentContainerStyle={[
          styles.productsList,
          filteredProducts.length === 0 ? styles.emptyList : undefined
        ]}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.1}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              refresh();
              setRefreshing(false);
            }}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />
    </View>
  );
};

// Styles inchangés (garder tous les styles existants)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 8, // Réduit encore plus l'espacement général
    // paddingTop: 10,
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

  fullContainer: {
    flex: 1,
  },

  
  discountBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,
  },

  discountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },

  priceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  originalPrice: {
    fontSize: 9,
    color: '#999',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },

  // Bannière de soldes
  salesBanner: {
    marginTop: 20,
    marginHorizontal: 10,
    backgroundColor: '#FF6B35',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  bannerContent: {
    flex: 1,
    alignItems: 'center',
  },

  bannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 5,
  },

  bannerSubtitle: {
    fontSize: 14,
    color: 'white',
    marginTop: 5,
    textAlign: 'center',
  },

  bannerDecoration: {
    position: 'absolute',
    right: 20,
    top: 20,
  },

  // Statistiques
  statsContainer: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },

  statsText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Filtres
  filterContainer: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginLeft: 10,
  },

  categoryFilter: {
    paddingHorizontal: 10,
  },

  categoryButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  categoryButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },

  categoryButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },

  categoryButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },

  // Produits
  productsList: {
    paddingHorizontal: 10,
    paddingBottom: 100,
  },

  row: {
    justifyContent: 'space-between',
  },

  // États de chargement et erreur
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  footerText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
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

  emptyList: {
    flexGrow: 1,
  },

  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },

  errorBanner: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    marginHorizontal: 10,
    marginBottom: 10,
  },

  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    textAlign: 'center',
  },

  // États de chargement
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },

  // Styles pour les cartes produits - optimisés pour 2 colonnes
  modalProductCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    height: 290,
  },

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

  // Tous les autres styles existants...
  productCard: {
    flex: 1,
    margin: 5,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },

  // discountBadge: {
  //   position: 'absolute',
  //   top: 10,
  //   right: 10,
  //   backgroundColor: '#FF6B35',
  //   borderRadius: 8,
  //   paddingHorizontal: 8,
  //   paddingVertical: 4,
  //   zIndex: 1,
  // },

  // discountText: {
  //   color: 'white',
  //   fontSize: 12,
  //   fontWeight: 'bold',
  // },

  flashSaleBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FF0000',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },

  flashSaleText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },

  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
    resizeMode: 'cover',
  },

  productInfo: {
    flex: 1,
  },

  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },

  productDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },

  categoryText: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '500',
    marginBottom: 5,
  },

  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },

  // priceContainer: {
  //   marginBottom: 8,
  // },

  // originalPrice: {
  //   fontSize: 14,
  //   color: '#999',
  //   textDecorationLine: 'line-through',
  // },

  salePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },

  stockContainer: {
    marginBottom: 10,
  },

  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },

  addToCartButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },

  addToCartText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },

  // Menu et autres styles existants
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
    height: '100%',
    width: Math.min(550, Dimensions.get('window').width * 0.85),
    zIndex: 1000,
  },

  menuHeader: {
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },

  menuHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },

  menuHeaderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 3,
  },

  menuScrollContainer: {
    paddingBottom: 30,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
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
  
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  icon1Container: {
    position: 'relative',
  },

  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  timerText: {
    fontSize: 12,
    color: '#FF6B35',
    marginLeft: 5,
    fontWeight: '500',
  },

  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
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

  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },

  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },

  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },

  productCardShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // Styles pour l'affichage des statistiques
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    marginHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
  },

  statItem: {
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },

  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  // Styles pour les boutons d'action
  actionButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },

  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },

  secondaryButtonText: {
    color: '#FF6B35',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Styles pour la recherche
  searchContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  searchButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
});

export default SalesScreen;