// PaiementValidationScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ActivityIndicator, Alert, TouchableWithoutFeedback,
  Platform, AppState,
  StatusBar,ScrollView, Switch  } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import { Product, Order } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from './useCart';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';

import { lightTheme, darkTheme } from '../styles/theme';
import { Icon, Badge } from 'react-native-elements';

type RouteParams = {
  orderId: string;
  onPaymentSuccess: () => void;
};


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
const PaiementValidationScreen: React.FC<{ navigation: any, route: any }> = ({ navigation, route }) => {
  // const navigation = useNavigation();
  // const route = useRoute();
  const { orderId, onPaymentSuccess } = route.params as RouteParams;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
    const responsive = getResponsiveDimensions();
      const [menuVisible, setMenuVisible] = useState(false);

      
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
  
    const theme = isDarkMode ? darkTheme : lightTheme;
  
  const handlePayment = async () => {
    try {
      setLoading(true);
      // Simulation de paiement (2 secondes)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(true);
      setLoading(false);
      
      // Appel du callback pour mettre à jour le statut
      onPaymentSuccess();
      
      // Retour à l'écran précédent après 2 secondes
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error) {
      setLoading(false);
      Alert.alert('Erreur', 'Le paiement a échoué');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#fff' }]}>
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
      {/* <View style={styles.headerText}> */}
        {/* <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#F58320" />
        </TouchableOpacity> */}
        {/* <Text style={styles.title}>Validation du paiement</Text> */}
        {/* <View style={{ width: 24 }} /> */}
      {/* </View> */}

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#F58320" />
        ) : success ? (
          <>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            <Text style={styles.successText}>Paiement validé avec succès!</Text>
            <Text style={styles.orderText}>Commande #{orderId}</Text>
          </>
        ) : (
          <>
            <Text style={styles.orderText}>Commande #{orderId}</Text>
            <Text style={styles.amountText}>Montant à payer: 10,000 FCFA</Text>
            <Text style={styles.infoText}>Veuillez procéder au paiement</Text>
            
            <TouchableOpacity 
              style={styles.payButton}
              onPress={handlePayment}
              disabled={loading}
            >
              <Text style={styles.payButtonText}>Valider le paiement</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
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

  headerText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  orderText: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  amountText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  payButton: {
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
  payButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
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

export default PaiementValidationScreen;