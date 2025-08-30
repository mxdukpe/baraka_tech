/**
 * Ce fichier définit l'écran de partage en lot de produits amélioré avec intégration d'images.
 * Il permet de sélectionner plusieurs produits, modifier leurs prix et les partager avec images.
 *
 * @module BulkUploadScreen
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    FlatList, 
    StyleSheet, RefreshControl,
    SafeAreaView,
    ScrollView,
    Share,
    Alert,
    Modal,
    TextInput,
    Image,
    ActivityIndicator,
    Dimensions,
    Linking,
    
  Platform, AppState, TouchableWithoutFeedback, Switch 
} from 'react-native';
import { Icon, Badge } from 'react-native-elements';

import { Ionicons } from '@expo/vector-icons';
// import { getProducts50Simple } from '../../services/apiService';
import { Product } from '../../services/types';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { getProducts, getProducts50Simple, getProductsPaginated } from '../../services/apiService';
import AuthService from './authService';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';
// import { captureRef } from 'react-native-view-shot';

type SearchScreenProps = {
    navigation: any;
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

const { width } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_WIDTH = (width / 2) - (CARD_MARGIN * 3);


// const responsive = getResponsiveDimensions();
const BulkUploadScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [token, setToken] = useState<string | null>(null);
    const [customPrices, setCustomPrices] = useState<Record<string, string>>({});
    
      const [menuVisible, setMenuVisible] = useState(false);

    // États pour la modal de partage
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [shareWithPrice, setShareWithPrice] = useState(true);
    const [shareWithDescription, setShareWithDescription] = useState(true);
    const [shareWithImage, setShareWithImage] = useState(true);
    const [useCustomPrice, setUseCustomPrice] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [shareMethod, setShareMethod] = useState<'whatsapp' | 'general'>('general');
    const [isProcessingImages, setIsProcessingImages] = useState(false);
    
    // États pour la sélection
    const [selectAll, setSelectAll] = useState(false);

    // Référence pour la capture de vue
    const shareViewRef = useRef<View>(null);
            const [products, setProducts] = useState<Product[]>([]);
      // Charger la première page au montage si token disponible
      // useEffect(() => {
      //   if (enabled && token) {
      //     loadPage(1, true);
      //   } else if (!token) {
      //     setError('Token d\'authentification manquant');
      //   }
      // }, [token, enabled]); // Retirer loadPage des dépendances pour éviter les boucles



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
                const subscription = Dimensions.addEventListener("change", ({ window }) => {
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
            
            
    
      

    
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
    const theme = isDarkMode ? darkTheme : lightTheme;
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; productCount: number; image?: string }>>([]);

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

  const getProductImageSource = (productImage) => {
      if (productImage) {
          return { uri: `https://backend.barakasn.com${productImage}` };
      }
      // Retourner l'image par défaut
      return require('../../assets/images/baraka_icon.png');
  };

    // Filtrage des produits par recherche
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredProducts(allProducts);
        } else {
            const filtered = allProducts.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            setFilteredProducts(filtered);
        }
    }, [searchQuery, allProducts]);

      
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

  const formatPrice = (price: string) => {
      return parseInt(price).toLocaleString('fr-FR');
  };

  const toggleProductSelection = (productId: string) => {
      setSelectedProducts((prevSelected) => {
          const newSelected = prevSelected.includes(productId)
              ? prevSelected.filter((id) => id !== productId)
              : [...prevSelected, productId];
          
          // Mettre à jour l'état selectAll
          setSelectAll(newSelected.length === filteredProducts.length);
          
          return newSelected;
      });
  };

  const toggleSelectAll = () => {
      if (selectAll) {
          setSelectedProducts([]);
      } else {
          setSelectedProducts(filteredProducts.map(product => product.id.toString()));
      }
      setSelectAll(!selectAll);
  };

  const updateCustomPrice = (productId: string, newPrice: string) => {
      setCustomPrices(prev => ({
          ...prev,
          [productId]: newPrice
      }));
  };

  const getSelectedProductsData = () => {
      return selectedProducts.map(id => {
          const product = allProducts.find(p => p.id.toString() === id);
          if (!product) return null;
          
          const originalPrice = product.prices && product.prices.length > 0 
              ? product.prices[0].price 
              : '0';
          const customPrice = customPrices[id] || originalPrice;
          
          return {
              ...product,
              originalPrice,
              customPrice
          };
      }).filter(Boolean);
  };

  // Fonction pour télécharger une image depuis une URL
  const downloadImage = async (imageUrl: string, filename: string) => {
      try {
          const fileUri = FileSystem.documentDirectory + filename;
          const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
          
          if (downloadResult.status === 200) {
              return downloadResult.uri;
          }
          return null;
      } catch (error) {
          console.error('Erreur lors du téléchargement de l\'image:', error);
          return null;
      }
  };

  // Fonction pour préparer les images pour le partage
  const prepareImagesForSharing = async (selectedProductsData: any[]) => {
      const imageUris: string[] = [];
      
      for (const product of selectedProductsData) {
          if (product?.images?.[0]?.image) {
              const imageUrl = `https://backend.barakasn.com${product.images[0].image}`;
              const filename = `product_${product.id}_${Date.now()}.jpg`;
              
              const localUri = await downloadImage(imageUrl, filename);
              if (localUri) {
                  imageUris.push(localUri);
              }
          }
      }
      
      return imageUris;
  };

  // Fonction pour créer une image composite avec les informations des produits
  const createProductCard = (product: any) => {
      const priceToUse = useCustomPrice ? product.customPrice : product.originalPrice;
      
      return (
          <View style={styles.shareProductCard} key={product.id}>
              <View style={styles.shareProductHeader}>
                  <Text style={styles.shareProductName}>{product.name}</Text>
                  {shareWithPrice && (
                      <Text style={styles.shareProductPrice}>
                          {formatPrice(priceToUse)} FCFA
                      </Text>
                  )}
              </View>
              
              {shareWithImage && product.images?.[0]?.image && (
                  <Image
                      source={{ uri: `https://backend.barakasn.com${product.images[0].image}` }}
                      style={styles.shareProductImage}
                      resizeMode="contain"
                  />
              )}
              
              {shareWithDescription && product.description && (
                  <Text style={styles.shareProductDescription}>
                      {product.description}
                  </Text>
              )}
              
              <View style={styles.shareProductFooter}>
                  <Text style={styles.shareProductContact}>
                      📱 Contactez-nous pour commander
                  </Text>
              </View>
          </View>
      );
  };

  // Fonction pour créer une vue composite de tous les produits sélectionnés
  const createCompositeShareView = (selectedProductsData: any[]) => {
      return (
          <View style={styles.compositeShareView}>
              <View style={styles.shareHeader}>
                  {/* <Text style={styles.shareHeaderTitle}>Nos Produits</Text> */}
                  <Text style={styles.shareHeaderSubtitle}>
                      {selectedProductsData.length} produit(s) sélectionné(s)
                  </Text>
              </View>
              
              <ScrollView style={styles.shareProductsList}>
                  {selectedProductsData.map((product, index) => {
                      if (!product) return null;
                      return createProductCard(product);
                  })}
              </ScrollView>
              
              <View style={styles.shareFooter}>
                  <Text style={styles.shareFooterText}>
                      🛒 Commandez maintenant !
                  </Text>
              </View>
          </View>
      );
  };

  const generateShareMessage = () => {
      const selectedProductsData = getSelectedProductsData();
      
      if (selectedProductsData.length === 0) return '';

      let message = `🛍️ Découvrez nos produits :\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      selectedProductsData.forEach((product, index) => {
          if (!product) return;
          message += `${index + 1}. *${product.name}*\n`;
          
          if (shareWithPrice) {
              const priceToUse = useCustomPrice ? product.customPrice : product.originalPrice;
              message += `   💰 Prix: ${formatPrice(priceToUse)} FCFA\n`;
          }
          
          if (shareWithDescription && product.description) {
              message += `   📝 ${product.description.substring(0, 100)}${product.description.length > 100 ? '...' : ''}\n`;
          }
          
          message += `\n`;
      });
      
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📱 *Contactez-nous pour plus d'informations !*\n`;
      message += `🛒 *Commandez maintenant !*`;
      
      return message;
  };

  // Fonction pour encoder l'image par défaut en base64
