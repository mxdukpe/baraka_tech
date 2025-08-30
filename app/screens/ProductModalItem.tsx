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
  
  Platform, AppState, Switch,SafeAreaView, StatusBar,
  Keyboard
} from 'react-native';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';
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
import { Animated } from 'react-native';

// Fonction pour obtenir les dimensions responsives
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
    productColumns: isLandscape ? 3 : (isTablet ? 3 : 2),
    horizontalPadding: isTablet ? 30 : 20,
    verticalPadding: isTablet ? 25 : 15,
    iconSpacing: isLandscape ? 15 : (isTablet ? 25 : 20),
    cardWidth: isLandscape ? (width - 80) / 3 : (isTablet ? (width - 80) / 3 : (width - 60) / 2),
    headerHeight: isTablet ? 80 : 70,
    productImageHeight: isTablet ? 180 : 140,
    titleFontSize: isTablet ? 24 : 20,
    subtitleFontSize: isTablet ? 18 : 16,
    bodyFontSize: isTablet ? 16 : 14,
    captionFontSize: isTablet ? 14 : 12,
    sectionSpacing: isTablet ? 35 : 25,
    itemSpacing: isTablet ? 20 : 15,
  };
};

interface ProductModalItemProps {
  item: Product;
  index: number;
  responsive: any;
  theme: any;
  productQuantities: Record<string, number>;
  updateQuantity: (productId: string, increment: boolean) => void;
  addToCart: (product: Product) => void;
  isAddingToCart: boolean;
  openShareModal: (product: Product) => void;
  showPrices: boolean;
  navigation: any;
  setModalVisible: (visible: boolean) => void;
}

