import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  Modal,
  TextInput,
  Linking,FlatList,
  Dimensions, TouchableWithoutFeedback, Switch 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { 
  Platform, AppState } from 'react-native';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';
import { Product, ProductImage } from '../../services/types';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from './useCart';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import { getProducts, getProducts50Simple, getProductsPaginated  } from '../../services/apiService';
import { Icon, Badge } from 'react-native-elements';

// Fonction pour obtenir les dimensions responsives
const getResponsiveDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isLargeScreen = width >= 1024;
  
  return {
    width,
    height,
    isTablet,
    isLargeScreen,
    isSmallScreen: width < 375,productColumns: 2,
    categoryColumns: width > 600 ? (width > 900 ? 6 : 5) : 4,
    horizontalPadding: isTablet ? 30 : 20,
    verticalPadding: isTablet ? 25 : 15,
    cardWidth: isLargeScreen ? (width - 80) / 4 : isTablet ? (width - 70) / 3 : (width - 50) / 2,
    headerHeight: isTablet ? 80 : 60,
    bannerHeight: isTablet ? 200 : 180,
    productImageHeight: isTablet ? 150 : 120,
    categoryImageSize: isTablet ? 80 : 60,
    titleFontSize: isTablet ? 22 : 18,
    subtitleFontSize: isTablet ? 18 : 16,
    bodyFontSize: isTablet ? 16 : 14,
    captionFontSize: isTablet ? 14 : 12,
    sectionSpacing: isTablet ? 35 : 25,
    itemSpacing: isTablet ? 20 : 15,
  };
};

type ProductDetailScreenProps = {
  navigation: any;
  route: any;
};