const getDefaultImageBase64 = () => {
    // Cette fonction devrait être ajoutée pour encoder l'image par défaut
    // Vous pouvez utiliser une bibliothèque comme react-native-fs ou expo-file-system
    // Pour l'instant, je vais utiliser un placeholder
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
};

    const generatePDF = async () => {
    if (selectedProducts.length === 0) {
        Alert.alert('Attention', 'Veuillez sélectionner au moins un produit.');
        return;
    }

    setIsSharing(true);

    try {
        const selectedProductsData = getSelectedProductsData();
        
        // Créer le HTML pour le PDF avec un design de tableau amélioré
        let html = `
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Arial', sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: #f8f9fa;
                        color: #333;
                        line-height: 1.6;
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding: 20px;
                        background: linear-gradient(135deg, #F58320, #ff9940);
                        color: white;
                        border-radius: 10px;
                        box-shadow: 0 4px 15px rgba(245, 131, 32, 0.3);
                    }
                    
                    .header h1 {
                        margin: 0;
                        font-size: 28px;
                        font-weight: bold;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                    }
                    
                    .header p {
                        margin: 10px 0 0 0;
                        font-size: 16px;
                        opacity: 0.9;
                    }
                    
                    .products-table {
                        width: 100%;
                        border-collapse: collapse;
                        background: white;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                        margin-bottom: 30px;
                    }
                    
                    .products-table thead {
                        background: linear-gradient(135deg, #F58320, #ff9940);
                        color: white;
                    }
                    
                    .products-table th {
                        padding: 15px;
                        text-align: left;
                        font-weight: bold;
                        font-size: 14px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        border-bottom: 2px solid rgba(255,255,255,0.2);
                    }
                    
                    .products-table tbody tr {
                        border-bottom: 1px solid #e9ecef;
                        transition: background-color 0.3s ease;
                    }
                    
                    .products-table tbody tr:nth-child(even) {
                        background-color: #f8f9fa;
                    }
                    
                    .products-table tbody tr:hover {
                        background-color: #fff5e6;
                    }
                    
                    .products-table td {
                        padding: 15px;
                        vertical-align: top;
                        border-bottom: 1px solid #dee2e6;
                    }
                    
                    .product-image-cell {
                        text-align: center;
                        width: 120px;
                    }
                    
                    .product-image {
                        width: 100px;
                        height: 100px;
                        object-fit: cover;
                        border-radius: 8px;
                        border: 2px solid #e9ecef;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                    }
                    
                    .product-image:hover {
                        transform: scale(1.05);
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    }
                    
                    .product-name {
                        font-weight: bold;
                        font-size: 16px;
                        color: #2c3e50;
                        margin-bottom: 5px;
                        line-height: 1.4;
                    }
                    
                    .product-description {
                        font-size: 13px;
                        color: #6c757d;
                        line-height: 1.5;
                        max-height: 80px;
                        overflow: hidden;
                    }
                    
                    .product-price {
                        font-weight: bold;
                        font-size: 18px;
                        color: #F58320;
                        text-align: right;
                        white-space: nowrap;
                    }
                    
                    .product-number {
                        background: linear-gradient(135deg, #F58320, #ff9940);
                        color: white;
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 14px;
                        text-align: center;
                        box-shadow: 0 2px 8px rgba(245, 131, 32, 0.3);
                    }
                    
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        padding: 20px;
                        background: white;
                        border-radius: 10px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                        border-left: 4px solid #F58320;
                    }
                    
                    .footer p {
                        margin: 5px 0;
                        color: #6c757d;
                    }
                    
                    .footer .contact-info {
                        font-weight: bold;
                        color: #F58320;
                        font-size: 16px;
                    }
                    
                    .stats-summary {
                        display: flex;
                        justify-content: space-around;
                        margin: 20px 0;
                        background: white;
                        padding: 20px;
                        border-radius: 10px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    }
                    
                    .stat-item {
                        text-align: center;
                        flex: 1;
                    }
                    
                    .stat-number {
                        font-size: 24px;
                        font-weight: bold;
                        color: #F58320;
                        display: block;
                    }
                    
                    .stat-label {
                        font-size: 12px;
                        color: #6c757d;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    @media print {
                        body { 
                            background-color: white; 
                        }
                        .products-table { 
                            page-break-inside: avoid; 
                        }
                        .products-table tbody tr { 
                            page-break-inside: avoid; 
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🛍️ Catalogue de Produits</h1>
                    <p>${selectedProductsData.length} produit${selectedProductsData.length > 1 ? 's' : ''} sélectionné${selectedProductsData.length > 1 ? 's' : ''}</p>
                </div>
                
                <div class="stats-summary">
                    <div class="stat-item">
                        <span class="stat-number">${selectedProductsData.length}</span>
                        <span class="stat-label">Produits</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${new Date().toLocaleDateString('fr-FR')}</span>
                        <span class="stat-label">Date</span>
                    </div>
                </div>
                
                <table class="products-table">
                    <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <th style="width: 120px;">Image</th>
                            <th>Produit</th>
                            <th style="width: 120px;">Prix</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Ajouter chaque produit dans le tableau
        selectedProductsData.forEach((product, index) => {
            if (!product) return;
            
            const priceToUse = useCustomPrice ? product.customPrice : product.originalPrice;
            
            // Déterminer l'image à utiliser
            let imageSource = '';
            if (product?.images?.[0]?.image) {
                imageSource = `https://backend.barakasn.com${product.images[0].image}`;
            } else {
                // Utiliser l'image par défaut encodée en base64
                imageSource = getDefaultImageBase64();
            }
            
            html += `
                <tr>
                    <td style="text-align: center;">
                        <div class="product-number">${index + 1}</div>
                    </td>
                    <td class="product-image-cell">
                        <img class="product-image" src="${imageSource}" alt="${product.name}" onerror="this.src='${getDefaultImageBase64()}'"/>
                    </td>
                    <td>
                        <div class="product-name">${product.name}</div>
                        ${product.description ? `<div class="product-description">${product.description}</div>` : ''}
                    </td>
                    <td class="product-price">
                        ${formatPrice(priceToUse)} FCFA
                    </td>
                </tr>
            `;
        });

        // Calculer le total si nécessaire
        const totalPrice = selectedProductsData.reduce((sum, product) => {
            if (!product) return sum;
            const priceToUse = useCustomPrice ? product.customPrice : product.originalPrice;
            return sum + parseInt(priceToUse || '0');
        }, 0);

        // Fermer le tableau et ajouter le footer
        html += `
                    </tbody>
                </table>
                
                ${totalPrice > 0 ? `
                <div class="stats-summary">
                    <div class="stat-item">
                        <span class="stat-number">${formatPrice(totalPrice.toString())} FCFA</span>
                        <span class="stat-label">Total Estimé</span>
                    </div>
                </div>
                ` : ''}
                
                <div class="footer">
                    <p class="contact-info">📱 Contactez-nous pour plus d'informations</p>
                    <p>🛒 Commandez maintenant et bénéficiez de nos meilleurs prix !</p>
                    <p>📧 Email: contact@barakasn.com | 📞 Téléphone: +229 XX XX XX XX</p>
                    <p style="margin-top: 15px; font-size: 12px; color: #adb5bd;">
                        Catalogue généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
                    </p>
                </div>
            </body>
        </html>
        `;

        // Générer le PDF avec des options améliorées
        const { uri } = await Print.printToFileAsync({ 
            html,
            base64: false,
            margins: {
                left: 20,
                top: 20,
                right: 20,
                bottom: 20,
            },
        });
        
        // Partager le PDF
        await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Partager le catalogue de produits',
            UTI: 'com.adobe.pdf'
        });

        Alert.alert('Succès', 'Le catalogue PDF a été généré avec succès !');

    } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
        Alert.alert('Erreur', 'Impossible de générer le PDF. Veuillez réessayer.');
    } finally {
        setIsSharing(false);
    }
};

