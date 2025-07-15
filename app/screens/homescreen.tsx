/**
 * Ce fichier définit l'écran d'accueil de l'application adaptatif.
 * Il s'adapte automatiquement aux différentes tailles d'écran.
 *
 * @module HomeScreen
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
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
  Platform,
  StatusBar,
  Modal,
  Linking,
  TextInput
} from 'react-native';
import { Icon, Badge } from 'react-native-elements';
import { Ionicons } from '@expo/vector-icons';
import { usersData } from '../../data/userData';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../../services/types';
import { getProducts, getProductsPage } from '../../services/apiService';

import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
// import { Platform } from 'react-native';
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

const { width: screenWidth } = Dimensions.get('window');

type HomeScreenProps = {
  navigation: any;
};

// Types pour la modal
interface CategoryData {
  id: string;
  name: string;
  productCount: number;
  image?: string;
}


const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const responsive = getResponsiveDimensions();
  const [menuVisible, setMenuVisible] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; productCount: number; image?: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'categories' | 'products'>('categories');
  const [product, setProduct] = useState<Product | null>(null);
  const { isDarkMode, toggleTheme } = useTheme();
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [showPrices, setShowPrices] = useState(true);
  const [userData, setUserData] = useState(null);
  const [count, setCount] = useState(0);
  const [orders, setOrders] = useState([]);
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
    const [shareMethod, setShareMethod] = useState<'whatsapp' | 'general'>('general');
  
  
    // États pour le carrousel d'images
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
  
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });


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
        
        let currentPage = 1;
        let hasMore = true;
        const products: Product[] = [];

        while (hasMore) {
          try {
            const response = await getProductsPage(token, currentPage);
            
            if (!response.results || response.results.length === 0) {
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
        
        setCategories(Array.from(categoryMap.values()));
      } catch (error) {
        console.error('Erreur globale:', error);
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

  const getPriceByCriterion = (product: Product) => {
    return product.prices[0];
  };

  // Composant renderProductCard adapté avec dimensions responsives
  const renderPopularProductCard = ({ item }: { item: Product }) => {
    const stockStatus = item.stock === 0;
    const productImage = item.images?.[0]?.image;
    const productPrice = getPriceByCriterion(item);
      
    return (
      <TouchableOpacity
        style={[
          styles.productCard, 
          { 
            backgroundColor: theme.background,
            width: responsive.cardWidth,
            margin: responsive.itemSpacing / 4,
            shadowColor: theme.background,
            elevation: 3
          }
        ]}
        onPress={() => navigation.navigate('ProductDetailScreen', { productId: item.id })}
      >
        {productImage ? (
          <Image
            source={{ uri: `https://backend.barakasn.com${productImage}` }}
            style={[
              styles.productImage,
              { height: responsive.productImageHeight }
            ]}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={require('../../assets/images/baraka_icon.png')}
            style={[
              styles.productImage,
              { height: responsive.productImageHeight }
            ]}
            resizeMode="cover"
          />
        )}
        
        {/* <TouchableOpacity 
          style={styles.shareButton}
          
          onPress={openShareModal}
        >
          <Ionicons name="share-social" size={20} color="#F58320" />
        </TouchableOpacity> */}

        <View style={styles.productInfo}>
          <Text style={[
            styles.productName, 
            { 
              color: theme.text,
              fontSize: responsive.bodyFontSize
            }
          ]} 
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <Text style={[
            styles.productCategory, 
            { 
              color: theme.text,
              fontSize: responsive.captionFontSize
            }
          ]}>
            {item.category.name}
          </Text>
          
          <Text style={[
            styles.productCategoryParent, 
            { 
              color: '#F58320',
              fontSize: responsive.captionFontSize
            }
          ]}>
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
              : ''}
          </Text>
        </View>

        {/* Indicateur de stock */}
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
      </TouchableOpacity>
    );
  };

  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };

  const closeMenu = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
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
    
    // Si l'image est déjà une URL complète
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Si le chemin commence par /media/
    if (imagePath.startsWith('/media/')) {
      return `https://backend.barakasn.com${imagePath}`;
    }
    
    // Si le chemin contient product_iamges (avec la faute de frappe)
    if (imagePath.includes('product_iamges')) {
      return `https://backend.barakasn.com/media/${imagePath}`;
    }
    
    // Par défaut, on suppose que c'est un chemin relatif dans /media/
    return `https://backend.barakasn.com/media/${imagePath}`;
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

  // Récupérer le token au chargement
  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  // Récupérer le nombre d'articles dans le panier
  const fetchCartCount = async () => {
    try {
      const response = await fetch('https://backend.barakasn.com/api/v0/orders/orders/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch cart');

      const cartData = await response.json();
      setCount(cartData.items ? cartData.items.length : 0);
    } catch (err) {
      console.error('Error fetching cart:', err);
      setCount(0);
    }
  };

  // Charger les données utilisateur et le panier
  useEffect(() => {
    if (token) {
      fetchCartCount();
    }
  }, [token]);


  const updateQuantity = (productId: string, increment: boolean) => {
    setProductQuantities(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + (increment ? 1 : -1));
      return { ...prev, [productId]: newQty };
    });
  };

  
    const addToCart = async (product_id: string) => {
      if (!token) {
        Alert.alert('Connexion requise', 'Veuillez vous connecter');
        navigation.navigate('Login');
        return;
      }
    
      const quantity = productQuantities[product_id] || 1;
      if (quantity < 1) return;
    
      setIsAddingToCart(true);
    
      try {
        const productIdNum = parseInt(product_id, 10);
        if (isNaN(productIdNum)) {
          throw new Error('ID de produit invalide');
        }
    
        const payload = {
          products: [{
            product_id: productIdNum,
            quantity: quantity
          }]
        };
    
        const response = await fetch('https://backend.barakasn.com/api/v0/orders/orders/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
        });
    
        const responseData = await response.json();
    
        if (!response.ok) {
          throw new Error(
            responseData.detail || 
            responseData.message || 
            `Erreur ${response.status}`
          );
        }
    
        Alert.alert('Succès', 'Produit ajouté au panier');
        setProductQuantities(prev => ({ ...prev, [product_id]: 0 }));
    
      } catch (error) {
        const errorMessage = (error instanceof Error && error.message) ? error.message : "Erreur lors de l'ajout au panier";
        Alert.alert('Erreur', errorMessage);
      } finally {
        setIsAddingToCart(false);
      }
    };

    // Fonction pour naviguer vers une image spécifique
      const goToImage = (index: number) => {
        setCurrentImageIndex(index);
        scrollViewRef.current?.scrollTo({
          x: index * screenWidth,
          animated: true
        });
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
    
      // Fonction pour partager via WhatsApp
      const shareViaWhatsApp = async () => {
        if (!product) return;
    
        setIsSharing(true);
        
        try {
          const message = generateUnifiedShareMessage();
          
          if (shareWithImage && product.images && product.images.length > 0) {
            const imageUrl = getImageUri(product.images[currentImageIndex]?.image);
            
            if (imageUrl) {
              const localImageUri = await downloadImageForSharing(imageUrl);
              
              if (localImageUri) {
                // Partager l'image d'abord
                await Sharing.shareAsync(localImageUri, {
                  mimeType: 'image/jpeg',
                  dialogTitle: 'Partager via WhatsApp',
                });
                
                // Attendre un peu puis partager le texte
                setTimeout(() => {
                  const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
                  Linking.openURL(whatsappUrl).catch(() => {
                    // Si WhatsApp n'est pas installé, utiliser le partage général
                    Share.share({ message });
                  });
                }, 1000);
              } else {
                // Partager seulement le texte via WhatsApp
                const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
                Linking.openURL(whatsappUrl).catch(() => {
                  Share.share({ message });
                });
              }
            }
          } else {
            // Partager seulement le texte via WhatsApp
            const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
            Linking.openURL(whatsappUrl).catch(() => {
              Share.share({ message });
            });
          }
          
          setShareModalVisible(false);
        } catch (error) {
          console.error('Erreur lors du partage WhatsApp:', error);
          Alert.alert('Erreur', 'Impossible de partager via WhatsApp. Veuillez réessayer.');
        } finally {
          setIsSharing(false);
        }
      };
    
      // Fonction pour partage général
      const shareGeneral = async () => {
        if (!product) return;
    
        setIsSharing(true);
        
        try {
          const message = generateUnifiedShareMessage();
          
          if (shareWithImage && product.images && product.images.length > 0) {
            const imageUrl = getImageUri(product.images[currentImageIndex]?.image);
            
            if (imageUrl) {
              const localImageUri = await downloadImageForSharing(imageUrl);
              
              if (localImageUri) {
                if (Platform.OS === 'ios') {
                  // Sur iOS, partager texte et image ensemble
                  await Share.share({
                    message: message,
                    url: localImageUri,
                    title: product.name,
                  });
                } else {
                  // Sur Android, partager l'image d'abord
                  await Sharing.shareAsync(localImageUri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: 'Partager le produit',
                  });
                  
                  // Puis partager le texte
                  setTimeout(async () => {
                    await Share.share({
                      message: message,
                      title: product.name,
                    });
                  }, 1000);
                }
              } else {
                await Share.share({
                  message: message,
                  title: product.name,
                });
              }
            }
          } else {
            await Share.share({
              message: message,
              title: product.name,
            });
          }
          
          setShareModalVisible(false);
        } catch (error) {
          console.error('Erreur lors du partage général:', error);
          Alert.alert('Erreur', 'Impossible de partager le produit. Veuillez réessayer.');
        } finally {
          setIsSharing(false);
        }
      };
    
      // Fonction pour partage rapide (avec toutes les informations)
      const handleQuickShare = async () => {
        if (!product) return;
    
        try {
          const message = `🛍️ *${product.name}*\n\n💰 *Prix:* ${formatPrice(product.prices[0]?.price || '0')} FCFA\n\n${product.description ? `📝 *Description:* ${product.description}\n\n` : ''}📱 *Contactez-nous pour plus d'informations !*`;
          
          if (product.images && product.images.length > 0) {
            const imageUrl = getImageUri(product.images[currentImageIndex]?.image);
            if (imageUrl) {
              const localImageUri = await downloadImageForSharing(imageUrl);
              
              if (localImageUri) {
                if (Platform.OS === 'ios') {
                  await Share.share({
                    message: message,
                    url: localImageUri,
                    title: product.name,
                  });
                } else {
                  await Sharing.shareAsync(localImageUri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: 'Partager le produit',
                  });
                  
                  setTimeout(async () => {
                    await Share.share({
                      message: message,
                      title: product.name,
                    });
                  }, 500);
                }
              } else {
                await Share.share({
                  message: message,
                  title: product.name,
                });
              }
            }
          } else {
            await Share.share({
              message: message,
              title: product.name,
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
                    {/* Méthode de partage */}
                    <View style={styles.shareMethodSection}>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        Méthode de partage
                      </Text>
                      
                      <View style={styles.shareMethodButtons}>
                        <TouchableOpacity 
                          style={[
                            styles.shareMethodButton,
                            shareMethod === 'whatsapp' && styles.shareMethodButtonActive
                          ]}
                          onPress={() => setShareMethod('whatsapp')}
                        >
                          <Ionicons 
                            name="logo-whatsapp" 
                            size={20} 
                            color={shareMethod === 'whatsapp' ? 'white' : '#25D366'} 
                          />
                          <Text style={[
                            styles.shareMethodButtonText,
                            shareMethod === 'whatsapp' && styles.shareMethodButtonTextActive
                          ]}>
                            WhatsApp
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[
                            styles.shareMethodButton,
                            shareMethod === 'general' && styles.shareMethodButtonActive
                          ]}
                          onPress={() => setShareMethod('general')}
                        >
                          <Ionicons 
                            name="share-social" 
                            size={20} 
                            color={shareMethod === 'general' ? 'white' : '#F58320'} 
                          />
                          <Text style={[
                            styles.shareMethodButtonText,
                            shareMethod === 'general' && styles.shareMethodButtonTextActive
                          ]}>
                            Général
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
      
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
                        styles.shareModalButton,
                        { 
                          backgroundColor: shareMethod === 'whatsapp' ? '#25D366' : '#F58320',
                          opacity: isSharing ? 0.7 : 1 
                        }
                      ]}
                      onPress={shareMethod === 'whatsapp' ? shareViaWhatsApp : shareGeneral}
                      disabled={isSharing}
                    >
                      {isSharing ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Ionicons 
                          name={shareMethod === 'whatsapp' ? "logo-whatsapp" : "share"} 
                          size={20} 
                          color="white" 
                        />
                      )}
                      <Text style={styles.shareModalButtonText}>
                        {isSharing ? 'Partage...' : 
                         shareMethod === 'whatsapp' ? 'Partager via WhatsApp' : 'Partager'
                        }
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

