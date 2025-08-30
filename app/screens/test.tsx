import React, { useState, useEffect, useCallback, useRef  } from 'react';
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
  Button,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Linking,
  Platform, Switch,SafeAreaView, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { getProducts, getProducts50Simple } from '../../services/apiService';
import { Product, ProductImage } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Icon, Badge } from 'react-native-elements';
import { useCart } from './useCart';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import debounce from 'lodash.debounce';
import { Asset } from 'expo-asset';

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
    // Colonnes adaptatives - ajustez en fonction de la largeur ET de l'orientation
    productColumns: isLandscape ? 3 : (width > 600 ? (width > 900 ? 4 : 3) : 2),
    categoryColumns: width > 600 ? (width > 900 ? 6 : 5) : 4,
    // Padding adaptatif
    horizontalPadding: isTablet ? 30 : 20,
    verticalPadding: isTablet ? 25 : 15,
    // Espacement des icônes adaptatif
    iconSpacing: isLandscape ? 15 : (isTablet ? 25 : 20),
    // Tailles d'éléments - ajustées pour le mode paysage
    cardWidth: isLandscape ? (width - 80) / 3 : (isLargeScreen ? (width - 80) / 4 : isTablet ? (width - 70) / 3 : (width - 50) / 2),
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

// Types pour la modal
interface CategoryData {
  id: string;
  name: string;
  productCount: number;
  image?: string;
}


const BASE_URL = 'https://backend.barakasn.com/api/v0';
const { width: screenWidth } = Dimensions.get('window');


type CategorieScreenProps = {
  navigation: any;
  route?: any; // Ajout de route pour la navigation
};

const CategorieScreen: React.FC<CategorieScreenProps> = ({ navigation, route }) => {
  const [categories, setCategories] = useState<Array<{ id: string; name: string; productCount: number; image?: string }>>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
      const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'categories' | 'products'>('categories');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [shareWithPrice, setShareWithPrice] = useState(true);
  const [shareWithDescription, setShareWithDescription] = useState(true);
  const [shareWithImage, setShareWithImage] = useState(true);
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  const responsiveModal = getResponsiveDimensionsForModal();
        
  const [menuVisible, setMenuVisible] = useState(false);
        

  
  const { isDarkMode, toggleTheme } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const responsive = getResponsiveDimensions();

  
  // const { cartItems, totalCartItems, saveCart } = useCart();
  const { addedProduct } = route.params || {};
  const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const allCartItems = [...localCartItems, ...orders];
    // const [token, setToken] = useState<string | null>(null);
  
  // const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  // const allCartItems = [...localCartItems, ...orders];
  
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

  // Ajoutez ces nouveaux états pour la recherche dans la modal

// Nouveaux états pour la modal et la recherche
// Dans le composant CategorieScreen, après les autres useState existants, ajoutez :

// Nouveaux états pour la modal et la recherche
const [modalVisible, setModalVisible] = useState<boolean>(false);
const [selectedCategoryData, setSelectedCategoryData] = useState<CategoryData | null>(null);
const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
const [modalSearchQuery, setModalSearchQuery] = useState(''); // Recherche spécifique à la modal
const [filteredCategoryProducts, setFilteredCategoryProducts] = useState<Product[]>([]); // Produits filtrés de la modal

// Modifiez le useEffect de recherche existant pour ne pas affecter la modal
const debouncedSearch = useCallback(
  debounce((query: string) => {
    if (query.trim() === '') {
      setFilteredProducts([]);
      return;
    }
    
    const searchTerm = query.toLowerCase();
    const results = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm) ||
      product.category.name.toLowerCase().includes(searchTerm) ||
      product.brand.name.toLowerCase().includes(searchTerm)
    );
    setFilteredProducts(results);
  }, 300),
  [products]
);

// Nouveau debounce pour la recherche dans la modal
const debouncedModalSearch = useCallback(
  debounce((query: string, products: Product[]) => {
    if (query.trim() === '') {
      setFilteredCategoryProducts(products);
      return;
    }
    
    const searchTerm = query.toLowerCase();
    const results = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm) ||
      product.category.name.toLowerCase().includes(searchTerm) ||
      product.brand.name.toLowerCase().includes(searchTerm)
    );
    setFilteredCategoryProducts(results);
  }, 300),
  []
);

