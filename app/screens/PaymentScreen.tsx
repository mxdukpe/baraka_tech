import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Image, Linking, Alert, ScrollView,
  Dimensions, TouchableWithoutFeedback,ImageBackground,
  Platform, AppState,
  StatusBar, Switch , } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import { Product, Order } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from './useCart';
import HeaderComponent from './HeaderComponent';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';

import { Icon, Badge } from 'react-native-elements';

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
    // Colonnes adaptatives - ajustez en fonction de la largeurproductColumns: 2,
    categoryColumns: width > 600 ? (width > 900 ? 6 : 5) : 4,
    // Padding adaptatif
    horizontalPadding: isTablet ? 30 : 20,
    verticalPadding: isTablet ? 25 : 15,
    // Espacement des icônes adaptatif
    iconSpacing: isLandscape ? 15 : (isTablet ? 25 : 20),
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
const PaymentScreen = ({ route, navigation }) => {
  // const { total } = route.params;
  const [paymentMethod, setPaymentMethod] = useState(null);
  const { selectedItems = [], total = 0 } = route.params || {};
  
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  

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
  }, []);      const [menuVisible, setMenuVisible] = useState(false);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('mobile_money');
  const [isProcessing, setIsProcessing] = useState(false);

     
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


  
  const clearCart = async () => {
    try {
      // Supprimer les items locaux du panier
      const localIds = selectedItems
        .filter(item => item.id.startsWith('local_'))
        .map(item => item.id);
      
      if (localIds.length > 0) {
        const localCart = await AsyncStorage.getItem('local_cart');
        if (localCart) {
          const cartItems = JSON.parse(localCart);
          const updatedCart = cartItems.filter(item => !localIds.includes(item.id));
          await AsyncStorage.setItem('local_cart', JSON.stringify(updatedCart));
        }
      }
    } catch (error) {
      console.warn('Error clearing cart:', error);
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

  const confirmOrder = async () => {
  setIsSubmitting(true);
  
  try {
    const token = await AsyncStorage.getItem('access_token');
    
    if (!token) {
      Alert.alert('Erreur', 'Vous devez être connecté pour passer commande');
      navigation.navigate('Login');
      return;
    }

    // Nouveau format avec price en entier (en centimes)
    const orderData = {
      products: selectedItems.flatMap(order => 
        order.items.map(item => ({
          product_id: parseInt(item.product.id, 10),
          quantity: parseInt(item.quantity, 10),
          price: Math.round(parseFloat(item.unit_price) * 100) // Convertir en centimes
        }))
      ),
      payment_method: paymentMethod || 'cash',
      total: Math.round(parseFloat(total) * 100), // Convertir en centimes
      status: 'pending'
    };

    console.log('Données finales corrigées:', JSON.stringify(orderData, null, 2));

    const response = await fetch('https://backend.barakasn.com/api/v0/orders/orders/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    setOrderConfirmed(true);
    setOrderNumber(data.id || data.order_number);
    await clearCart();
    navigation.navigate('OrderConfirmationScreen');
    
  } catch (error) {
    console.error('Erreur complète:', error);
    Alert.alert(
      'Erreur de validation',
      `Le serveur a rejeté la commande : ${error.message}`,
      [{ text: 'OK' }]
    );
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <View style={styles.container}>
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
          title="Paiement"
          // showCart={false} // Optionnel: masquer l'icône panier
        />
      

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Méthode de paiement</Text>
        
        <TouchableOpacity 
          style={[styles.paymentOption, paymentMethod === 'wave' && styles.selectedOption]}
          onPress={() => Linking.openURL('https://pay.wave.com/m/M_UirpwF2GyxWf/c/sn/')}
        >
          <Text style={styles.paymentText}>Wave</Text>
          {paymentMethod === 'wave' && <Ionicons name="checkmark-circle" size={24} color="#F58320" />}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.paymentOption, paymentMethod === 'card' && styles.selectedOption]}
          // onPress={() => setPaymentMethod('card')}
        >
          {/* <Image source={require('../assets/credit-card.png')} style={styles.paymentIcon} /> */}
          <Text style={styles.paymentText}>Carte Bancaire</Text>
          {paymentMethod === 'card' && <Ionicons name="checkmark-circle" size={24} color="#F58320" />}
        </TouchableOpacity>

        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total à payer:</Text>
          <Text style={styles.totalAmount}>{total} FCFA</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: '#F58320' }]}
        onPress={confirmOrder}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.actionButtonText}>Confirmer la commande</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerText: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F58320',
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 90,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedOption: {
    borderColor: '#F58320',
    backgroundColor: '#FFF3E0',
  },
  paymentIcon: {
    width: 30,
    height: 30,
    marginRight: 12,
  },
  paymentText: {
    fontSize: 16,
    flex: 1,
  },
  totalContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F58320',
  },
  confirmButton: {
    backgroundColor: '#F58320',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  actionButton: {
    backgroundColor: '#F58320',
    padding: 16,
    marginBottom: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: '90%',
    alignSelf: 'center', // Ajoutez cette ligne pour centrer horizontalement
    // Ou vous pouvez utiliser ces alternatives :
    // marginHorizontal: '5%', // (100% - 90%) / 2 = 5%
    // marginLeft: 'auto', // Alternative 2
    // marginRight: 'auto', // Alternative 2
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
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

export default PaymentScreen;