// Fonction utilitaire pour encoder l'image par défaut (à ajouter au début du fichier)
const encodeDefaultImage = async () => {
    try {
        // Utiliser expo-file-system pour lire et encoder l'image
        const imageUri = '../../assets/images/baraka_icon.png';
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        return `data:image/png;base64,${base64}`;
    } catch (error) {
        console.error('Erreur lors de l\'encodage de l\'image par défaut:', error);
        // Retourner un pixel transparent comme fallback
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    }
};

  // Fonction pour partager avec images et données combinées
  const shareWithCombinedData = async () => {
      const selectedProductsData = getSelectedProductsData();
      const message = generateShareMessage();
      
      try {
          if (shareWithImage) {
              setIsProcessingImages(true);
              
              // Méthode 1: Partager les images individuellement avec leurs informations
              if (shareMethod === 'whatsapp') {
                  // Pour WhatsApp, envoyer chaque produit individuellement
                  for (const product of selectedProductsData) {
                      if (!product) continue;
                      
                      const priceToUse = useCustomPrice ? product.customPrice : product.originalPrice;
                      let productMessage = `🛍️ *${product.name}*\n`;
                      
                      if (shareWithPrice) {
                          productMessage += `💰 Prix: ${formatPrice(priceToUse)} FCFA\n`;
                      }
                      
                      if (shareWithDescription && product.description) {
                          productMessage += `📝 ${product.description}\n`;
                      }
                      
                      productMessage += `\n📱 Contactez-nous pour commander !`;
                      
                      if (product.images?.[0]?.image) {
                          const imageUrl = `https://backend.barakasn.com${product.images[0].image}`;
                          const filename = `product_${product.id}_${Date.now()}.jpg`;
                          const localUri = await downloadImage(imageUrl, filename);
                          
                          if (localUri) {
                              await shareViaWhatsApp(productMessage, localUri);
                              // Attendre un peu entre chaque partage
                              await new Promise(resolve => setTimeout(resolve, 1000));
                          }
                      } else {
                          await shareViaWhatsApp(productMessage);
                      }
                  }
              } else {
                  // Pour le partage général, créer une image composite
                  const imageUris = await prepareImagesForSharing(selectedProductsData);
                  
                  if (imageUris.length > 0) {
                      // Partager la première image avec le message complet
                      await Share.share({
                          message: message,
                          url: imageUris[0],
                          title: `Partage de ${selectedProducts.length} produit(s)`
                      });
                      
                      // Partager les autres images si disponibles
                      if (imageUris.length > 1) {
                          for (let i = 1; i < imageUris.length; i++) {
                              await Share.share({
                                  url: imageUris[i],
                                  title: `Produit ${i + 1}`
                              });
                          }
                      }
                  } else {
                      // Pas d'image disponible, partager seulement le texte
                      await Share.share({
                          message: message,
                          title: `Partage de ${selectedProducts.length} produit(s)`
                      });
                  }
              }
              
              setIsProcessingImages(false);
          } else {
              // Partager seulement le texte
              await Share.share({
                  message: message,
                  title: `Partage de ${selectedProducts.length} produit(s)`
              });
          }
          
      } catch (error) {
          console.error('Erreur lors du partage:', error);
          throw error;
      }
  };

  const handleShare = async () => {
      if (selectedProducts.length === 0) {
          Alert.alert('Attention', 'Veuillez sélectionner au moins un produit à partager.');
          return;
      }

      setIsSharing(true);
      
      try {
          await shareWithCombinedData();
          setShareModalVisible(false);
          
      } catch (error) {
          console.error('Erreur lors du partage:', error);
          Alert.alert('Erreur', 'Impossible de partager les produits.');
      } finally {
          setIsSharing(false);
          setIsProcessingImages(false);
      }
  };

  const shareViaWhatsApp = async (message: string, imageUri?: string) => {
      try {
          if (imageUri && await Sharing.isAvailableAsync()) {
              // Partager avec image via Expo Sharing
              await Sharing.shareAsync(imageUri, {
                  mimeType: 'image/jpeg',
                  dialogTitle: 'Partager via WhatsApp',
                  UTI: 'public.jpeg'
              });
              
              // Ensuite partager le message texte
              const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
              await Linking.openURL(whatsappUrl);
          } else {
              // Partager seulement le texte via WhatsApp
              const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
              await Linking.openURL(whatsappUrl);
          }
      } catch (error) {
          console.error('Erreur WhatsApp:', error);
          // Fallback vers le partage général
          await Share.share({ message });
      }
  };

  const openShareModal = () => {
      if (selectedProducts.length === 0) {
          Alert.alert('Attention', 'Veuillez sélectionner au moins un produit à partager.');
          return;
      }
      setShareModalVisible(true);
  };

    
  const renderSelectedProductImage = (product) => {
      const imageSource = getProductImageSource(product.images?.[0]?.image);
      
      return (
          <Image
              source={imageSource}
              style={styles.selectedProductImage}
              resizeMode="contain"
              onError={(error) => {
                  console.log('Erreur de chargement d\'image dans la modal:', error);
              }}
          />
      );
  };

  const renderShareModal = () => {
      const selectedProductsData = getSelectedProductsData();
      
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
                              Partager les produits
                          </Text>
                          <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                              <Ionicons name="close" size={24} color={theme.text} />
                          </TouchableOpacity>
                      </View>

                      <ScrollView style={styles.modalBody}>

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

                          {/* Liste des produits sélectionnés */}
                          <View style={styles.selectedProductsList}>
                              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                                  Produits sélectionnés ({selectedProductsData.length})
                              </Text>
                              
                              {selectedProductsData.map((product) => 
                                  product && (
                                      <View key={product.id} style={[styles.selectedProductItem, { backgroundColor: theme.background, borderColor: theme.text + '20' }]}>
                                          <View style={styles.selectedProductHeader}>
                                              {shareWithImage && (
                                                renderSelectedProductImage(product))}
                                              <View style={styles.selectedProductInfo}>
                                                  <Text style={[styles.selectedProductName, { color: theme.text }]} numberOfLines={2}>
                                                      {product.name}
                                                  </Text>
                                                  <Text style={[styles.originalPrice, { color: '#666' }]}>
                                                      Prix original: {formatPrice(product.originalPrice)} FCFA
                                                  </Text>
                                              </View>
                                          </View>
                                          
                                          {shareWithPrice && useCustomPrice && (
                                              <View style={styles.priceInput}>
                                                  <TextInput
                                                      style={[styles.customPriceInput, { color: theme.text, borderColor: theme.text + '40' }]}
                                                      value={customPrices[product.id] || ''}
                                                      onChangeText={(text) => updateCustomPrice(product.id.toString(), text)}
                                                      placeholder="Prix personnalisé"
                                                      keyboardType="numeric"
                                                      placeholderTextColor={theme.text + '60'}
                                                  />
                                                  <Text style={[styles.currencyLabel, { color: theme.text }]}>FCFA</Text>
                                              </View>
                                          )}
                                      </View>
                                  )
                              )}
                          </View>

                          {/* Aperçu du message */}
                          <View style={styles.previewSection}>
                              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                                  Aperçu du message
                              </Text>
                              <ScrollView style={[styles.previewBox, { backgroundColor: theme.background, borderColor: theme.text + '20' }]}>
                                  <Text style={[styles.previewText, { color: theme.text }]}>
                                      {generateShareMessage()}
                                  </Text>
                              </ScrollView>
                          </View>

                          {/* Indicateur de traitement des images */}
                          {isProcessingImages && (
                              <View style={styles.processingIndicator}>
                                  <ActivityIndicator size="small" color="#F58320" />
                                  <Text style={[styles.processingText, { color: theme.text }]}>
                                      Préparation des images...
                                  </Text>
                              </View>
                          )}
                      </ScrollView>

                      <View style={styles.modalFooter}>
                          <TouchableOpacity 
                              style={[styles.cancelButton, { borderColor: theme.text + '40' }]}
                              onPress={() => setShareModalVisible(false)}
                          >
                              <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                                  Annuler
                              </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                              style={[styles.shareButton, (isSharing || isProcessingImages) && styles.disabledButton]}
                              onPress={generatePDF}
                              disabled={isSharing || isProcessingImages}
                          >
                              {isSharing || isProcessingImages ? (
                                  <ActivityIndicator size="small" color="white" />
                              ) : (
                                  <Ionicons name="share" size={20} color="white" />
                              )}
                              <Text style={styles.shareButtonText}>
                                  {isProcessingImages ? 'Préparation...' : isSharing ? 'Partage...' : 'Partager'}
                              </Text>
                          </TouchableOpacity>
                      </View>
                  </View>
              </View>
          </Modal>
      );
  };
    
    const getPriceByCriterion = (product: Product) => {
      return product.prices[0];
    };