// useEffect pour gérer la recherche dans la modal
useEffect(() => {
  if (modalVisible && categoryProducts.length > 0) {
    debouncedModalSearch(modalSearchQuery, categoryProducts);
  }
  return () => debouncedModalSearch.cancel();
}, [modalSearchQuery, categoryProducts, modalVisible, debouncedModalSearch]);

useEffect(() => {
  if (modalVisible && categoryProducts.length > 0) {
    debouncedModalSearch(modalSearchQuery, categoryProducts);
  }
  return () => debouncedModalSearch.cancel();
}, [modalSearchQuery, debouncedModalSearch]); // Retirez categoryProducts et modalVisible des dépendances


// Modifiez aussi la fonction handleCategoryPress pour une meilleure initialisation :

// const handleCategoryPress = (categoryName: string) => {
//   const filteredProducts = allProducts.filter(product => product.category.name === categoryName);
//   const categoryInfo = categories.find(cat => cat.name === categoryName);
  
//   if (categoryInfo) {
//     setSelectedCategoryData(categoryInfo);
//     setCategoryProducts(filteredProducts);
//     setFilteredCategoryProducts([]); // Initialisez comme tableau vide
//     setModalSearchQuery(''); // Réinitialisez la recherche
//     setModalVisible(true);
//   }
// };
  
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

  const getPriceByCriterion = (product: Product) => {
    return product.prices[0];
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

    const [showPrices, setShowPrices] = useState(true);
  

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

  // Composant Modal pour afficher les produits de la catégorie
  const CategoryModal = ({
    modalVisible,
    setModalVisible,
    modalSearchQuery,
    setModalSearchQuery,
    filteredCategoryProducts,
    categoryProducts,
    renderProductInModal,
    theme,
    responsiveModal
  }: {
    modalVisible: boolean;
    setModalVisible: (visible: boolean) => void;
    modalSearchQuery: string;
    setModalSearchQuery: (query: string) => void;
    filteredCategoryProducts: Product[];
    categoryProducts: Product[];
    renderProductInModal: ({ item }: { item: Product }) => React.ReactElement;
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
                placeholder="Rechercher dans cette catégorie..."
                placeholderTextColor="#999"
                value={modalSearchQuery}
                onChangeText={handleSearchChange} // Utilisez handleSearchChange ici
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchButton}>
                <Ionicons name="search-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
  
          <View style={styles.modalCategorieContent}>
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
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // Composant de rendu des produits dans la modal
   const renderProductInModal = ({ item }: { item: Product }) => {
      const quantity = productQuantities[item.id] || 0;
          const stockStatus = item.stock === 0;
          const productImage = item.images?.[0]?.image;
          const productPrice = getPriceByCriterion(item);
          
          // Limiter la description à 30 caractères
          const limitedDescription = item.description 
            ? item.description.length > 30 
              ? `${item.description.substring(0, 20)}...` 
              : item.description
            : 'Pas de description';
      
          return (
            <TouchableOpacity
              style={[styles.rendermodalProductCard, {
                width: responsive.cardWidth,
                margin: responsive.itemSpacing / 4,
              }]}
              onPress={() => {
                setModalVisible(false);
                navigation.navigate('ProductDetailScreen', { productId: item.id });
              }}
            >
              <View style={styles.rendermodalProductImageContainer}>
                {productImage ? (
                  <Image
                    source={{ uri: `https://backend.barakasn.com${productImage}` }}
                    style={[styles.rendermodalProductImage, { height: responsive.productImageHeight }]}
                    resizeMode="cover"
                  />
                ) : (
                  <Image
                    source={require('../../assets/images/baraka_icon.png')}
                    style={[styles.rendermodalProductImage, { height: responsive.productImageHeight }]}
                    resizeMode="cover"
                  />
                )}
              </View> 
      
              <View style={styles.rendermodalProductInfo}>
                <Text style={[styles.rendermodalProductName, { fontSize: responsive.bodyFontSize }]} numberOfLines={2}>
                  {item.name}
                </Text>
                {/* Ajoutez la description limitée ici */}
                <Text style={[styles.rendermodalProductDescription, { fontSize: responsive.captionFontSize }]} numberOfLines={1}>
                  {limitedDescription}
                </Text>
                {/* <Text style={styles.modalProductCategory}>
                  {item.category.name}
                </Text> */}
                {/* <Text style={styles.modalProductBrand}>
                  {item.category.name} - {item.brand?.name || 'Marque non spécifiée'}
                </Text> */}
                <Text style={[styles.rendermodalProductPrice, { fontSize: responsive.bodyFontSize }]}>
                  {showPrices 
                    ? productPrice ? `${formatPrice(productPrice.price)} FCFA` : 'Prix non disponible'
                    : ' '}
                </Text>
                
                <TouchableOpacity 
                  onPress={() => openShareModal(item)}
                  style={styles.rendermodalShareButton}>
                  <Ionicons name="share-social" size={18} color="#F58320" />
                </TouchableOpacity>
      
                <View style={[
                  styles.rendermodalStockIndicator,
                  { 
                    backgroundColor: stockStatus ? '#FF3B30' : '#34C759',
                  }
                ]}>
                  <Text style={styles.rendermodalStockText}>
                    {stockStatus ? 'RUPTURE' : 'EN STOCK'}
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
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Chargement des catégories...
        </Text>
      </View>
    );
  }

  if (loadingError) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={[styles.errorText, { color: theme.text }]}>{loadingError}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setLoadingError(null);
            setIsLoading(true);
          }}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
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

  const handleCloseMenu = () => {
    console.log('Menu fermé');
    setMenuVisible(false);
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Barre des tâches fixe en haut */}
              <View style={[
                styles.header,
                { 
                  height: responsive.headerHeight,
                  paddingHorizontal: responsive.horizontalPadding,
                  backgroundColor: 'white'
                }
              ]}>
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    setMenuVisible(!menuVisible);
                  }}>
                  <Ionicons name="menu" size={28} color="#F58320" />
                </TouchableOpacity>
      
                <View style={styles.profileContainer}>
                  <Text style={[
                    styles.profileText,
                    {
                      color: theme.header.text,
                      fontSize: responsive.subtitleFontSize
                    }
                  ]}>
                    Baraka Electronique
                  </Text>
                </View>
      
                {/* Container pour les icônes avec espacement adaptatif */}
                <View style={[
                  styles.iconsContainer,
                  { gap: responsive.iconSpacing }
                ]}>
                  <TouchableOpacity onPress={() => navigation.navigate("CartTab")} style={styles.icon1Container}>
                    <Ionicons name="cart-outline" size={28} color="#F58320" />
                    {cartItemsCount > 0 && (
                      <Badge
                        value={cartItemsCount}
                        status="error"
                        containerStyle={{ position: 'absolute', top: -4, right: -4 }}
                        textStyle={{ fontSize: 10 }}
                      />
                    )}
                  </TouchableOpacity>
      
                  <TouchableOpacity onPress={() => navigation.navigate("SearchScreen")}>
                    <Ionicons name="search-outline" size={28} color="#F58320" />
                  </TouchableOpacity>
      
                  <TouchableOpacity onPress={() => navigation.navigate("OrderStatusScreen")} style={styles.icon1Container}>
                    <Ionicons name="bag-outline" size={28} color="#F58320" />
                    <Badge
                      // value={orders.length}
                      status="error"
                      containerStyle={{ position: 'absolute', top: -4, right: -4 }}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            <StatusBar barStyle="dark-content" />

      {viewMode === 'products' && (
        <>
        
        </>
      )}

      {viewMode === 'categories' ? (
        <>
          <View>
            {/* <Text style={[styles.subtitle, { color: theme.text }]}>
              Découvrez nos catégories
            </Text>
            <Text style={[styles.categoryCount, { color: '#F58320' }]}>
              {categories.length} catégories
            </Text> */}
          </View>
          
          <FlatList
          key="categories-horizontal"
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id.toString()}
          // horizontal
            showsVerticalScrollIndicator={false}

            contentContainerStyle={styles.categoriesList}
          // ItemSeparatorComponent={() => <View style={styles.categorySeparator} />}
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
          renderProductInModal={renderProductInModal}
          theme={theme}
          responsiveModal={responsiveModal}
        />
        </>
      ) : (
        <>
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
            placeholder="Rechercher un produit..."
            placeholderTextColor={theme.text}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

        </View>
        
        {/* Nouveau bouton */}
        <TouchableWithoutFeedback style={styles.icon1Container} onPress={() => setShowPrices(!showPrices)}>
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
{/* 
        <TouchableOpacity onPress={() => navigation.navigate("SearchScreen")}>
          <Ionicons name="search-outline" size={28} color="#F58320" />
        </TouchableOpacity> */}

        <TouchableOpacity onPress={() => navigation.navigate("OrderStatusScreen")} style={styles.icon1Container}>
          <Ionicons name="bag-outline" size={28} color="#F58320" />
          <Badge
            // value={orders.length}
            status="error"
            containerStyle={{ position: 'absolute', top: -4, right: -4 }}
          />
        </TouchableOpacity>
      </View>
          <Text style={[styles.resultsCount, { color: theme.text }]}>
            {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} dans {selectedCategory}
          </Text>

          <FlatList
            key={viewMode}
            data={filteredProducts}
            renderItem={renderProductInModal}
            keyExtractor={(item) => item.id.toString()}
            numColumns={responsive.isTablet ? 3 : 2} // Ici on adapte le nombre de colonnes
            columnWrapperStyle={[styles.productRow,
            { 
              paddingHorizontal: responsive.horizontalPadding,
              justifyContent: responsive.isLargeScreen ? 'flex-start' : 'space-between',
              marginBottom: -6, // Ajoutez cet espace entre les rangées
            }]}
            contentContainerStyle={styles.productList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#ccc" />
                <Text style={[styles.emptyText, 
                {
                  color: theme.text,
                  paddingHorizontal: responsive.horizontalPadding
                }]}>
                  Aucun produit trouvé
                </Text>
              </View>
            }
          />
        </>
      )}

      {renderShareModal()}
      
      {/* Overlay + Menu dropdown */}
      {menuVisible && (
        <>
          {/* Overlay pour fermer le menu en cliquant à côté */}
          <TouchableWithoutFeedback onPress={closeMenu}>
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 999,
            }} />
          </TouchableWithoutFeedback>

          {/* Menu dropdown - Style exact de l'image */}
          <View style={[
            styles.menuDropdown, 
            {
              position: 'absolute',
              top: 70,
              left: 0,
               
                height: 650,
                width: 250,
              backgroundColor: '#F8F9FA',
              borderTopRightRadius: 25,
              borderBottomRightRadius: 25,
              shadowColor: '#000',
              shadowOffset: {
                width: 3,
                height: 0,
              },
              shadowOpacity: 0.2,
              shadowRadius: 5,
              elevation: 8,
              zIndex: 1000,
            }
          ]}>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: 30,
              }}
              bounces={false}
            >
              {/* Accueil */}
              <TouchableWithoutFeedback onPress={() => handleNavigation('HomeStack')}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="home-outline" size={20} color="#6B7280" />
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                  }}>Accueil</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* Catégories */}
              <TouchableWithoutFeedback onPress={() => handleNavigation('CategoriesTab')}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="grid-outline" size={20} color="#6B7280" />
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                  }}>Catégories</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* Notifications */}
              <TouchableWithoutFeedback onPress={() => handleNavigation('NotificationsScreen')}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="notifications-outline" size={20} color="#6B7280" />
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                  }}>Notifications</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* Contacts */}
              <TouchableWithoutFeedback onPress={() => handleNavigation('ContactScreen')}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="people-outline" size={20} color="#6B7280" />
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                  }}>Contacts</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* Produits en solde */}
              <TouchableWithoutFeedback onPress={() => handleNavigation('HomeStack')}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="pricetag-outline" size={20} color="#6B7280" />
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                  }}>Produits en solde</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* Promouvoir */}
              <TouchableWithoutFeedback onPress={() => handleNavigation('HomeStack')}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="diamond-outline" size={20} color="#6B7280" />
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                  }}>Promouvoir</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* Message avec badge "new" */}
              <TouchableWithoutFeedback onPress={() => handleNavigation('MessagesScreen')}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                  }}>Message</Text>
                  <View style={{
                    backgroundColor: '#EF4444',
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    marginRight: 5,
                  }}>
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: '600',
                    }}>new</Text>
                  </View>
                </View>
              </TouchableWithoutFeedback>

              {/* Mon profil */}
              <TouchableWithoutFeedback onPress={() => handleNavigation('ProfileTab')}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="person-outline" size={20} color="#6B7280" />
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                  }}>Mon profil</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* Mode avec switch */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
              }}>
                <View style={{
                  width: 24,
                  height: 24,
                  marginRight: 15,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Ionicons name="contrast-outline" size={20} color="#6B7280" />
                </View>
                <Text style={{
                  fontSize: 16,
                  color: '#374151',
                  flex: 1,
                }}>Mode</Text>
                <Switch 
                  value={isDarkMode} 
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                  thumbColor={isDarkMode ? '#FFFFFF' : '#FFFFFF'}
                  ios_backgroundColor="#D1D5DB"
                  style={{
                    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }]
                  }}
                />
              </View>

              {/* Masquer/Afficher les prix */}
              <TouchableWithoutFeedback onPress={() => {
                setShowPrices(!showPrices);
                closeMenu();
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons name={showPrices ? "eye-outline" : "eye-off-outline"} size={20} color="#6B7280" />
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                  }}>{showPrices ? "Masquer les prix" : "Afficher les prix"}</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* Liste des produits */}
              <TouchableWithoutFeedback onPress={() => handleNavigation('ProductListScreen')}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="list-outline" size={20} color="#6B7280" />
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                  }}>Liste des produits</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* Envoyer plusieurs produits */}
              <TouchableWithoutFeedback onPress={() => handleNavigation('BulkUploadScreen')}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="cloud-upload-outline" size={20} color="#6B7280" />
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                  }}>Envoyer plusieurs produits</Text>
                </View>
              </TouchableWithoutFeedback>

              {/* Catalogue */}
              <TouchableWithoutFeedback onPress={() => handleNavigation('CatalogueScreen')}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="library-outline" size={20} color="#6B7280" />
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                  }}>Catalogue</Text>
                </View>
              </TouchableWithoutFeedback>

              
              
              {/* Guide*/}
              <TouchableWithoutFeedback onPress={() => handleNavigation('AppUsageGuideScreen')}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="sparkles-outline" size={20} color="#6B7280" />
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                  }}>Guide</Text>
                </View>
              </TouchableWithoutFeedback>

            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingVertical: 50,
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


  modalproductcard: {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 12,
  width: (screenWidth - 64) / 2, // Augmentez l'espace entre les colonnes
  height: 270, // Ajustez la hauteur pour plus d'espace
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  marginTop: 100, // Espace vertical
  marginHorizontal: 8, // Espace horizontal
  },

  
