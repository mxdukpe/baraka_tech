import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput,
  TouchableOpacity, 
  Image, 
  Alert, 
  ActivityIndicator, 
  ScrollView, 
  Share,
  TouchableWithoutFeedback,
  Button,
  Modal,
  
  Platform, AppState,
  Dimensions,
  StatusBar,ImageBackground,RefreshControl,
  Linking, Switch 
} from 'react-native';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';
import { Icon, Badge } from 'react-native-elements';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { getProducts, getProducts50Simple, getProductsPaginated  } from '../../services/apiService';
import {  ProductImage } from '../../services/types';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { useCart } from './useCart';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import { Product} from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import HeaderComponent from './HeaderComponent';

type CatalogueScreenProps = {
  navigation: any;
  route: any;
};
interface OrderItem {
  product: {
    id: string;
    name: string;
    price?: string;
    image?: string;  // Single image (if that's what your type expects)
    images?: ProductImage[];  // Array of images (if you need multiple)
    description?: string;
    category?: any; // You might want to type this properly
    prices?: any[]; // You might want to type this properly
  };
  quantity: number;
  unit_price: string;
}
type Order = {
  id: string;
  total_price: string;
  status: string;
  created_at: string;
  items: OrderItem[];
};


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



const BASE_URL = 'https://backend.barakasn.com/api/v0';
const { width: screenWidth } = Dimensions.get('window');


interface UseInfiniteScrollProps {
  token: string | null;
  pageSize?: number;
  enabled?: boolean; // Pour contrôler si le hook doit s'exécuter
}

interface UseInfiniteScrollReturn {
  products: Product[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  totalCount: number;
}


const CatalogueScreen: React.FC<CatalogueScreenProps> = ({ navigation, route }) => {

  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [token, setToken] = useState<string | null>(null);

      const [menuVisible, setMenuVisible] = useState(false);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loadingError, setLoadingError] = useState<string | null>(null);

    const [quantity, setQuantity] = useState(1);

  
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  const theme = isDarkMode ? darkTheme : lightTheme;
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

  // État pour la modal de partage
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [shareWithPrice, setShareWithPrice] = useState(true);
  const [shareWithDescription, setShareWithDescription] = useState(true);
  const [shareWithImage, setShareWithImage] = useState(true);
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
    const { width, height } = Dimensions.get('window');
    const isLandscape = width > height;
    const numColumns = 2; // Toujours 2 colonnes

    const cardWidth = (width - (numColumns * 10 + 20)) / numColumns;

    // const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20); // Nombre de produits par page
  const [enabled, setEnabled] = useState(true); // Pour contrôler
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

  
  
  
  // const { cartItems, totalCartItems, saveCart } = useCart();
  const { addedProduct } = route.params || {};
  const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const allCartItems = [...localCartItems, ...orders];
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
  
