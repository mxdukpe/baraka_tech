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
  
    Platform, AppState, Switch,SafeAreaView, StatusBar
} from 'react-native';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { getProducts, getProducts50Simple, getProductsPaginated  } from '../../services/apiService';
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


const { width: screenWidth } = Dimensions.get('window');

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

const CategoryProductsScreen: React.FC<{ navigation: any, route: any }> = ({ navigation, route }) => {
  const { category, products } = route.params;
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [orientation, setOrientation] = useState('portrait');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price', 'stock'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const { width, height } = Dimensions.get('window');
  const isLandscape = width > height;

  const [responsive, setResponsive] = useState(getResponsiveDimensions());
  useEffect(() => {
      const subscription = Dimensions.addEventListener('change', ({ window }) => {
        setResponsive(getResponsiveDimensions());
      });
      
      return () => subscription?.remove?.();
    }, []);
  
  const numColumns = responsive.productColumns; // Toujours 2
  
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [shareWithPrice, setShareWithPrice] = useState(true);
  const [shareWithDescription, setShareWithDescription] = useState(true);
  const [shareWithImage, setShareWithImage] = useState(true);
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  const { isDarkMode, toggleTheme } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [showPrices, setShowPrices] = useState(true);
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

  // Fonction de tri des produits
  const sortProducts = (products: Product[], sortBy: string) => {
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          const priceA = a.prices[0]?.price ? parseInt(a.prices[0].price) : 0;
          const priceB = b.prices[0]?.price ? parseInt(b.prices[0].price) : 0;
          return priceA - priceB;
        case 'stock':
          return b.stock - a.stock;
        default:
          return 0;
      }
    });
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    let results = products;
    
    if (text.trim() !== '') {
      results = products.filter(product => 
        product.name.toLowerCase().includes(text.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(text.toLowerCase()))
      );
    }
    
    const sortedResults = sortProducts(results, sortBy);
    setFilteredProducts(sortedResults);
  };

  const handleSort = (newSortBy: string) => {
    setSortBy(newSortBy);
    const sortedProducts = sortProducts(filteredProducts, newSortBy);
    setFilteredProducts(sortedProducts);
  };

  // Rendu optimisé des produits pour 2 colonnes
  const renderProduct = ({ item, index }) => {
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

  const renderHeader = () => (
    <View style={[styles.headerControls, { paddingHorizontal: responsive.horizontalPadding }]}>
      <View style={styles.categoryInfo}>
        <Text style={[styles.categoryTitle, { 
          fontSize: responsive.titleFontSize,
          color: theme.text 
        }]}>
          {category.name}
        </Text>
        <Text style={[styles.productCount, { 
          fontSize: responsive.captionFontSize,
          color: theme.text + '80' 
        }]}>
          {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.controlsRow}>
        {/* Boutons de tri */}
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
            onPress={() => handleSort('name')}
          >
            <Ionicons name="text-outline" size={14} color={sortBy === 'name' ? '#fff' : '#F58320'} />
            <Text style={[styles.sortButtonText, { 
              color: sortBy === 'name' ? '#fff' : '#F58320',
              fontSize: responsive.captionFontSize 
            }]}>
              Nom
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'price' && styles.sortButtonActive]}
            onPress={() => handleSort('price')}
          >
            <Ionicons name="pricetag-outline" size={14} color={sortBy === 'price' ? '#fff' : '#F58320'} />
            <Text style={[styles.sortButtonText, { 
              color: sortBy === 'price' ? '#fff' : '#F58320',
              fontSize: responsive.captionFontSize 
            }]}>
              Prix
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'stock' && styles.sortButtonActive]}
            onPress={() => handleSort('stock')}
          >
            <Ionicons name="layers-outline" size={14} color={sortBy === 'stock' ? '#fff' : '#F58320'} />
            <Text style={[styles.sortButtonText, { 
              color: sortBy === 'stock' ? '#fff' : '#F58320',
              fontSize: responsive.captionFontSize 
            }]}>
              Stock
            </Text>
          </TouchableOpacity>
        </View>

        {/* Boutons de vue - optionnel, on peut les garder même si on force la grille */}
        <View style={styles.viewModeButtons}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons name="grid-outline" size={16} color={viewMode === 'grid' ? '#fff' : '#F58320'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? '#fff' : '#F58320'} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="#F58320" />
      
      {/* Header avec recherche */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#F58320" />
        </TouchableOpacity>
        
        <View style={[styles.searchContainer, { backgroundColor: theme.background + '10' }]}>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher dans cette catégorie..."
            placeholderTextColor={theme.text + '60'}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <Ionicons name="search-outline" size={22} color="#F58320" />
        </View>
      </View>
      
      <View style={styles.content}>
        {renderHeader()}
        
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={item => item.id.toString()}
          numColumns={2} // Force 2 colonnes
          key={`grid-2`} // Clé fixe pour 2 colonnes
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={[
            styles.productList,
            { paddingHorizontal: responsive.horizontalPadding }
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color={theme.text + '40'} />
              <Text style={[styles.emptyText, { color: theme.text }]}>
                {searchQuery.trim() !== '' 
                  ? `Aucun produit trouvé pour "${searchQuery}"`
                  : 'Aucun produit disponible dans cette catégorie'}
              </Text>
            </View>
          }
        />
      </View>

      {renderShareModal()}
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginLeft: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  
  // Styles optimisés pour les contrôles d'en-tête
  headerControls: {
    paddingVertical: 12, // Réduit
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryInfo: {
    marginBottom: 8, // Réduit
  },
  categoryTitle: {
    fontWeight: 'bold',
    marginBottom: 2, // Réduit
  },
  productCount: {
    opacity: 0.7,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Styles pour les boutons de tri - compacts
  sortButtons: {
    flexDirection: 'row',
    gap: 6, // Réduit
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10, // Réduit
    paddingVertical: 5, // Réduit
    borderRadius: 16, // Réduit
    borderWidth: 1,
    borderColor: '#F58320',
    backgroundColor: 'transparent',
    gap: 3, // Réduit
  },
  sortButtonActive: {
    backgroundColor: '#F58320',
  },
  sortButtonText: {
    fontSize: 11, // Réduit
    fontWeight: '500',
  },
  
  // Styles pour les boutons de vue - compacts
  viewModeButtons: {
    flexDirection: 'row',
    borderRadius: 6, // Réduit
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  viewModeButton: {
    paddingHorizontal: 10, // Réduit
    paddingVertical: 6, // Réduit
    backgroundColor: 'transparent',
  },
  viewModeButtonActive: {
    backgroundColor: '#F58320',
  },
  
  
  // Cartes produits adaptatives
  modalProductCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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

  modalShareButton: {
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

  modalStockIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },

  modalStockText: {
    fontWeight: 'bold',
    color: 'white',
  },

  modalProductInfo: {
    flex: 1,
    paddingTop: 4,
  },

  modalProductName: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 16,
  },

  modalProductDescription: {
    color: '#666',
    marginBottom: 6,
  },

  modalProductPrice: {
    fontWeight: 'bold',
    color: '#F58320',
    marginTop: 4,
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

  // Styles pour la modal de partage (inchangés)
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
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
  imagePreviewSection: {
    marginBottom: 20,
  },
  sharePreviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#E0E0E0',
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

  // Styles supplémentaires pour une meilleure compatibilité
  brandCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6, // Réduit
    flexWrap: 'wrap',
  },

  categoryPill: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8, // Réduit
    paddingHorizontal: 6, // Réduit
    paddingVertical: 1, // Réduit
    marginLeft: 4, // Réduit
  },

  // Styles pour les autres vues (liste, etc.) - conservés mais non utilisés
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
  
  // Styles pour la vue liste (conservés)
  productCardList: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainerList: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    position: 'relative',
  },
  productImageList: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f8f8',
  },
  stockIndicatorList: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 2,
    alignItems: 'center',
  },
  stockTextList: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
  },
  productInfoList: {
    flex: 1,
  },
  productHeaderList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productNameList: {
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  shareButtonList: {
    padding: 4,
  },
  productCategoryList: {
    marginBottom: 4,
  },
  productDescriptionList: {
    marginBottom: 8,
    lineHeight: 16,
  },
  productFooterList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  productPriceList: {
    fontWeight: 'bold',
  },
  stockInfoList: {
    alignItems: 'flex-end',
  },
  stockCountList: {
    fontSize: 11,
  },
  
  stockText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
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

export default CategoryProductsScreen;