// 1. Ajoutez ces modifications dans votre renderProduct function :

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
          width: CARD_WIDTH,
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
        <TouchableOpacity 
          onPress={() => toggleProductSelection(item.id.toString())}
          style={styles.selectionButton}
        >
          <Ionicons 
            name={isSelected ? "checkbox" : "square-outline"} 
            size={18} // Taille d'icône réduite
            color={isSelected ? "#4CAF50" : "#666"} 
          />
        </TouchableOpacity>
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
};// 2. Ajoutez ce composant pour afficher les produits sélectionnés :

const renderSelectedProductsBar = () => {
  if (selectedProducts.length === 0) return null;

  const selectedProductsData = getSelectedProductsData();
  
  return (
    <View style={[styles.selectedProductsBar, { backgroundColor: theme.background }]}>
      <View style={styles.selectedProductsHeader}>
        <Text style={[styles.selectedProductsTitle, { color: theme.text }]}>
          {selectedProducts.length} produit(s) sélectionné(s)
        </Text>
        <TouchableOpacity 
          onPress={() => {
            setSelectedProducts([]);
            setSelectAll(false);
          }}
          style={styles.clearSelectionButton}
        >
          <Ionicons name="close-circle" size={20} color="#ff4444" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.selectedProductsScroll}
        contentContainerStyle={styles.selectedProductsContent}
      >
        {selectedProductsData.map((product, index) => 
          product && (
            <View key={product.id} style={[styles.selectedProductChip, { backgroundColor: theme.background }]}>
              <Text 
                style={[styles.selectedProductChipText, { color: theme.text }]} 
                numberOfLines={1}
              >
                {product.name}
              </Text>
              <TouchableOpacity 
                onPress={() => toggleProductSelection(product.id.toString())}
                style={styles.removeProductButton}
              >
                <Ionicons name="close" size={14} color="#666" />
              </TouchableOpacity>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
};

  if (isLoading) {
      return (
          <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
              <ActivityIndicator size="large" color="#F58320" />
              <Text style={[styles.loadingText, { color: theme.text }]}>
                  Chargement des produits...
              </Text>
          </View>
      );
  }

  if (error) {
      return (
          <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
              <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
              <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => window.location.reload()}
              >
                  <Text style={styles.retryButtonText}>Réessayer</Text>
              </TouchableOpacity>
          </View>
      );
  }

// Fonction pour gérer la navigation avec fermeture du menu
  const handleNavigation = (screenName: string) => {
    closeMenu();
    navigation.navigate(screenName);
  };

  const closeMenu = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
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
  
    // Rendu quand la liste est vide
    const renderEmpty = () => {
      if (loading) return null;
  
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {error ? 'Erreur de chargement' : 'Aucun produit'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {error || 'Aucun produit disponible pour le moment'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>
              {error ? 'Réessayer' : 'Actualiser'}
            </Text>
          </TouchableOpacity>
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

          <View style={[
            styles.header,
            { 
              height: responsive.headerHeight,
              paddingHorizontal: responsive.horizontalPadding
            }
          ]}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#F58320" />
            </TouchableOpacity>
  
            <View style={styles.profileContainer}>
              <TextInput
                style={[
                  // styles.searchInput, 
                  { 
                    // backgroundColor: theme.background,
                    // color: theme.text,
                    // borderColor: theme.header.background
                  }
                ]}
                placeholder="Rechercher un produit..."
                placeholderTextColor={theme.text}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
  
            </View>
            <View style={styles.headerRight}>
              <Text style={[styles.selectedCount, { color: 'white' }]}>
                  {selectedProducts.length}
              </Text>
            </View>
          </View>

          {renderSelectedProductsBar()}


          {/* <View style={[
            styles.header,
            { 
              height: responsive.headerHeight,
              paddingHorizontal: responsive.horizontalPadding
            }
          ]}>
            
          <View style={styles.headerText}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={28} color="#F58320" />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                  Sélection multiple
              </Text>
              <View style={styles.headerRight}>
                  <Text style={[styles.selectedCount, { color: 'white' }]}>
                      {selectedProducts.length}
                  </Text>
              </View>
          </View>
            
          </View> */}


          {/* Barre de recherche */}
          {/* <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Rechercher des produits..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
              )}
          </View> */}

          {/* Boutons d'action */}
          <View style={styles.actionButtons}>
              <TouchableOpacity 
                  style={[styles.selectAllButton, { borderColor: theme.text + '40' }]}
                  onPress={toggleSelectAll}
              >
                  <Ionicons 
                      name={selectAll ? "checkbox" : "square-outline"} 
                      size={20} 
                      color="#F58320" 
                  />
                  <Text style={[styles.selectAllText, { color: theme.text }]}>
                      {selectAll ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                  style={[styles.clearButton, { borderColor: '#ff4444' }]}
                  onPress={() => {
                      setSelectedProducts([]);
                      setSelectAll(false);
                  }}
                  disabled={selectedProducts.length === 0}
              >
                  <Ionicons name="trash" size={20} color="#ff4444" />
                  <Text style={[styles.clearButtonText, { color: '#ff4444' }]}>
                      Effacer
                  </Text>
              </TouchableOpacity>
          </View>

          
          {/* // Dans ton render */}
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.1}
            refreshControl={
              <RefreshControl
                refreshing={loading && products.length === 0}
                onRefresh={handleRefresh}
                colors={['#007AFF']}
                tintColor="#007AFF"
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              products.length === 0 ? styles.emptyList : undefined,
              { paddingTop: selectedProducts.length > 0 ? 80 : 20 }
            ]}
            numColumns={2} // ✅ Fixé à 2 pour forcer l’affichage en grille
            columnWrapperStyle={{ justifyContent: "space-between" }} // ✅ Bien séparer les colonnes
            ListEmptyComponent={
              <Text style={[styles.errorText, { color: theme.text }]}>
                Aucun produit disponible
              </Text>
            }
          />


          <TouchableOpacity 
              style={[
                  styles.pdfActionButton,
                  selectedProducts.length === 0 && styles.disabledButton
              ]}
              onPress={openShareModal}
              disabled={selectedProducts.length === 0 || isSharing}
              >
              {isSharing ? (
                  <ActivityIndicator size="small" color="white" />
              ) : (
                  <Ionicons name="share-social" size={20} color="white" />
              )}
              <Text style={styles.pdfActionButtonText}>
                  Partager ({selectedProducts.length})
              </Text>
          </TouchableOpacity>

          {renderShareModal()}
      </SafeAreaView>
    );
};

const styles = StyleSheet.create({// Conteneur principal avec moins d'espacement
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

    pdfActionButton: {
      backgroundColor: '#4CAF50',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      borderRadius: 12,
      position: 'absolute',
      bottom: 0,
      left: 20,
      right: 20,
    },

    pdfActionButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },// Indicateur de traitement des images
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF5E6',
    borderRadius: 8,
    marginVertical: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F58320',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  processingText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    textAlign: 'center',
  },// En-tête du produit sélectionné
  selectedProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  
  selectedProductImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
    retryButton: {
        backgroundColor: '#F58320',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    headerText: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerRight: {
        backgroundColor: '#F58320',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedCount: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginBottom: 15,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 35,
    },
    selectAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        flex: 1,
        marginRight: 10,
        justifyContent: 'center',
    },
    selectAllText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        justifyContent: 'center',
    },
    clearButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
    },
    productList: {
        paddingBottom: 100,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
    productCard: {
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedProductCard: {
        borderColor: '#4CAF50',
        backgroundColor: '#E8F5E8',
    },
    productContent: {
        flex: 1,
    },
    productHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    productImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 15,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 5,
    },
    productPrice: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 5,
    },
    productDescription: {
        fontSize: 12,
        lineHeight: 16,
    },
    selectionIndicator: {
        marginLeft: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shareActionButton: {
        backgroundColor: '#F58320',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 12,
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    shareActionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    // Styles pour la modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxHeight: '80%',
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
    shareCard: {
        width: 300,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    shareImage: {
        width: 200,
        height: 200,
        marginBottom: 15,
    },
    shareTextContainer: {
        marginBottom: 15,
        alignItems: 'center',
    },
    shareTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    shareDescription: {
        fontSize: 14,
        marginBottom: 12,
        textAlign: 'center',
    },
    sharePrice: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    logo: {
        width: 30,
        height: 30,
        marginRight: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalBody: {
        maxHeight: '70%',
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
    selectedProductsList: {
        marginBottom: 20,
    },
    selectedProductItem: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
    },
    selectedProductInfo: {
        marginBottom: 8,
    },
    selectedProductName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    originalPrice: {
        fontSize: 12,
    },
    priceInput: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    customPriceInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
    },
    currencyLabel: {
        marginLeft: 8,
        fontSize: 14,
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
    shareButton: {
        flex: 1,
        backgroundColor: '#F58320',
        borderRadius: 8,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    shareButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },

    
  imageContainer: {
    width: CARD_WIDTH - 40, // Largeur de l'écran moins les paddings
    height: 300,
    // backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  
  imageScrollView: {
    width: '100%',
    height: '100%',
  },

  
  // Conteneur des indicateurs de pagination
  pagination: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Style des points de pagination
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: '#ccc',
  },
  
  // Conteneur du compteur d'images
  imageCounter: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  // Texte du compteur d'images
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
  },methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    minHeight: 48,
  },
  
  selectedMethod: {
    borderColor: '#F58320',
    backgroundColor: '#FFF8F4',
  },
  
  methodText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  shareView: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    
    shareHeader: {
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#F58320',
        paddingBottom: 15,
    },
    
    shareHeaderTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F58320',
        marginBottom: 5,
    },
    
    shareHeaderSubtitle: {
        fontSize: 16,
        color: '#666',
    },
    
    shareProductsList: {
        marginBottom: 20,
    },
    
    shareProductItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        padding: 12,
        backgroundColor: '#F8F8F8',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#F58320',
    },
    
    shareProductNumber: {
        backgroundColor: '#F58320',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    
    shareProductNumberText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    
    shareProductImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    
    shareProductInfo: {
        flex: 1,
    },
    
    shareProductName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    
    shareProductPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F58320',
        marginBottom: 4,
    },
    
    shareProductDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 18,
    },
    
    shareFooter: {
        alignItems: 'center',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    
    shareFooterText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 5,
        textAlign: 'center',
    },
    
    previewImageContainer: {
        backgroundColor: '#F0F0F0',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
    },
    
    hiddenCaptureView: {
        position: 'absolute',
        top: -9999,
        left: -9999,
        opacity: 0,
    },
    // Styles pour shareProductCard
  shareProductCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  
  shareProductCardImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  
  shareProductCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 24,
  },
  
  shareProductCardPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E7D32',
    marginBottom: 12,
  },
  
  shareProductCardDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },

  // Styles pour shareProductHeader
  shareProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  
  shareProductHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
  },
  
  shareProductHeaderButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  shareProductHeaderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  
  shareProductHeaderLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  // Styles pour shareProductFooter
  shareProductFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  
  shareProductFooterButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  
  shareProductFooterButtonSecondary: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  
  shareProductFooterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  shareProductFooterButtonTextSecondary: {
    color: '#2196F3',
  },
  
  shareProductFooterIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  
  shareProductFooterSocialButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  shareProductFooterSocialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  // Styles pour shareProductContact
  shareProductContact: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  
  shareProductContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  shareProductContactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#E8E8E8',
  },
  
  shareProductContactInfo: {
    flex: 1,
  },
  
  shareProductContactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  
  shareProductContactTitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  
  shareProductContactRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  shareProductContactRatingText: {
    fontSize: 12,
    color: '#888888',
    marginLeft: 4,
  },
  
  shareProductContactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  
  shareProductContactButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  shareProductContactButtonSecondary: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  
  shareProductContactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  shareProductContactButtonTextSecondary: {
    color: '#2196F3',
  },
  
  shareProductContactBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  
  shareProductContactBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Styles pour compositeShareView
  compositeShareView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  
  compositeShareViewContainer: {
    flex: 1,
    paddingTop: 20,
  },
  
  compositeShareViewContent: {
    flex: 1,
    paddingBottom: 20,
  },
  
  compositeShareViewScrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  
  compositeShareViewSection: {
    marginBottom: 20,
  },
  
  compositeShareViewSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  
  compositeShareViewDivider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 20,
    marginHorizontal: 16,
  },
  
  compositeShareViewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  compositeShareViewModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: width * 0.9,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  
  compositeShareViewModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  
  compositeShareViewModalContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  
  compositeShareViewModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  
  compositeShareViewModalButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  compositeShareViewModalButtonSecondary: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  
  compositeShareViewModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  compositeShareViewModalButtonTextSecondary: {
    color: '#2196F3',
  },
  
  compositeShareViewFloatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  
  compositeShareViewFloatingButtonIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
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
    height: Dimensions.get('window').height,
    width: 550,
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

  MODALShareButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  // Styles pour la carte produit sélectionnée
  selectedProductCardStyle: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#F8FFF8',
  },
  
  selectedProductsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  selectedProductsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F58320',
  },
  
  clearSelectionButton: {
    padding: 4,
  },
  
  selectedProductsScroll: {
    maxHeight: 40,
  },
  
  selectedProductsContent: {
    paddingRight: 10,
  },

  
  selectedProductChipText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    marginRight: 4,
  },
  
  removeProductButton: {
    padding: 2,
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

export default BulkUploadScreen;