const ProductModalItem: React.FC<ProductModalItemProps> = ({
  item,
  index,
  responsive,
  theme,
  productQuantities,
  updateQuantity,
  addToCart,
  isAddingToCart,
  openShareModal,
  showPrices,
  navigation,
  setModalVisible
}) => {
  const quantity = productQuantities[item.id] || 0;
  const stockStatus = item.stock === 0;
  const productImage = item.images?.[0]?.image;
  
  const getPriceByCriterion = (product: Product) => {
      return product.prices[0];
    };
    const productPrice = getPriceByCriterion(item);
  
  
  const [itemFadeAnim] = useState(new Animated.Value(0));
  const [itemScaleAnim] = useState(new Animated.Value(0.8));
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
      const delay = index * 100; // Délai basé sur l'index
      
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(itemFadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(itemScaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);
    }, []);
  
    // Limiter la description à 30 caractères
    const limitedDescription = item.description 
      ? item.description.length > 30 
        ? `${item.description.substring(0, 27)}...` 
        : item.description
      : '';
  
  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };
  
    return (
      <Animated.View
        style={[
          styles.enhancedProductCard,
          {
            width: responsive.cardWidth,
            margin: responsive.itemSpacing / 4,
            opacity: itemFadeAnim,
            transform: [{ scale: itemScaleAnim }],
          }
        ]}
      >
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
        <TouchableOpacity
          onPress={() => {
            setModalVisible(false);
            navigation.navigate('ProductDetailScreen', { productId: item.id });
          }}
          style={styles.productCardTouchable}
          activeOpacity={0.9}
        >
          {/* Container d'image amélioré */}
          <View style={styles.enhancedProductImageContainer}>
            {productImage ? (
              <Image
                source={{ uri: `https://backend.barakasn.com${productImage}` }}
                style={[styles.enhancedProductImage, { height: responsive.productImageHeight }]}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={require('../../assets/images/baraka_icon.png')}
                style={[styles.enhancedProductImage, { height: responsive.productImageHeight }]}
                resizeMode="cover"
              />
            )}
            
            {/* Gradient overlay pour meilleure lisibilité */}
            <View style={styles.imageGradientOverlay} />
            
            {/* Badge de stock repositionné */}
            <View style={[
              styles.enhancedStockIndicator,
              { backgroundColor: stockStatus ? '#FF3B30' : '#34C759' }
            ]}>
              <Text style={styles.enhancedStockText}>
                {stockStatus ? 'RUPTURE' : 'EN STOCK'}
              </Text>
            </View>
  
            {/* Bouton favori */}
            <TouchableOpacity 
              style={styles.enhancedFavoriteButton}
              onPress={(e) => {
                e.stopPropagation();
                // Logique pour ajouter aux favoris
              }}
            >
              <Ionicons name="heart-outline" size={18} color="#FF3B30" />
            </TouchableOpacity>
  
            {/* Bouton de partage repositionné */}
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                openShareModal(item);
              }}
              style={styles.enhancedShareButton}
            >
              <Ionicons name="share-social" size={16} color="#F58320" />
            </TouchableOpacity>
          </View> 
  
          {/* Informations du produit */}
          <View style={styles.enhancedProductInfo}>
            <Text style={[
              styles.enhancedProductName, 
              { fontSize: responsive.bodyFontSize }
            ]} numberOfLines={2}>
              {item.name}
            </Text>
            
            {limitedDescription.length > 0 && (
              <Text style={[
                styles.enhancedProductDescription, 
                { fontSize: responsive.captionFontSize }
              ]} numberOfLines={1}>
                {limitedDescription}
              </Text>
            )}
            
            <Text style={[
              styles.enhancedProductBrand, 
              { fontSize: responsive.captionFontSize }
            ]}>
              {item.brand?.name || 'Marque non spécifiée'}
            </Text>
            
            {showPrices && (
              <Text style={[
                styles.enhancedProductPrice, 
                { fontSize: responsive.bodyFontSize }
              ]}>
                {productPrice ? `${formatPrice(productPrice.price)} FCFA` : 'Prix non disponible'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
  
        {/* Contrôles de quantité améliorés */}
        <View style={styles.enhancedQuantitySection}>
          <View style={styles.enhancedQuantityControls}>
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                updateQuantity(item.id, false);
              }}
              disabled={quantity <= 0}
              style={[
                styles.enhancedQuantityButton,
                { 
                  backgroundColor: quantity > 0 ? '#F58320' : '#E0E0E0',
                  opacity: quantity > 0 ? 1 : 0.5
                }
              ]}
            >
              <Ionicons 
                name="remove" 
                size={16} 
                color={quantity > 0 ? 'white' : '#999'} 
              />
            </TouchableOpacity>
  
            <Text style={styles.enhancedQuantityText}>
              {quantity}
            </Text>
  
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                updateQuantity(item.id, true);
              }}
              style={[styles.enhancedQuantityButton, { backgroundColor: '#F58320' }]}
            >
              <Ionicons name="add" size={16} color="white" />
            </TouchableOpacity>
          </View>
  
          {/* Bouton d'ajout au panier amélioré */}
          <TouchableOpacity
            style={[
              styles.enhancedAddButton, 
              { 
                backgroundColor: quantity > 0 ? '#F58320' : '#E0E0E0',
                opacity: quantity > 0 ? 1 : 0.6
              }
            ]}
            onPress={(e) => {
              e.stopPropagation();
              addToCart(item);
            }}
            disabled={isAddingToCart || quantity <= 0}
          >
            {isAddingToCart ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons 
                  name="cart" 
                  size={16} 
                  color={quantity > 0 ? 'white' : '#999'} 
                />
                <Text style={[
                  styles.enhancedAddButtonText,
                  { color: quantity > 0 ? 'white' : '#999' }
                ]}>
                  {quantity > 0 ? `Ajouter (${quantity})` : 'Ajouter'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
};



const styles = StyleSheet.create({
    
  // Product card styles
  enhancedProductCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  
  productCardTouchable: {
    flex: 1,
  },
  
  enhancedProductImageContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  
  enhancedProductImage: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  
  imageGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    // background: 'linear-gradient(transparent, rgba(0,0,0,0.1))',
  },
  
  enhancedStockIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  enhancedStockText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  
  enhancedFavoriteButton: {
    position: 'absolute',
    top: 12,
    right: 50,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  enhancedShareButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  enhancedProductInfo: {
    padding: 12,
  },
  
  enhancedProductName: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  
  enhancedProductDescription: {
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  
  enhancedProductBrand: {
    color: '#999',
    marginBottom: 6,
  },
  
  enhancedProductPrice: {
    fontWeight: 'bold',
    color: '#F58320',
  },
  
  // Quantity and add section
  enhancedQuantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  
  enhancedQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    padding: 4,
  },
  
  enhancedQuantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  enhancedQuantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  
  enhancedAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  
  enhancedAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Empty state
  enhancedEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  
  enhancedEmptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  enhancedEmptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  
  clearSearchSuggestion: {
    backgroundColor: '#F58320',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  
  clearSearchSuggestionText: {
    color: 'white',
    fontWeight: '600',
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

export default ProductModalItem;