interface OrderItem {
  product: {
    id: string;
    name: string;
    price?: string;
    image?: string;
    images?: ProductImage[];
    description?: string;
    category?: any;
    prices?: any[];
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

const BASE_URL = 'https://backend.barakasn.com/api/v0';
const { width: screenWidth } = Dimensions.get('window');

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ navigation, route }) => {
  const { productId } = route.params;
  
  // TOUS LES HOOKS DOIVENT ÊTRE DÉCLARÉS EN PREMIER ET DE MANIÈRE INCONDITIONNELLE
  const { isDarkMode, toggleTheme } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const responsive = getResponsiveDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const { cartItems, totalCartItems, saveCart, loadCart } = useCart();
  
  // TOUS LES useState EN PREMIER
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [shareWithPrice, setShareWithPrice] = useState(true);
  const [shareWithDescription, setShareWithDescription] = useState(true);
  const [shareWithImage, setShareWithImage] = useState(true);
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMethod, setShareMethod] = useState<'whatsapp' | 'general'>('general');
  const [showPrices, setShowPrices] = useState(true);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; productCount: number; image?: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
    // const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize, setPageSize] = useState(20); // Nombre de produits par page
    const [enabled, setEnabled] = useState(true); // Pour contrôler
      const [products, setProducts] = useState<Product[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
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
  
    

  // VARIABLES DÉRIVÉES
  const { addedProduct } = route.params || {};
  const allCartItems = [...localCartItems, ...orders];

  // TOUS LES useEffect APRÈS TOUS LES AUTRES HOOKS
  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

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

  useEffect(() => {
    const fetchAllProducts = async () => {
      if (!token) return;

      try {
        setIsLoading(true);
        setLoadingError(null);
        
        const products = await getProducts50Simple(token);
        console.log(`${products.length} produits récupérés:`, products);
        
        setAllProducts(products);
        
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
    if (!token) return;

    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`https://backend.barakasn.com/api/v0/products/products/${productId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Erreur de chargement du produit');
        }

        const data = await response.json();
        setProduct(data);
        setError(null);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Une erreur inconnue est survenue');
        }
        if (err instanceof Error && err.message.includes('401')) {
          Alert.alert('Session expirée', 'Veuillez vous reconnecter');
          navigation.navigate('Login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId, token]);

  useEffect(() => {
    if (product) {
      fetchSimilarProducts();
    }
  }, [product, token]); // Dépendances claires

  useEffect(() => {
    if (product?.category?.id) {
      fetchRelatedProducts(product.category.id, product.id);
    }
  }, [product, token]); // Dépendances claires

  // FONCTIONS (après tous les hooks)
  const increaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
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

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageIndex = Math.floor(contentOffset.x / viewSize.width);
    setCurrentImageIndex(pageIndex);
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true
    });
  };

  const downloadImageForSharing = async (imageUrl: string): Promise<string | null> => {
    try {
      const filename = `${product?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'product'}_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      
      const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return uri;
    } catch (error) {
      console.warn("Impossible de télécharger l'image pour le partage:", error);
      return null;
    }
  };

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

  const getDefaultImageBase64 = async () => {
    try {
      const asset = Asset.fromModule(require('../../assets/images/baraka_icon.png'));
      await asset.downloadAsync();
      
      const base64 = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('Erreur lors du chargement de l\'image par défaut:', error);
      return null;
    }
  };

  const checkImageExists = async (imageUrl: string): Promise<boolean> => {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

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
      const defaultImageBase64 = await getDefaultImageBase64();
      
      const mainImageSource = product.images && product.images.length > 0 
        ? await getImageSource(product.images[0]?.image, defaultImageBase64)
        : defaultImageBase64 || '';
      
      const otherImagesPromises = product.images && product.images.length > 1 
        ? product.images.slice(1).map(async (image, index) => {
            const imageSource = await getImageSource(image.image, defaultImageBase64);
            return { source: imageSource, index: index + 2 };
          })
        : [];
      
      const otherImages = await Promise.all(otherImagesPromises);
      
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

      const { uri } = await Print.printToFileAsync({ 
        html,
        width: 612,
        height: 792,
      });
      
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

  const openShareModal = () => {
    setShareModalVisible(true);
  };

  const handleNavigation = (screenName: string) => {
    closeMenu();
    navigation.navigate(screenName);
  };

  const closeMenu = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
  };

  const addToCart = async (product_id: string) => {
    if (!token) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter');
      navigation.navigate('Login');
      return;
    }
    
    if (!product) {
      Alert.alert('Erreur', 'Produit non chargé');
      return;
    }

    if (!product.prices || product.prices.length === 0) {
      Alert.alert('Erreur', 'Prix du produit non disponible');
      return;
    }

    setIsAddingToCart(true);
    
    try {
      const productPrice = product.prices[0]?.price || '0';
      
      const cartItem: Order = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        total_price: (parseFloat(productPrice) * quantity).toString(),
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
          quantity: quantity,
          unit_price: productPrice
        }]
      };

      try {
        const existingCart = await AsyncStorage.getItem('local_cart');
        const cartItems = existingCart ? JSON.parse(existingCart) : [];
        
        const existingItemIndex = cartItems.findIndex((item: Order) => 
          item.items.some(orderItem => orderItem.product.id === product.id.toString())
        );
        
        if (existingItemIndex !== -1) {
          cartItems[existingItemIndex].items[0].quantity += quantity;
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

  const fetchSimilarProducts = async () => {
    if (!product || !product.category) {
      console.log("Pas de produit ou catégorie disponible pour les produits similaires");
      return;
    }
    
    setIsLoadingSimilar(true);
    try {
      const url = `${BASE_URL}/products/products/?category=${product.category.id}`;
      console.log("Fetching similar products from:", url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("Réponse API produits similaires:", data);
      
      const filteredProducts = data.results ? 
        data.results.filter((p: Product) => p.id.toString() !== product.id.toString()) : [];
      
      const limitedProducts = filteredProducts.slice(0, 6);
      console.log("Produits similaires filtrés:", limitedProducts);
      
      setSimilarProducts(limitedProducts);
    } catch (error) {
      console.error("Erreur lors du chargement des produits similaires:", error);
      setSimilarProducts([]);
    } finally {
      setIsLoadingSimilar(false);
    }
  };

  const fetchRelatedProducts = async (categoryId: string, currentProductId: string) => {
    if (!token) return;
    if (!categoryId) return;
    
    setLoadingRelated(true);
    try {
      const products: Product[] = await getProducts50Simple(token);
      
      if (products && Array.isArray(products)) {
        const categoryProducts: Product[] = products
          .filter((p: Product) => p.category?.id === categoryId && p.id !== currentProductId)
          .slice(0, 3);
        
        setRelatedProducts(categoryProducts);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des produits associés:', error);
      setRelatedProducts([]);
    } finally {
      setLoadingRelated(false);
    }
  };

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

  // COMPOSANTS DE RENDU (après toutes les fonctions)
  const renderImageCarousel = () => {
    if (!product?.images || product.images.length === 0) {
      return (
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/images/baraka_icon.png')}
            style={styles.productImage}
            resizeMode="contain"
          />
        </View>
      );
    }

    return (
      <View style={styles.imageContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.imageScrollView}
        >
          {product.images.map((image, index) => (
            <Image
              key={index}
              source={{ 
                uri: getImageUri(image?.image),
                headers: {
                  'Authorization': `Bearer ${token}`,
                }
              }}
              style={styles.productImage}
              defaultSource={require('../../assets/images/baraka_icon.png')}
              onError={(error) => {
                console.log('Erreur de chargement image:', error.nativeEvent.error);
              }}
              resizeMode="contain"
            />
          ))}
        </ScrollView>
        
        {product.images.length > 1 && (
          <View style={styles.pagination}>
            {product.images.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.paginationDot,
                  { backgroundColor: currentImageIndex === index ? '#F58320' : '#ccc' }
                ]}
                onPress={() => goToImage(index)}
              />
            ))}
          </View>
        )}
        
        {product.images.length > 1 && (
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentImageIndex + 1} / {product.images.length}
            </Text>
          </View>
        )}
      </View>
    );
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

              {shareWithImage && product.images && product.images.length > 0 && (
                <View style={styles.imagePreviewSection}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Image à partager (image {currentImageIndex + 1})
                  </Text>
                  <Image 
                    source={{ uri: getImageUri(product.images[currentImageIndex]?.image) }}
                    style={styles.sharePreviewImage}
                    defaultSource={require('../../assets/images/baraka_icon.png')}
                  />
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
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderRelatedProduct = ({ item }: { item: Product }) => {
    const productImage = item.images?.[0]?.image;
    const productPrice = item.prices?.[0];

    return (
      <TouchableOpacity
        style={[
          styles.relatedProductCard,
          {
            width: responsive.cardWidth,
            backgroundColor: theme.background,
          }
        ]}
        onPress={() => {
          navigation.navigate('ProductDetailScreen', { productId: item.id });
        }}
        activeOpacity={0.7}
      >
        <View style={[
          styles.relatedProductImageContainer,
          { height: responsive.productImageHeight }
        ]}>
          {productImage ? (
            <Image
              source={{ uri: getImageUri(productImage) }}
              style={[styles.relatedProductImage, { height: responsive.productImageHeight }]}
              resizeMode="cover"
            />
          ) : (
            <Image
              source={require('../../assets/images/baraka_icon.png')}
              style={[styles.relatedProductImage, { height: responsive.productImageHeight }]}
              resizeMode="contain"
            />
          )}
          
          <View style={[
            styles.relatedStockBadge,
            { backgroundColor: item.stock === 0 ? '#FF3B30' : '#34C759' }
          ]}>
            <Text style={[styles.relatedStockText, { fontSize: responsive.captionFontSize - 2 }]}>
              {item.stock === 0 ? 'RUPTURE' : 'STOCK'}
            </Text>
          </View>
        </View>

        <View style={styles.relatedProductInfo}>
          <Text 
            style={[
              styles.relatedProductName, 
              { 
                fontSize: responsive.bodyFontSize,
                color: theme.text 
              }
            ]} 
            numberOfLines={2}
          >
            {item.name}
          </Text>
          
          {productPrice && showPrices && (
            <Text 
              style={[
                styles.relatedProductPrice,
                { fontSize: responsive.captionFontSize + 1 }
              ]}
            >
              {formatPrice(productPrice.price)} FCFA
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const RelatedProductsSection = () => {
    if (!product?.category || relatedProducts.length === 0) {
      return null;
    }

    return (
      <View style={[styles.relatedProductsSection, { backgroundColor: theme.background }]}>
        <View style={styles.relatedProductsHeader}>
          <Text style={[styles.relatedProductsTitle, { color: theme.text }]}>
            Autres produits dans "{product.category.name}"
          </Text>
          <TouchableOpacity
            onPress={() => {
              const filteredProducts = allProducts?.filter(p => p.category?.id === product.category.id) || [];
              navigation.navigate('CategoryProductsScreen', { 
                category: product.category,
                products: filteredProducts 
              });
            }}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>Voir tout</Text>
            <Ionicons name="chevron-forward" size={16} color="#F58320" />
          </TouchableOpacity>
        </View>

        {loadingRelated ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#F58320" />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Chargement...
            </Text>
          </View>
        ) : (
          <FlatList
            data={relatedProducts}
            renderItem={renderRelatedProduct}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.relatedProductsList}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          />
        )}
      </View>
    );
  };

  const renderSimilarProducts = () => {
    if (isLoadingSimilar) {
      return (
        <View style={styles.similarProductsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 15 }]}>
            Chargement des produits similaires...
          </Text>
          <ActivityIndicator size="large" color="#F58320" style={{ marginVertical: 20 }} />
        </View>
      );
    }

    if (!similarProducts || similarProducts.length === 0) {
      return (
        <View style={styles.similarProductsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 15 }]}>
            Produits de la même catégorie
          </Text>
          <View style={styles.noSimilarProductsContainer}>
            <Ionicons name="information-circle-outline" size={40} color="#ccc" />
            <Text style={styles.noSimilarProductsText}>
              Aucun autre produit trouvé dans cette catégorie
            </Text>
          </View>
        </View>
      );
    }

    const categoryName = product?.category?.name || 'cette catégorie';

    return (
      <View style={styles.similarProductsContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 15 }]}>
          Autres produits de "{categoryName}"
        </Text>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.similarProductsScroll}
        >
          {similarProducts.map((item, index) => (
            <TouchableOpacity 
              key={`${item.id}_${index}`}
              style={[
                styles.similarProductCard, 
                { 
                  backgroundColor: theme.background || theme.background,
                  shadowColor: theme.text || '#000'
                }
              ]}
              onPress={() => navigation.push('ProductDetail', { productId: item.id })}
              activeOpacity={0.8}
            >
              <View style={styles.similarProductImageContainer}>
                <Image
                  source={{ 
                    uri: item.images && item.images.length > 0 
                      ? getImageUri(item.images[0].image) 
                      : undefined,
                    headers: token ? {
                      'Authorization': `Bearer ${token}`,
                    } : undefined
                  }}
                  style={styles.similarProductImage}
                  defaultSource={require('../../assets/images/baraka_icon.png')}
                  resizeMode="cover"
                />
                
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {item.category?.name || 'Produit'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.similarProductInfo}>
                <Text 
                  style={[styles.similarProductName, { color: theme.text }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {item.name}
                </Text>
                
                <Text style={styles.similarProductPrice}>
                  {item.prices && item.prices.length > 0 
                    ? formatPrice(item.prices[0].price) 
                    : '0'} FCFA
                </Text>
                
                <TouchableOpacity 
                  style={styles.quickAddButton}
                  onPress={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Ionicons name="add-circle" size={24} color="#F58320" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // CONDITIONS DE RENDU EARLY RETURN
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F58320" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => setError(null)}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={styles.errorText}>Produit non trouvé</Text>
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
    

  // RENDU PRINCIPAL
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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#F58320" />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Détails du produit
          </Text>
          
          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderImageCarousel()}
        
        <View style={styles.productNameContainer}>
          <Text style={[styles.productName, { color: theme.text }]}>
            {product?.name}
          </Text>
          <View style={styles.productNameUnderline} />
        </View>
        
        <View style={styles.modernPriceContainer}>
          <View style={styles.priceGradient}>
            <View style={styles.priceContent}>
              <Text style={styles.priceLabel}>Prix</Text>
              <Text style={styles.modernPrice}>
                {formatPrice(product?.prices[0]?.price || '0')} FCFA
              </Text>
              <View style={styles.priceDecoration} />
            </View>
          </View>
        </View>
        
        <View style={styles.modernDescriptionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={24} color="#F58320" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Description</Text>
          </View>
          
          {product?.description ? (
            <View style={[styles.descriptionCard, { backgroundColor: theme.background }]}>
              <Text style={[styles.modernDescriptionText, { color: theme.text }]}>
                {product.description}
              </Text>
            </View>
          ) : (
            <View style={styles.noDescriptionCard}>
              <Ionicons name="information-circle-outline" size={40} color="#ccc" />
              <Text style={styles.noDescriptionText}>Aucune description disponible</Text>
            </View>
          )}
        </View>
        
        <View style={styles.modernQuantitySection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="layers-outline" size={24} color="#F58320" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Quantité</Text>
          </View>
          
          <View style={styles.modernQuantityContainer}>
            <TouchableOpacity 
              style={[styles.modernQuantityButton, { opacity: quantity <= 1 ? 0.5 : 1 }]} 
              onPress={decreaseQuantity}
              disabled={quantity <= 1}
            >
              <LinearGradient
                colors={quantity <= 1 ? ['#ccc', '#999'] : ['#FF6B6B', '#FF8E8E']}
                style={styles.quantityButtonGradient}
              >
                <Ionicons name="remove" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.quantityDisplay}>
              <Text style={[styles.modernQuantityText, { color: theme.text }]}>{quantity}</Text>
              <Text style={[styles.quantityLabel, { color: theme.text }]}>pièce{quantity > 1 ? 's' : ''}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.modernQuantityButton} 
              onPress={increaseQuantity}
            >
              <LinearGradient
                colors={['#4CAF50', '#66BB6A']}
                style={styles.quantityButtonGradient}
              >
                <Ionicons name="add" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {product?.category ? (
          <>
            <View style={[styles.descriptionCard, { backgroundColor: theme.background }]}>
              <Text style={[styles.modernDescriptionText, { color: theme.text }]}>
                {product.category.name}
              </Text>
            </View>
            
            <RelatedProductsSection />
          </>
        ) : (
          <View style={styles.noDescriptionCard}>
            <Ionicons name="information-circle-outline" size={40} color="#ccc" />
            <Text style={styles.noDescriptionText}>Aucune description disponible</Text>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={() => product && addToCart(product.id.toString())}
          disabled={isAddingToCart}
        >
          <Text style={styles.addToCartButtonText}>
            {isAddingToCart ? 'Ajout en cours...' : `Ajouter ${quantity} au panier`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.exportButton}
          onPress={openShareModal}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="settings-outline" size={20} color="white" />
              <Text style={styles.exportButtonText}>Options de partage avancées</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {renderShareModal()}
    </View>
  );
};



// Styles corrigés pour la barre des tâches
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Header fixe corrigé
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
    backgroundColor: '#fff', // Fond opaque
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Safe area pour iOS
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 44, // Hauteur fixe pour le contenu
  },
  
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 131, 32, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 131, 32, 0.2)',
  },
  
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 20,
  },
  
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },

  // Contenu principal avec marge pour éviter le chevauchement
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'ios' ? 110 : 90, // Marge pour éviter le header
    paddingBottom: 20,
  },
  
  content: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  // Reste des styles inchangés...
  profileContainer: { 
    justifyContent: "center",
    alignItems: "center",
  },
  
  profileText: {
    fontWeight: "600",
    fontSize: 16,
    color: '#333',
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
  
  shareButton: {
    backgroundColor: '#F58320',
    padding: 10,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  descriptionContainer: {
    width: '100%',
    marginBottom: 30,
    // marginLeft: 70,
    alignSelf: 'center', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  
  priceContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 15,
  },
  
  productPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F58320',
  },
  
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  
  quantityButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  
  quantityText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },

  
