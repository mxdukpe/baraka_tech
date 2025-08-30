import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, Alert,ScrollView,
  Platform, AppState,
  Dimensions, TouchableWithoutFeedback, Switch , } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { Icon, Badge } from 'react-native-elements';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import { Product, Order } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from './useCart';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';


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
    // Colonnes adaptatives - ajustez en fonction de la largeurproductColumns: 2,
    categoryColumns: width > 600 ? (width > 900 ? 6 : 5) : 4,
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
const OrderValidationScreen = ({ navigation, route }) => {
  const { selectedItems = [] } = route.params || {};
  
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  const theme = isDarkMode ? darkTheme : lightTheme;
    const responsive = getResponsiveDimensions();
      const [menuVisible, setMenuVisible] = useState(false);

const [cartItemsCount, setCartItemsCount] = useState(0);
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
      
  // const { cartItems, totalCartItems, saveCart } = useCart();
  const { addedProduct } = route.params || {};
  const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const allCartItems = [...localCartItems, ...orders];
      const [token, setToken] = useState<string | null>(null);
  
  // const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  // const allCartItems = [...localCartItems, ...orders];
  
  const { loadCart } = useCart();
  const { cartItems, totalCartItems, saveCart } = useCart();


  
  // Calculer le total
  const total = selectedItems.reduce((sum, order) => sum + parseFloat(order.total_price), 0);

  const getImageUri = (imagePath) => {
    if (!imagePath) return undefined;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/')) return `https://backend.barakasn.com${imagePath}`;
    return `https://backend.barakasn.com/media/${imagePath}`;
  };

  const renderOrderItem = ({ item }) => {
    const orderTitle = item.items.length > 0 ? item.items[0].product.name : `Commande #${item.id}`;
    const productCount = item.items.length > 1 ? ` + ${item.items.length - 1} autre(s)` : '';
    const isLocalOrder = item?.id?.toString()?.startsWith('local_');
    
    return (
      <View style={[styles.orderCard, { backgroundColor: theme.background }]}>
        <View style={styles.orderHeader}>
          <View style={styles.orderTitleContainer}>
            <Ionicons name="receipt" size={20} color="#F58320" />
            <Text style={[styles.orderTitle, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
              {orderTitle}{productCount}
            </Text>
            {isLocalOrder && (
              <View style={styles.localBadge}>
                <Text style={styles.localBadgeText}>LOCAL</Text>
              </View>
            )}
          </View>
          
          <View style={[
            styles.statusBadge,
            item.status === 'completed' ? styles.completedStatus : styles.pendingStatus,
            { backgroundColor: item.status === 'completed' ? theme.background : theme.background }
          ]}>
            <MaterialIcons 
              name={item.status === 'completed' ? 'check-circle' : 'pending'} 
              size={16} 
              color={item.status === 'completed' ? theme.text : theme.text} 
            />
            <Text style={[styles.statusText, { color: item.status === 'completed' ? theme.text : theme.text }]}>
              {item.status === 'completed' ? 'Terminée' : 'En attente'}
            </Text>
          </View>
        </View>
        
        <View style={styles.orderInfo}>
          <Ionicons name="calendar" size={16} color="#F58320" />
          <Text style={[styles.orderDate, { color: theme.text }]}>
            {new Date(item.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
        
        <View style={styles.orderInfo}>
          <FontAwesome name="money" size={16} color="#F58320" />
          <Text style={[styles.orderTotal, { color: theme.text }]}>
            {parseFloat(item.total_price).toFixed(2)} FCFA
          </Text>
        </View>
        
        <View style={styles.itemsContainer}>
          {item.items.slice(0, 2).map((orderItem, index) => {
            const firstImagePath = orderItem.product.images?.[0]?.image;
            const firstImageUri = firstImagePath ? getImageUri(firstImagePath) : undefined;

            return (
              <View key={index} style={styles.itemRow}>
                <View style={styles.productInfo}>
                  {firstImageUri ? (
                    <Image 
                      source={{ uri: firstImageUri.startsWith('http') ? firstImageUri : `https://backend.barakasn.com${firstImageUri}` }} 
                      style={styles.productImage} 
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={require('../../assets/images/baraka_icon.png')}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                    {orderItem.product.name}
                  </Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={[styles.itemQuantity, { color: theme.text }]}>
                    {orderItem.quantity} x {parseFloat(orderItem.unit_price).toFixed(2)} FCFA
                  </Text>
                  <Text style={[styles.itemTotal, { color: theme.text }]}>
                    {(orderItem.quantity * parseFloat(orderItem.unit_price)).toFixed(2)} FCFA
                  </Text>
                </View>
              </View>
            );
          })}
          
          {item.items.length > 2 && (
            <Text style={[styles.moreItemsText, { color: theme.text }]}>
              ... et {item.items.length - 2} autre(s) produit(s)
            </Text>
          )}
        </View>
      </View>
    );
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
        
      <View style={[styles.headerText, { backgroundColor: '#F58320' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Validation de commande</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.contentContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Votre sélection</Text>
        
        {selectedItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={64} color="#F58320" />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Aucun article sélectionné</Text>
            <Text style={[styles.emptyText, { color: theme.text }]}>
              Retournez au panier pour sélectionner des articles
            </Text>
          </View>
        ) : (
          <FlatList
            data={selectedItems}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {selectedItems.length > 0 && (
        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryText, { color: theme.text }]}>
                Total articles: {selectedItems.length}
              </Text>
              <Text style={[styles.summaryText, { color: theme.text }]}>
                Total produits: {selectedItems.reduce((sum, order) => sum + order.items.length, 0)}
              </Text>
            </View>
            <View style={styles.totalContainer}>
              <Text style={[styles.totalText, { color: theme.text }]}>Total à payer:</Text>
              <Text style={[styles.totalAmount, { color: '#F58320' }]}>{total.toFixed(2)} FCFA</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.paymentButton}
            onPress={() => navigation.navigate('PaymentScreen', { selectedItems, total })}
          >
            <Text style={styles.paymentButtonText}>Procéder au paiement</Text>
            {/* <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} /> */}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerText: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 40,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 10,
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

  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#F58320',
  },
  listContent: {
    paddingBottom: 20,
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flexShrink: 1,
  },
  localBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  localBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderDate: {
    fontSize: 14,
    marginLeft: 8,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  status1Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  itemsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemName: {
    flexShrink: 1,
    marginLeft: 10,
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  itemQuantity: {
    fontSize: 12,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  moreItemsText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentButton: {
    backgroundColor: '#F58320',
    padding: 16,
    marginBottom: 50,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  paymentButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  completedStatus: {
    backgroundColor: '#E8F5E9',
  },
  pendingStatus: {
    backgroundColor: '#FFF8E1',
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

export default OrderValidationScreen;