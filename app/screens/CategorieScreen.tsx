import React, { useState, useEffect } from 'react';
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
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { getProducts, getProductsPage } from '../../services/apiService';
import { Product, ProductImage } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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
    isSmallScreen: width < 375,
    // Colonnes adaptatives
    productColumns: isLargeScreen ? 4 : isTablet ? 3 : 2,
    categoryColumns: isLargeScreen ? 6 : isTablet ? 5 : 4,
    // Padding adaptatif
    horizontalPadding: isTablet ? 30 : 20,
    verticalPadding: isTablet ? 25 : 15,
    // Tailles d'éléments
    cardWidth: isLargeScreen ? (width - 80) / 4 : isTablet ? (width - 70) / 3 : (width - 50) / 2,
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

const { width } = Dimensions.get('window');

type CategorieScreenProps = {
  navigation: any;
};

const CategorieScreen: React.FC<CategorieScreenProps> = ({ navigation }) => {
  const [categories, setCategories] = useState<Array<{ id: string; name: string; productCount: number; image?: string }>>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const responsive = getResponsiveDimensions();

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  useEffect(() => {
    const fetchAllProducts = async () => {
      console.log('Début du chargement des produits');
      if (!token) {
        console.log('Token non disponible');
        return;
      }

      try {
        setIsLoading(true);
        setLoadingError(null);
        
        let currentPage = 1;
        let hasMore = true;
        const products: Product[] = [];
        console.log('Initialisation chargement');

        while (hasMore) {
          try {
            const response = await getProductsPage(token, currentPage);
            
            if (!response.results || response.results.length === 0) {
              console.warn('Page vide reçue');
              break;
            }

            products.push(...response.results);
            hasMore = response.next !== null;
            currentPage++;
          } catch (error) {
            console.error(`Erreur page ${currentPage}:`, error);
            hasMore = false;
            throw error;
          }
        }

        console.log('Total produits:', products.length);
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
              image: product.images?.[0]?.image // Utiliser la première image du premier produit comme image de catégorie
            });
          }
        });
        
        setCategories(Array.from(categoryMap.values()));
      } catch (error) {
        console.error('Erreur globale:', error);
        setLoadingError('Échec du chargement des produits');
      } finally {
        console.log('Chargement terminé');
        setIsLoading(false);
      }
    };

    fetchAllProducts();
  }, [token]);

  
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
  
    // Fonction pour télécharger l'image localement
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
  
    const generateShareMessage = () => {
      if (!product) return '';
      
      let message = `🛍️ ${product.name}\n\n`;
      
      if (shareWithPrice) {
        const priceToUse = useCustomPrice ? customPrice : (product.prices[0]?.price || '0');
        message += `💰 Prix: ${formatPrice(priceToUse)} FCFA\n\n`;
      }
      
      if (shareWithDescription && product.description) {
        message += `📝 ${product.description}\n\n`;
      }
      
      message += `📱 Contactez-nous pour plus d'informations !`;
      
      return message;
    };
  
    const handleShare = async () => {
    if (!product) return;
  
    setIsSharing(true);
    
    try {
      const message = generateShareMessage();
      
      // Si l'utilisateur veut partager avec l'image
      if (shareWithImage && product.images && product.images.length > 0) {
        const imageUrl = getImageUri(product.images[0]?.image);
        
        if (imageUrl) {
          console.log('Tentative de partage avec image:', imageUrl);
          
          // Télécharger l'image localement
          const localImageUri = await downloadImageForSharing(imageUrl);
          
          if (localImageUri) {
            console.log('Partage avec image locale:', localImageUri);
            
            // Solution pour iOS et Android
            if (Platform.OS === 'ios') {
              // Sur iOS, on peut partager texte et image ensemble
              await Share.share({
                message: message,
                url: localImageUri,
              });
            } else {
              // Sur Android, on partage d'abord le texte puis l'image
              await Share.share({
                message: message,
              });
              // Petite pause pour laisser le premier partage se terminer
              await new Promise(resolve => setTimeout(resolve, 500));
              await Sharing.shareAsync(localImageUri);
            }
          } else {
            // Si le téléchargement échoue, partager seulement le texte
            await Share.share({
              title: product.name,
              message: message,
            });
          }
        } else {
          // Pas d'image disponible, partager seulement le texte
          await Share.share({
            title: product.name,
            message: message,
          });
        }
      } else {
        // Partager seulement le texte
        await Share.share({
          title: product.name,
          message: message,
        });
      }
      
      setShareModalVisible(false);
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      Alert.alert('Erreur', 'Impossible de partager le produit. Veuillez réessayer.');
    } finally {
      setIsSharing(false);
    }
  };
  
  const handleQuickShare = async () => {
    if (!product) return;
  
    try {
      const message = `🛍️ ${product.name}\n\n💰 Prix: ${formatPrice(product.prices[0]?.price || '0')} FCFA\n\n${product.description ? `📝 ${product.description}\n\n` : ''}📱 Contactez-nous pour plus d'informations !`;
      
      // Inclure l'image si disponible
      if (product.images && product.images.length > 0) {
        const imageUrl = getImageUri(product.images[0]?.image);
        if (imageUrl) {
          const localImageUri = await downloadImageForSharing(imageUrl);
          
          if (localImageUri) {
            if (Platform.OS === 'ios') {
              await Share.share({
                message: message,
                url: localImageUri,
              });
            } else {
              await Share.share({ message: message });
              await new Promise(resolve => setTimeout(resolve, 500));
              await Sharing.shareAsync(localImageUri);
            }
          } else {
            await Share.share({
              title: product.name,
              message: message,
            });
          }
        } else {
          await Share.share({
            title: product.name,
            message: message,
          });
        }
      } else {
        await Share.share({
          title: product.name,
          message: message,
        });
      }
    } catch (error) {
      console.error('Erreur lors du partage rapide:', error);
      Alert.alert('Erreur', 'Impossible de partager le produit.');
    }
  };
  
    const openShareModal = () => {
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
  
                {/* Aperçu du produit */}
                <View style={styles.productPreview}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Aperçu du produit
                  </Text>
                  <View style={[styles.productPreviewCard, { 
                    backgroundColor: theme.background, 
                    borderColor: theme.text + '20' 
                  }]}>
                    {shareWithImage && product.images && product.images.length > 0 && (
                      <Image 
                        source={{ uri: getImageUri(product.images[0]?.image) }}
                        style={styles.previewImage}
                        defaultSource={require('../../assets/images/baraka_icon.png')}
                      />
                    )}
                    <View style={styles.productPreviewInfo}>
                      <Text style={[styles.previewProductName, { color: theme.text }]}>
                        {product.name}
                      </Text>
                      {shareWithPrice && (
                        <Text style={[styles.previewPrice, { color: '#F58320' }]}>
                          {formatPrice(useCustomPrice ? customPrice : originalPrice)} FCFA
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
  
                {/* Aperçu du message */}
                <View style={styles.previewSection}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Message à partager
                  </Text>
                  <View style={[styles.previewBox, { 
                    backgroundColor: theme.background, 
                    borderColor: theme.text + '20' 
                  }]}>
                    <Text style={[styles.previewText, { color: theme.text }]}>
                      {generateShareMessage()}
                    </Text>
                  </View>
                </View>
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
                  style={[styles.shareModalButton, { opacity: isSharing ? 0.7 : 1 }]}
                  onPress={handleShare}
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="share" size={20} color="white" />
                  )}
                  <Text style={styles.shareModalButtonText}>
                    {isSharing ? 'Partage...' : 'Partager'}
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

  const handleShareProduct = async (product: Product) => {
    try {
      await Share.share({
        message: `Découvrez ce produit: ${product.name} - ${formatPrice(product.prices[0]?.price)} FCFA\n\nDisponible sur l'application Barakasn`,
        title: `Partager ${product.name}`
      });
    } catch (error) {
      console.error('Erreur lors du partage:', error);
    }
  };

  const handleCategoryPress = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setViewMode('products');
    const categoryProducts = allProducts.filter(product => product.category.name === categoryName);
    setProducts(categoryProducts);
  };

  const handleBackToCategories = () => {
    setViewMode('categories');
    setSelectedCategory(null);
    setSearchQuery('');
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });
    const [showPrices, setShowPrices] = useState(true);
  

  const renderCategory = ({ item }: { item: { id: string; name: string; productCount: number; image?: string } }) => {
    return (
      <TouchableOpacity
        style={[styles.categoryCard, { backgroundColor: theme.background }]}
        onPress={() => handleCategoryPress(item.name)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryImageContainer}>
         
            <View style={[styles.categoryImagePlaceholder, { backgroundColor: '#F58320' }]}>
              <Ionicons name="grid" size={40} color="white" />
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
        
        <View style={styles.categoryArrow}>
          <Ionicons name="chevron-forward" size={20} color="#F58320" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const quantity = productQuantities[item.id] || 0;
    const stockStatus = item.stock === 0;
    const productImage = item.images?.[0]?.image;
    const productPrice = getPriceByCriterion(item);

    return (
      <TouchableOpacity
        style={[styles.productCard, 
          { 
            backgroundColor: theme.background,
            width: responsive.cardWidth,
            margin: responsive.itemSpacing / 4,
            shadowColor: theme.background,
            elevation: 3
          }]}
        onPress={() => navigation.navigate('ProductDetailScreen', { productId: item.id })}
      >
        <View style={styles.productImageContainer}>
          {productImage ? (
            <Image
              source={{ uri: `https://backend.barakasn.com${productImage}` }} // Ajoutez votre URL de base ici
              style={[styles.productImage,
              { height: responsive.productImageHeight }]}
              resizeMode="cover"
            />
          ) : (
            <Image
              source={require('../../assets/images/baraka_icon.png')}
              style={[styles.productImage,
              { height: responsive.productImageHeight }]}
              resizeMode="cover"
            />
          )}
          
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={openShareModal}
          >
            <Ionicons name="share-social" size={20} color="#F58320" />
          </TouchableOpacity>

          <View style={[
            styles.stockIndicator,
            { 
              backgroundColor: stockStatus ? '#FF3B30' : '#34C759',
            }
          ]}>
            <Text style={styles.stockText}>
              {stockStatus ? 'RUPTURE' : 'EN STOCK'}
            </Text>
          </View>
        </View> 

        <View style={[styles.productInfo]}>
          <Text style={[styles.productName, 
            { 
              color: theme.text,
              fontSize: responsive.bodyFontSize
            }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.productCategory, 
            { 
              color: theme.text,
              fontSize: responsive.captionFontSize
            }]}>
            {item.category.name}
          </Text>
          <Text style={[styles.productCategoryParent, 
            { 
              color: '#F58320',
              fontSize: responsive.captionFontSize
            }]}>
            {item.category.parent_info.name} - {item.brand?.name || 'Marque non spécifiée'}
          </Text>
          <Text style={[
            styles.productPrice, 
            { 
              color: '#F58320',
              fontSize: responsive.bodyFontSize,
              fontWeight: 'bold',
            }
          ]}>
            {showPrices 
              ? productPrice ? `${formatPrice(productPrice.price)} FCFA` : 'Prix non disponible'
              : ' '}
          </Text>
        </View>

        <View style={styles.quantityControls}>
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              updateQuantity(item.id, false);
            }}
            disabled={quantity <= 0}
          >
            <Ionicons 
              name="remove-circle" 
              size={24} 
              color={quantity > 0 ? '#F58320' : '#ccc'} 
            />
          </TouchableOpacity>

          <Text style={[styles.quantityText, { color: theme.text }]}>
            {quantity}
          </Text>

          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              updateQuantity(item.id, true);
            }}
          >
            <Ionicons name="add-circle" size={24} color="#F58320" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.addButton, 
            { 
              backgroundColor: quantity > 0 ? '#F58320' : '#ccc',
              opacity: quantity > 0 ? 1 : 0.6
            }
          ]}
          onPress={() => addToCart(item)}
          disabled={isAddingToCart || quantity <= 0}
        >
          {isAddingToCart ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.addButtonText}>
              {quantity > 0 ? `Ajouter (${quantity})` : 'Ajouter'}
            </Text>
          )}
        </TouchableOpacity>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header,
          { 
            height: responsive.headerHeight,
            paddingHorizontal: responsive.horizontalPadding
          }]}>
        <TouchableOpacity 
          onPress={viewMode === 'categories' ? () => navigation.goBack() : handleBackToCategories}
        >
          <Ionicons name="arrow-back" size={24} color="#F58320" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {viewMode === 'categories' ? 'Nos Catégories' : selectedCategory}
        </Text>
      </View>

      {viewMode === 'products' && (
        <>
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
        <TextInput
          style={[
            styles.searchInput, 
            { 
              backgroundColor: theme.background,
              color: theme.text,
              borderColor: theme.header?.background || '#F58320'
            }
          ]}
          placeholder="Rechercher un produit..."
          placeholderTextColor={theme.text}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        </>
      )}

      {viewMode === 'categories' ? (
        <>
          <Text style={[styles.subtitle, { color: theme.text }]}>
            Découvrez nos {categories.length} catégories de produits
          </Text>
          
          <FlatList
            key="categories"
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.categoriesList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="grid-outline" size={64} color="#ccc" />
                <Text style={[styles.emptyText, { color: theme.text }]}>
                  Aucune catégorie disponible
                </Text>
              </View>
            }
          />
        </>
      ) : (
        <>
          <Text style={[styles.resultsCount, { color: theme.text }]}>
            {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} dans {selectedCategory}
          </Text>

          <FlatList
            key={viewMode}
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            numColumns={responsive.isTablet ? 3 : 2} // Ici on adapte le nombre de colonnes
            columnWrapperStyle={styles.productRow}
            contentContainerStyle={styles.productList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#ccc" />
                <Text style={[styles.emptyText, { color: theme.text }]}>
                  Aucun produit trouvé
                </Text>
              </View>
            }
          />
        </>
      )}
      {renderShareModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingVertical: 50,
  },

  productList: {
    paddingBottom: 16,
    alignItems: 'center', // Pour centrer les cartes sur les grands écrans
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 50,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    opacity: 0.7,
  },
  searchInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    fontSize: 16,
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
    marginBottom: 12,
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
    marginBottom: 12,
    fontWeight: '500',
  },
  productImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  productInfo: {
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    marginBottom: 4,
  },
  productCategoryParent: {
    fontSize: 12,
    marginBottom: 4,
    color: '#F58320',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
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
  stockIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    maxHeight: '70%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
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
  
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default CategorieScreen;