modalProductCard: {
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
  marginBottom: 30, // Espace vertical
  marginHorizontal: 8, // Espace horizontal
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
  modalProductImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  modalProductImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  modalShareButton: {
    position: 'absolute',
    bottom: 0,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 6,
  },
  modalStockIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  modalStockText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  modalProductInfo: {
    flex: 1,
  },
  modalProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modalProductCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  modalProductBrand: {
    fontSize: 12,
    color: '#F58320',
    marginBottom: 4,
  },
  modalProductPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F58320',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
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
    marginVertical: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#F58320',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  headerText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 20,
    opacity: 0.7,
  },
  
  // Styles pour les images
  imagePlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    zIndex: 1,
  },
  
  // Styles pour les catégories
  categoriesList: {
    paddingBottom: 20,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  categoryImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryOverlay: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#F58320',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryProductCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryProductText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryArrow: {
    marginLeft: 8,
  },
  
  // Styles pour les produits
  resultsCount: {
    fontSize: 14,
    marginTop: 40,
    fontWeight: '500',
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
  
  // Styles pour les états vides
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
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
  
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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


  productCard: {
  borderRadius: 12,
  padding: 12,
  marginBottom: 16, // Augmentez cette valeur pour plus d'espace vertical
  marginHorizontal: 8, // Ajoutez un espace horizontal
},

// Modifiez aussi le productRow pour ajuster l'espacement entre les colonnes
productRow: {
  justifyContent: 'space-between',
  paddingHorizontal: 8, // Réduisez cet espace si nécessaire
  marginBottom: 16, // Espace entre les rangées de produits
},

productImageContainer: {
  position: 'relative',
  borderRadius: 8,
  overflow: 'hidden',
  marginBottom: 8,
},

productImage: {
  width: '100%',
  borderRadius: 8,
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

stockText: {
  color: 'white',
  fontSize: 10,
  fontWeight: 'bold',
},

productInfo: {
  marginBottom: 12,
},

productName: {
  fontWeight: '600',
  marginBottom: 4,
},

productCategory: {
  opacity: 0.7,
  marginBottom: 2,
},

productCategoryParent: {
  fontWeight: '500',
  marginBottom: 4,
},

productPrice: {
  fontWeight: 'bold',
},


productList: {
  paddingBottom: 20,
},

fullScreenModal: {
    flex: 1,
    marginTop: 10,
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
    bottom: 0,
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



  
});

export default CategorieScreen;