addToCartButton: {
  width: '90%',  // Changé de 500 à 90% pour s'adapter à l'écran
  alignSelf: 'center',  // Ajouté pour centrer le bouton
  backgroundColor: '#F58320',
  padding: 15,
  borderRadius: 8,
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 15,
},

exportButton: {
  width: '90%',  // Changé de 500 à 90% pour s'adapter à l'écran
  alignSelf: 'center',  // Ajouté pour centrer le bouton
  flexDirection: 'row',
  backgroundColor: '#34A853',
  paddingVertical: 15,
  paddingHorizontal: 20,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 30,
},
  
  addToCartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  exportButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  
  retryButton: {
    backgroundColor: '#F58320',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'center',
  },
  
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  imageContainer: {
    width: screenWidth - 40,
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  
  imageScrollView: {
    width: '100%',
    height: '100%',
  },
  
  productImage: {
    width: screenWidth - 40,
    height: '100%',
    resizeMode: 'contain',
  },
  
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

  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: '#ccc',
  },

  imageCounter: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Menu styles
  menuDropdown: {
    position: 'absolute',
    right: 0,
    left: 0,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    marginHorizontal: 8,
  },
  
  menuScrollContainer: {
    flex: 1,
    borderRadius: 12,
  },
  
  menuScrollContent: {
    paddingVertical: 8,
  },
  
  menuSection: {
    marginBottom: 16,
  },
  
  sectionCategorieTitle: {
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  
  animatedItem: {
    justifyContent: 'space-between',
  },
  
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  
  menuText: {
    fontWeight: '500',
    flex: 1,
  },
  
  switchItem: {
    justifyContent: 'space-between',
  },
  
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  statusBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  

  // Nom du produit modernisé
  productNameContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },

  productName: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 34,
  },

  productNameUnderline: {
    width: 60,
    height: 4,
    backgroundColor: '#F58320',
    borderRadius: 2,
    marginTop: 8,
  },

  // Conteneur de prix moderne
  modernPriceContainer: {
    marginBottom: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },

  priceGradient: {
    borderRadius: 18,
    overflow: 'hidden',
  },

  priceContent: {
    padding: 25,
    alignItems: 'center',
    position: 'relative',
  },

  priceLabel: {
    color: 'black',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  modernPrice: {
    color: 'black',
    fontSize: 32,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  priceDecoration: {
    position: 'absolute',
    top: 10,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Section description moderne
  modernDescriptionContainer: {
    marginBottom: 30,
    width: '100%',
    
    alignSelf: 'center', 
    justifyContent: 'center',
    alignItems: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 10,
  },

  descriptionCard: {
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 131, 32, 0.2)',
    backgroundColor: 'rgba(245, 131, 32, 0.05)',
  },

  modernDescriptionText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },

  noDescriptionCard: {
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },

  noDescriptionText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
  },

  // Section quantité moderne
  modernQuantitySection: {
    marginBottom: 30,
    width: '100%',
    
    alignSelf: 'center', 
    justifyContent: 'center',
    alignItems: 'center',
  },

  modernQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  modernQuantityButton: {
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  quantityButtonGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },

  quantityDisplay: {
    alignItems: 'center',
    marginHorizontal: 30,
    minWidth: 80,
  },

  modernQuantityText: {
    fontSize: 28,
    fontWeight: '800',
  },

  quantityLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
    marginTop: 2,
  },

  
  // Boutons d'action modernes
  actionButtonsContainer: {
    gap: 15,
  },

  modernAddToCartButton: {
    borderRadius: 18,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  addToCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 25,
    borderRadius: 18,
  },

  modernAddToCartText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.5,
  },

  modernShareButton: {
    borderRadius: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 18,
  },

  modernShareText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },



  
  similarProductsContainer: {
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  
  similarProductsScroll: {
    paddingBottom: 10,
  },
  
  similarProductCard: {
    width: 150,
    marginRight: 15,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  similarProductImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 10,
  },
  
  similarProductName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  
  similarProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F58320',
  },


  
  noSimilarProductsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  
  noSimilarProductsText: {
    color: '#6c757d',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  
  similarProductImageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(245, 131, 32, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  
  categoryBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  
  similarProductInfo: {
    flex: 1,
    position: 'relative',
  },
  
  quickAddButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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

  relatedProductsSection: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  
  relatedProductsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  relatedProductsTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F58320',
  },
  
  viewAllText: {
    color: '#F58320',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  
  relatedProductsList: {
    paddingHorizontal: 4,
  },
  
  relatedProductCard: {
    borderRadius: 12,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  
  relatedProductImageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  
  relatedProductImage: {
    width: '100%',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  
  relatedStockBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  
  relatedStockText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
  },
  
  relatedProductInfo: {
    flex: 1,
  },
  
  relatedProductName: {
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 4,
  },
  
  relatedProductPrice: {
    fontWeight: 'bold',
    color: '#F58320',
  },
  
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
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
  productCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 5,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2, // Android
    shadowColor: '#000', // iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
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

export default ProductDetailScreen;