  const getPriceByCriterion = (product: Product) => {
    // Retourner simplement le premier prix disponible
    return product.prices[0];
  };

  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };

  
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
                  Éléments à inclure
                </Text>
                
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
                    Inclure l'image
                  </Text>
                </TouchableOpacity>

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
                    Inclure le prix
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
                    Inclure la description
                  </Text>
                </TouchableOpacity>

                {shareWithPrice && (
                  <TouchableOpacity 
                    style={[styles.optionRow, { marginLeft: 20 }]}
                    onPress={() => setUseCustomPrice(!useCustomPrice)}
                  >
                    <Ionicons 
                      name={useCustomPrice ? "checkbox" : "square-outline"} 
                      size={20} 
                      color="#F58320" 
                    />
                    <Text style={[styles.optionText, { color: theme.text }]}>
                      Utiliser un prix personnalisé
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

  const updateQuantity = (productId: string, increment: boolean) => {
    setProductQuantities(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + (increment ? 1 : -1));
      return { ...prev, [productId]: newQty };
    });
  };

  const addToCart = async (product: Product) => {
  if (!token) {
    Alert.alert('Connexion requise', 'Veuillez vous connecter');
    navigation.navigate('Login');
    return;
  }
  
  // Vérification supplémentaire pour les prix
  if (!product.prices || product.prices.length === 0) {
    Alert.alert('Erreur', 'Prix du produit non disponible');
    return;
  }

  setIsAddingToCart(true);
  
  try {
    // Récupération sécurisée du prix
    const productPrice = product.prices[0]?.price || '0';
    const currentQuantity = productQuantities[product.id] || 1;
    
    // Créer l'objet Order complet
    const cartItem: Order = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      total_price: (parseFloat(productPrice) * currentQuantity).toString(),
      status: 'pending',
      created_at: new Date().toISOString(),
      items: [{
        product: {
          id: product.id.toString(),
          name: product.name,
          price: productPrice,
          images: product.images || [],
          description: product.description || '',
          category: product.category || null,
          prices: product.prices || []
        },
        quantity: currentQuantity,
        unit_price: productPrice
      }]
    };

    // Sauvegarder dans le stockage local
    try {
      const existingCart = await AsyncStorage.getItem('local_cart');
      const cartItems = existingCart ? JSON.parse(existingCart) : [];
      
      const existingItemIndex = cartItems.findIndex((item: Order) => 
        item.items.some(orderItem => orderItem.product.id === product.id.toString())
      );
      
      if (existingItemIndex !== -1) {
        cartItems[existingItemIndex].items[0].quantity += currentQuantity;
        cartItems[existingItemIndex].total_price = (
          parseFloat(cartItems[existingItemIndex].items[0].unit_price) * 
          cartItems[existingItemIndex].items[0].quantity
        ).toString();
      } else {
        cartItems.push(cartItem);
      }
      
      await AsyncStorage.setItem('local_cart', JSON.stringify(cartItems));
    } catch (storageError) {
      console.warn('Erreur de stockage local:', storageError);
    }

    navigation.navigate('CartTab', { 
      screen: 'CartScreen',
      params: { addedProduct: cartItem }
    });
    
    Alert.alert('Succès', 'Produit ajouté au panier');
    
  } catch (error) {
    const errorMessage = (error instanceof Error && error.message) ? error.message : "Erreur lors de l'ajout au panier";
    Alert.alert('Erreur', errorMessage);
  } finally {
    setIsAddingToCart(false);
  }
};

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

  const handleShareProduct = async (product: Product) => {
    try {
      await Share.share({
        message: `Découvrez ce produit: ${product.name} - ${formatPrice(product.prices[0]?.price)} FCFA\n\nDisponible sur l'application Barakasn`,
        url: product.images[0]?.image,
        title: `Partager ${product.name}`
      });
    } catch (error) {
      console.error('Erreur lors du partage:', error);
    }
  };


  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory ? product.category.name === selectedCategory : true;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });


  // Composant de rendu des produits dans la modal
  const renderProductInModal = ({ item }: { item: Product }) => {
    const stockStatus = item.stock === 0;
    const productImage = item.images?.[0]?.image;
    const productPrice = getPriceByCriterion(item);
    // const isSelected = selectedProducts.includes(item.id.toString());
    
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
        // isSelected && styles.selectedProductCardStyle
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
      </View>
    </TouchableOpacity>
    );
  };
    

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F58320" />
      </View>
    );
  }

  if (loadingError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{loadingError}</Text>
        <Button 
          title="Réessayer" 
          onPress={() => {
            setLoadingError(null);
            // Relancer le chargement
          }}
        />
      </View>
    );
  }
  

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: '#F58320' }]}
          onPress={() => {
            setError(null);
            setIsLoading(true);
          }}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }


  
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
          title="Notre catalogue"
          // showCart={false} // Optionnel: masquer l'icône panier
        />

      <View style={styles.headerText}>
        {/* <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#F58320" />
        </TouchableOpacity> */}
        {/* <Text style={[styles.headerTitle, { color: theme.text }]}>Notre catalogue</Text> */}
      </View>

      {/* Nouveau bouton */}
        <TouchableWithoutFeedback onPress={() => setShowPrices(!showPrices)}>
          <View 
          style={styles.togglePricesButton}>
            <Ionicons 
              name={showPrices ? 'eye-off' : 'eye'} 
              size={24} 
              color="#F58320" 
            />
            {/* <Text style={[styles.menuText, {color: theme.header.text}]}>
              {showPrices ? "Masquer les prix" : "Afficher les prix"}
            </Text> */}
          </View>
        </TouchableWithoutFeedback>



      <View style={styles.categoryContainer}>
        {/* <TouchableOpacity
          style={[
            styles.categoryButton,
            !selectedCategory && styles.selectedCategoryButton,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[
            styles.categoryText,
            !selectedCategory && styles.selectedCategoryText,
          ]}>
            Tous
          </Text>
        </TouchableOpacity> */}

        {/* {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.name && styles.selectedCategoryButton,
            ]}
            onPress={() => setSelectedCategory(category.name)}
          >
            <Text style={styles.categoryText}>{category.name}</Text>
          </TouchableOpacity>
        ))} */}
      </View>

      
      {/* <Text style={[styles.resultsCount, { color: theme.text }]}>
        {allProducts.length} produit{allProducts.length !== 1 ? 's' : ''} trouvé{allProducts.length !== 1 ? 's' : ''}
      </Text> */}

      {/* <FlatList
        data={allProducts}
        renderItem={renderProductInModal}
        keyExtractor={(item) => item.id.toString()}
        numColumns={responsive.productColumns} // Utilisation du nombre de colonnes dynamique
        columnWrapperStyle={responsive.productColumns > 1 ? styles.productRow : undefined}
        // contentContainerStyle={styles.productList}
        ListEmptyComponent={
          <Text style={[styles.errorText, {color: theme.text}]}>
            Aucun produit disponible
          </Text>
        }
      />
       */}
        <FlatList
        data={products}
        renderItem={renderProductInModal}
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
        
        
        numColumns={2} // fixé à 2
        columnWrapperStyle={styles.productRow} // Utilisation du nombre de colonnes dynamique
        // columnWrapperStyle={responsive.productColumns > 1 ? styles.productRow : undefined}
        // contentContainerStyle={styles.productList}
        ListEmptyComponent={
          <Text style={[styles.errorText, {color: theme.text}]}>
            Aucun produit disponible
          </Text>
        }
      />
      {renderShareModal()}
    </View>
  );
};

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },

  
  headerBar: {
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
  marginBottom: 16, // Espace vertical
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


  imageContainer: {
    width: screenWidth - 40, // Largeur de l'écran moins les paddings
    height: 300,
    // backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  
  togglePricesButton: {
    marginLeft: 'auto',
    padding: 8,
  },

  retryButton: {
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  headerText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  searchInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  categoriesScroll: {
    marginBottom: 12,
  },
  categoriesContainer: {
    paddingRight: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#FFF5EC',
    borderWidth: 1,
    borderColor: '#F58320',
  },
  selectedCategoryButton: {
    backgroundColor: '#F58320',
  },
  categoryText: {
    fontSize: 14,
    color: '#F58320',
  },
  selectedCategoryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultsCount: {
    fontSize: 14,
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  addButton: {
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
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

  itemPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  productImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 12,
    color: '#666',
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
    height: 290,
  },

  modalProductImageContainer: {
    position: 'relative',
    marginBottom: 8, // Réduit
    borderRadius: 6,
    overflow: 'hidden',
  },

  modalProductImage: {
    width: '100%',
    borderRadius: 6,
    backgroundColor: '#f8f8f8',
  },
  emptyList: {
    flexGrow: 1,
  },

  modalShareButton: {
    position: 'absolute',
    bottom: 0,
    right: 4, // Réduit
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16, // Réduit
    padding: 4, // Réduit
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  modalStockIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 4, // Réduit
    paddingHorizontal: 6, // Réduit
    paddingVertical: 2,
    borderRadius: 3,
  },

  modalStockText: {
    fontSize: 9, // Réduit
    fontWeight: 'bold',
    color: 'white',
  },

  modalProductInfo: {
    flex: 1,
  },

  modalProductName: {
    fontSize: 13, // Réduit
    fontWeight: '600',
    color: '#333',
    marginBottom: 4, // Réduit
    lineHeight: 16, // Réduit
  },

  modalProductDescription: {
    fontSize: 11, // Réduit
    color: '#666',
    marginBottom: 6, // Réduit
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

  modalProductPrice: {
    fontSize: 14, // Réduit
    fontWeight: 'bold',
    color: '#F58320',
    marginTop: 4, // Réduit
  },
  
  productList: {
    paddingBottom: 16, // Réduit
    paddingTop: 8, // Ajouté pour un espacement minimal en haut
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40, // Réduit
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },



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

modalProductRow: {
  justifyContent: 'space-between',
  // marginBottom: 8, // Espace entre les rangées
  // paddingHorizontal: 8, // Ajustez selon vos besoins
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

export default CatalogueScreen;