// Composant de rendu des produits avec design amélioré
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
            source={{ uri: `https://backend.barakasn.com${productImage}` }}
            style={[styles.productImage, { height: responsive.productImageHeight }]}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={require('../../assets/images/baraka_icon.png')}
            style={[styles.productImage, { height: responsive.productImageHeight }]}
            resizeMode="cover"
          />
        )}
        
        <TouchableOpacity style={styles.shareButton}
          onPress={openShareModal}>
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

      <View style={styles.productInfo}>
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
    </TouchableOpacity>
  );
};
    

// État pour la modal
const [modalVisible, setModalVisible] = useState<boolean>(false);
const [selectedCategoryData, setSelectedCategoryData] = useState<CategoryData | null>(null);
const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);


// Fonction modifiée pour gérer le clic sur la catégorie
const handleCategoryPress = (categoryName: string) => {
  const filteredProducts = allProducts.filter(product => product.category.name === categoryName);
  const categoryInfo = categories.find(cat => cat.name === categoryName);
  
  if (categoryInfo) {
    setSelectedCategoryData(categoryInfo);
    setCategoryProducts(filteredProducts);
    setModalVisible(true);
  }
};

// Composant Modal pour afficher les produits de la catégorie
const CategoryModal = () => {
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#F58320" />
        
        {/* Header de la modal */}
        <View style={styles.modalCategorieHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          
          <View style={styles.modalHeaderContent}>
            <Text style={styles.modalCategorieTitle}>
              {selectedCategoryData?.name}
            </Text>
            <Text style={styles.modalSubtitle}>
              {categoryProducts.length} produit{categoryProducts.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Contenu de la modal */}
        <View style={styles.modalCategorieContent}>
          {categoryProducts.length > 0 ? (
            <FlatList
              data={categoryProducts}
              renderItem={renderProductInModal}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.modalProductRow}
              contentContainerStyle={styles.modalProductList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.modalProductSeparator} />}
            />
          ) : (
            <View style={styles.emptyModalContainer}>
              <Ionicons name="cube-outline" size={64} color="#ccc" />
              <Text style={styles.emptyModalText}>
                Aucun produit disponible dans cette catégorie
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

  return (
    <TouchableOpacity
      style={styles.modalProductCard}
      onPress={() => {
        setModalVisible(false);
        navigation.navigate('ProductDetailScreen', { productId: item.id });
      }}
    >
      <View style={styles.modalProductImageContainer}>
        {productImage ? (
          <Image
            source={{ uri: `https://backend.barakasn.com${productImage}` }}
            style={styles.modalProductImage}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={require('../../assets/images/baraka_icon.png')}
            style={styles.modalProductImage}
            resizeMode="cover"
          />
        )}
        
        <TouchableOpacity style={styles.modalShareButton}>
          <Ionicons name="share-social" size={18} color="#F58320" />
        </TouchableOpacity>

        <View style={[
          styles.modalStockIndicator,
          { 
            backgroundColor: stockStatus ? '#FF3B30' : '#34C759',
          }
        ]}>
          <Text style={styles.modalStockText}>
            {stockStatus ? 'RUPTURE' : 'EN STOCK'}
          </Text>
        </View>
      </View> 

      <View style={styles.modalProductInfo}>
        <Text style={styles.modalProductName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.modalProductCategory}>
          {item.category.name}
        </Text>
        <Text style={styles.modalProductBrand}>
          {item.brand?.name || 'Marque non spécifiée'}
        </Text>
        <Text style={styles.modalProductPrice}>
          {showPrices 
            ? productPrice ? `${formatPrice(productPrice.price)} FCFA` : 'Prix non disponible'
            : ' '}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
  return (
    <TouchableWithoutFeedback onPress={closeMenu}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Barre des tâches fixe en haut */}
        <View style={[
          styles.header,
          { 
            height: responsive.headerHeight,
            paddingHorizontal: responsive.horizontalPadding
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

          <TouchableOpacity onPress={() => navigation.navigate("CartTab")} style={styles.icon1Container}>
            <Ionicons name="cart-outline" size={28} color="#F58320" />
            <Badge
              // value={orders.length}
              status="error"
              containerStyle={{ position: 'absolute', top: -4, right: -4 }}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("ScanTab")}>
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

        {/* Contenu scrollable avec padding pour le header */}
        <ScrollView 
          style={{ flex: 1, paddingTop: responsive.headerHeight }}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={closeMenu}
        >
          {/* Bannière des nouveaux bijoux */}
          <TouchableOpacity 
            style={[
              styles.banner, 
              {
                backgroundColor: theme.header.backgroundColor,
                height: responsive.bannerHeight,
                margin: responsive.horizontalPadding,
                borderRadius: 12
              }
            ]} 
            onPress={() => navigation.navigate("CategoriesTab")}
          >
            <View style={styles.bannerContent}>
              <View>
                <Text style={[
                  styles.bannerTitle, 
                  {
                    color: '#8b4513',
                    fontSize: responsive.titleFontSize
                  }
                ]}>
                  Nouveaux Bijoux
                </Text>
                <Text style={[
                  styles.bannerSubtitle, 
                  {
                    color: '#a0522d',
                    fontSize: responsive.subtitleFontSize
                  }
                ]}>
                  Collection Printemps 2024
                </Text>
              </View>
              <Image 
                source={require('../../assets/images/jewelry.jpg')} 
                style={[
                  styles.bannerImage,
                  { 
                    width: responsive.isTablet ? 150 : 120,
                    height: responsive.isTablet ? 150 : 120
                  }
                ]} 
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>

          {/* Pub & Promos */}
          <AutoScrollingCarousel />

          {/* Notification */}
          <NotificationBanner />

          {/* Catégories */}
          {/* <View style={[
            styles.section,
            { 
              marginBottom: responsive.sectionSpacing,
              paddingHorizontal: responsive.horizontalPadding
            }
          ]}>

             */}
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
                <CategoryModal />
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
                    data={filteredProducts}
                    renderItem={renderProduct}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    columnWrapperStyle={styles.productRow}
                    contentContainerStyle={styles.productList}
                    showsVerticalScrollIndicator={false}
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
          {/* </View> */}

          {/* Produits populaires */}
          <FlatList
            data={allProducts}
            renderItem={renderPopularProductCard}
            keyExtractor={(item) => item.id.toString()}
            numColumns={responsive.productColumns}
            columnWrapperStyle={[
              styles.productRow,
              { 
                paddingHorizontal: responsive.horizontalPadding,
                justifyContent: responsive.isLargeScreen ? 'flex-start' : 'space-between'
              }
            ]}
            contentContainerStyle={styles.productList}
            ListEmptyComponent={
              <Text style={[
                styles.errorText, 
                {
                  color: theme.text,
                  paddingHorizontal: responsive.horizontalPadding
                }
              ]}>
                Aucun produit disponible
              </Text>
            }
          />
        </ScrollView>

        {/* Menu dropdown */}
        {menuVisible && (
          <View style={[
            styles.menuDropdown, 
            {
              top: responsive.headerHeight,
              maxHeight: responsive.height * 0.85,
              backgroundColor: theme.header.backgroundColor,
            }
          ]}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.menuScrollContent}
              style={styles.menuScrollContainer}
              bounces={true}
              scrollEventThrottle={16}
            >
              {/* Section Navigation principale */}
              <View style={styles.menuSection}>
                  <Text style={[
                    styles.sectionTitle, 
                    {color: theme.header.text}
                  ]}>
                    Navigation
                  </Text>
                  
                  <TouchableWithoutFeedback onPress={() => navigation.navigate('HomeStack')}>
                      <View style={[styles.menuItem, styles.animatedItem]}>
                          <View style={[styles.iconContainer, {backgroundColor: theme.text + '20'}]}>
                              <Ionicons name="home-outline" size={20} color={theme.text} />
                          </View>
                          <Text style={[styles.menuText, {color: theme.header.text}]}>Accueil</Text>
                          <Ionicons name="chevron-forward" size={16} color={theme.header.text + '60'} />
                      </View>
                  </TouchableWithoutFeedback>
                  
                  <TouchableWithoutFeedback onPress={() => navigation.navigate('CategoriesTab')}>
                      <View style={[styles.menuItem, styles.animatedItem]}>
                          <View style={[styles.iconContainer, {backgroundColor: theme.text + '20'}]}>
                              <Ionicons name="grid-outline" size={20} color={theme.text} />
                          </View>
                          <Text style={[styles.menuText, {color: theme.header.text}]}>Catégories</Text>
                          <Ionicons name="chevron-forward" size={16} color={theme.header.text + '60'} />
                      </View>
                  </TouchableWithoutFeedback>
                  
                  <TouchableWithoutFeedback onPress={() => navigation.navigate('NotificationsScreen')}>
                      <View style={[styles.menuItem, styles.animatedItem]}>
                          <View style={[styles.iconContainer, {backgroundColor: theme.text + '20'}]}>
                              <Ionicons name="notifications-outline" size={20} color={theme.text} />
                          </View>
                          <Text style={[styles.menuText, {color: theme.header.text}]}>Notifications</Text>
                          <View style={styles.notificationBadge}>
                              <Text style={styles.badgeText}></Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={theme.header.text + '60'} />
                      </View>
                  </TouchableWithoutFeedback>
                  
                  <TouchableWithoutFeedback onPress={() => navigation.navigate('ContactScreen')}>
                      <View style={[styles.menuItem, styles.animatedItem]}>
                          <View style={[styles.iconContainer, {backgroundColor: theme.text + '20'}]}>
                              <Ionicons name="call-outline" size={20} color={theme.text} />
                          </View>
                          <Text style={[styles.menuText, {color: theme.header.text}]}>Contacts</Text>
                          <Ionicons name="chevron-forward" size={16} color={theme.header.text + '60'} />
                      </View>
                  </TouchableWithoutFeedback>
                  
                  <TouchableWithoutFeedback onPress={() => navigation.navigate('ProfileTab')}>
                      <View style={[styles.menuItem, styles.animatedItem]}>
                          <View style={[styles.iconContainer, {backgroundColor: theme.text + '20'}]}>
                              <Ionicons name="person-outline" size={20} color={theme.text} />
                          </View>
                          <Text style={[styles.menuText, {color: theme.header.text}]}>Mon Profil</Text>
                          <Ionicons name="chevron-forward" size={16} color={theme.header.text + '60'} />
                      </View>
                  </TouchableWithoutFeedback>
              </View>
              
              {/* Section Paramètres */}
              <View style={styles.menuSection}>
                  <Text style={[styles.sectionTitle, {color: theme.header.text}]}>Paramètres</Text>
                  
                  {/* Mode sombre avec animation */}
                  <View style={[styles.menuItem, styles.switchItem]}>
                      <View style={styles.switchLeft}>
                          <View style={[styles.iconContainer, {backgroundColor: theme.text + '20'}]}>
                              <Ionicons name="moon-outline" size={20} color={theme.text} />
                          </View>
                          <Text style={[styles.menuText, {color: theme.header.text}]}>Mode Sombre</Text>
                      </View>
                      <Switch 
                          value={isDarkMode} 
                          onValueChange={toggleTheme}
                          trackColor={{ false: '#E0E0E0', true: theme.text }}
                          thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
                          ios_backgroundColor="#E0E0E0"
                      />
                  </View>

                  {/* Affichage des prix */}
                  <TouchableWithoutFeedback onPress={() => setShowPrices(!showPrices)}>
                      <View style={[styles.menuItem, styles.animatedItem]}>
                          <View style={[styles.iconContainer, {backgroundColor: theme.text + '20'}]}>
                              <Ionicons 
                                  name={showPrices ? 'eye-off' : 'eye'} 
                                  size={20} 
                                  color={theme.text}
                              />
                          </View>
                          <Text style={[styles.menuText, {color: theme.header.text}]}>
                              {showPrices ? "Masquer les prix" : "Afficher les prix"}
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color={theme.header.text + '60'} />
                      </View>
                  </TouchableWithoutFeedback>
              </View>
              
              {/* Section Gestion */}
              <View style={styles.menuSection}>
                  <Text style={[styles.sectionTitle, {color: theme.header.text}]}>Gestion</Text>
                  
                  <TouchableWithoutFeedback onPress={() => navigation.navigate('ProductListScreen')}>
                      <View style={[styles.menuItem, styles.animatedItem]}>
                          <View style={[styles.iconContainer, {backgroundColor: theme.text + '20'}]}>
                              <Ionicons name="list-outline" size={20} color={theme.text} />
                          </View>
                          <Text style={[styles.menuText, {color: theme.header.text}]}>Liste des produits</Text>
                          <Ionicons name="chevron-forward" size={16} color={theme.header.text + '60'} />
                      </View>
                  </TouchableWithoutFeedback>
                  
                  <TouchableWithoutFeedback onPress={() => navigation.navigate('BulkUploadScreen')}>
                      <View style={[styles.menuItem, styles.animatedItem]}>
                          <View style={[styles.iconContainer, {backgroundColor: theme.text + '20'}]}>
                              <Ionicons name="cloud-upload-outline" size={20} color={theme.text} />
                          </View>
                          <Text style={[styles.menuText, {color: theme.header.text}]}>Envoyer plusieurs produits</Text>
                          <Ionicons name="chevron-forward" size={16} color={theme.header.text + '60'} />
                      </View>
                  </TouchableWithoutFeedback>
                  
                  <TouchableWithoutFeedback onPress={() => navigation.navigate('CatalogueScreen')}>
                      <View style={[styles.menuItem, styles.animatedItem]}>
                          <View style={[styles.iconContainer, {backgroundColor: theme.text + '20'}]}>
                              <Ionicons name="book-outline" size={20} color={theme.text} />
                          </View>
                          <Text style={[styles.menuText, {color: theme.header.text}]}>Catalogue</Text>
                          <Ionicons name="chevron-forward" size={16} color={theme.header.text + '60'} />
                      </View>
                  </TouchableWithoutFeedback>
                  
                  <TouchableWithoutFeedback onPress={() => navigation.navigate('OrderStatusScreen')}>
                      <View style={[styles.menuItem, styles.animatedItem]}>
                          <View style={[styles.iconContainer, {backgroundColor: theme.text + '20'}]}>
                              <Ionicons name="clipboard-outline" size={20} color={theme.text} />
                          </View>
                          <Text style={[styles.menuText, {color: theme.header.text}]}>Status des commandes</Text>
                          <View style={styles.statusBadge}>
                              <Text style={styles.badgeText}></Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={theme.header.text + '60'} />
                      </View>
                  </TouchableWithoutFeedback>
              </View>
              
              {/* Section Aide */}
              <View style={styles.menuSection}>
                  <Text style={[styles.sectionTitle, {color: theme.header.text}]}>Aide</Text>
                  
                  <TouchableWithoutFeedback onPress={() => navigation.navigate('AppUsageGuideScreen')}>
                      <View style={[styles.menuItem, styles.animatedItem]}>
                          <View style={[styles.iconContainer, {backgroundColor: theme.text + '20'}]}>
                              <Ionicons name="help-circle-outline" size={20} color={theme.text} />
                          </View>
                          <Text style={[styles.menuText, {color: theme.header.text}]}>Guide d'utilisation</Text>
                          <Ionicons name="chevron-forward" size={16} color={theme.header.text + '60'} />
                      </View>
                  </TouchableWithoutFeedback>
              </View>
          </ScrollView>
      </View>
        )}
        
      {renderShareModal()}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const AutoScrollingCarousel = () => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const responsive = getResponsiveDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Données pour le carrousel
  const carouselData = [
    {
      id: '1',
      type: 'promo',
      title: 'Promotion spéciale',
      subtitle: 'Jusqu\'à -50% sur les smartphones',
      image: require('../../assets/images/bijoux.jpg'),
      backgroundColor: '#FFE8D6',
      textColor: '#D4A373'
    },
    {
      id: '2',
      type: 'soldes',
      title: 'Soldes d\'été',
      subtitle: 'Profitez des offres exclusives',
      image: require('../../assets/images/bijoux.jpg'),
      backgroundColor: '#F0E6EF',
      textColor: '#7F5A83'
    },
    {
      id: '3',
      type: 'nouveauté',
      title: 'Nouveaux produits',
      subtitle: 'Découvrez les dernières nouveautés',
      image: require('../../assets/images/bijoux.jpg'),
      backgroundColor: '#E6F9FF',
      textColor: '#00A8E8'
    },
  ];

  // Défilement automatique
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % carouselData.length;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true
      });
    }, 5000); // Change toutes les 5 secondes

    return () => clearInterval(interval);
  }, [currentIndex]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.carouselItem, 
        { 
          backgroundColor: theme.header.backgroundColor,
          shadowColor: theme.header.text,
          // width: width - responsive.horizontalPadding * 2,
          marginHorizontal: responsive.horizontalPadding
        }
      ]}
      onPress={() => Alert.alert(item.title, item.subtitle)}
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
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={flatListRef}
        data={carouselData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          // const index = Math.round(
          //   // event.nativeEvent.contentOffset.x / (width - responsive.horizontalPadding * 2)
          // );
          // setCurrentIndex(index);
        }}
      />
      <View style={styles.carouselPagination}>
        {carouselData.map((_, index) => (
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

const NotificationBanner = () => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const responsive = getResponsiveDimensions();
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);

  // Données de notifications par défaut
  const notifications = [
    {
      id: '1',
      message: '🎉 Nouvelle collection disponible - Découvrez nos bijoux printemps 2024 !',
      type: 'info',
      icon: 'notifications-outline'
    },
    {
      id: '2',
      message: '🚚 Livraison gratuite à partir de 100.000 FCFA sur toutes vos commandes',
      type: 'promo',
      icon: 'car-outline'
    },
    {
      id: '3',
      message: '⚠️ Maintenance prévue ce soir de 22h à 23h - Le site sera temporairement indisponible',
      type: 'alert',
      icon: 'warning-outline'
    },
    {
      id: '4',
      message: '💎 Nouveaux produits ajoutés dans la catégorie "Colliers en argent"',
      type: 'info',
      icon: 'diamond-outline'
    }
  ];

  // Défilement automatique des notifications
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentNotificationIndex(prev => 
        (prev + 1) % notifications.length
      );
    }, 4000); // Change toutes les 4 secondes

    return () => clearInterval(interval);
  }, []);

  return (
    <TouchableOpacity 
      style={[
        styles.notificationBanner, 
        { 
          backgroundColor: theme.notificationBannerBg,
          borderColor: theme.notificationBannerBorder,
          marginHorizontal: responsive.horizontalPadding,
          marginBottom: responsive.itemSpacing
        }
      ]}
      onPress={() => Alert.alert(
        'Notification', 
        notifications[currentNotificationIndex].message
      )}
    >
      <Ionicons 
        name={notifications[currentNotificationIndex].icon as any} 
        size={20} 
        color={theme.notificationIcon} 
        style={styles.notificationIcon}
      />
      <Text 
        style={[
          styles.notificationText, 
          { 
            color: theme.notificationText,
            fontSize: responsive.captionFontSize
          }
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {notifications[currentNotificationIndex].message}
      </Text>
      <View style={styles.notificationPagination}>
        {notifications.map((_, index) => (
          <View
            key={index}
            style={[
              styles.notificationDot,
              {
                backgroundColor: index === currentNotificationIndex 
                  ? theme.notificationActiveDot 
                  : theme.notificationInactiveDot,
              }
            ]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  header: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10, // Réduit de 15 à 10
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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


modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalCategorieHeader: {
    backgroundColor: '#F58320',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  closeButton: {
    padding: 8,
  },
  modalHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  modalCategorieTitle: {
    fontSize: 20,
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
  modalProductRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalProductList: {
    paddingBottom: 20,
  },
  modalProductSeparator: {
    height: 16,
  },
  modalProductCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    width: (screenWidth - 48) / 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 6,
  },
  modalStockIndicator: {
    position: 'absolute',
    bottom: 8,
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
  
  // Styles pour les produits
  productCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 50,
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
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 6,
  },
  
  stockIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  
  productList: {
    paddingBottom: 20,
  },
  
  // Styles pour les états vides
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
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
  
  searchInput: {
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    fontSize: 16,
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


  icon1Container: {
    position: 'relative',
  },
  
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

  errorText: {
    fontSize: 16,
    marginVertical: 20,
    textAlign: 'center',
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
  
  profileContainer: { 
    justifyContent: "center",
    alignItems: "center",
  },
  profileText: {
    fontWeight: "bold",
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

// MENU
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
  
notificationBadge: {
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
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
  
badgeText: {
    color: '#fff',
    fontSize: 12,
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
  
});

export default HomeScreen;