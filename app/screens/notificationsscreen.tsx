/**
 * Ce fichier définit l'écran des notifications.
 * Il permet à l'utilisateur de gérer les paramètres de notification
 * et affiche les notifications récentes.
 *
 * @module NotificationsScreen
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, FlatList,
  Dimensions, StyleSheet, TouchableOpacity, ScrollView,ImageBackground,
  Platform, AppState,
  StatusBar,TouchableWithoutFeedback } from 'react-native';
import { notificationsData, Notification } from '../../data/notificationsData';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { Icon, Badge } from 'react-native-elements';
import { useCart } from './useCart';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import { Product, Order, OrderItem } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderComponent from './HeaderComponent';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';

type NotificationType = 'Arrivages' | 'Commandes' | 'Panier' | 'Nouveaux produits' | 'Modification de prix' | 'Promotion' | 'Produits disponibles';

type NotificationScreenProps = {
  navigation: any;
  route: any;
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

const NotificationsScreen: React.FC<NotificationScreenProps> = ({ navigation, route }) => {

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
  const [notificationSettings, setNotificationSettings] = useState({
    Arrivages: true,
    Commandes: true,
    Panier: true,
    'Nouveaux produits': true,
    'Modification de prix': true,
    Promotion: true,
    'Produits disponibles': true,
  });

  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);

  const theme = isDarkMode ? darkTheme : lightTheme;

  
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
  const toggleNotificationSetting = (type: NotificationType) => {
    setNotificationSettings((prevSettings) => ({
      ...prevSettings,
      [type]: !prevSettings[type],
    }));
  };

  // Filtrer les notifications en fonction des paramètres utilisateur
  const filteredNotifications = notificationsData.filter(
    (notification) => notificationSettings[notification.type]
  );

  const renderNotification = ({ item }: { item: Notification }) => (
    <View style={[[styles.notificationContainer, { backgroundColor: theme.header.backgroundColor }], styles[item.type]]}>
      <Text style={[styles.notificationMessage, { color: theme.text }]}>{item.message}</Text>
      <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
    </View>
  );

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
    <View style={{ flex: 1 }}>
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
          title="Notifications"
          // showCart={false} // Optionnel: masquer l'icône panier
        />

      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {/* <View style={styles.headerContainer}>
          <Text style={[styles.headerTitle, { color: theme.header.text }]}>Notifications</Text>
        </View> */}

        {/* Paramètres de notification */}
        <View style={[styles.settingsContainer, { backgroundColor: theme.header.backgroundColor }]}>
          {Object.keys(notificationSettings).map((type) => (
            <View key={type} style={styles.settingItem}>
              <Text style={[styles.settingText, { color: theme.text }]}>{type}</Text>
              <Switch
                value={notificationSettings[type as NotificationType]}
                onValueChange={() => toggleNotificationSetting(type as NotificationType)}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={notificationSettings[type as NotificationType] ? '#F58320' : '#f4f3f4'}
              />
            </View>
          ))}
        </View>

        {/* Liste des notifications filtrées */}
        <Text style={[styles.subHeader, { color: theme.header.text }]}>Notifications Récentes</Text>
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotification}
          scrollEnabled={false}
        />
      </ScrollView>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerContainer: {
    flexDirection: "row",  
    alignItems: "center",  
    marginTop: 50,  
  },
  iconBack: {
    marginRight: 10, // Espacement entre l'icône et le texte
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
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
    marginTop: 30,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  subHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#2c3e50',
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingText: {
    fontSize: 16,
    color: '#34495e',
  },
  notificationContainer: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  Arrivages: {
    borderLeftWidth: 5,
    borderLeftColor: '#81b0ff',
  },
  Commandes: {
    borderLeftWidth: 5,
    borderLeftColor: '#F58320',
  },
  Panier: {
    borderLeftWidth: 5,
    borderLeftColor: '#f1c40f',
  },
  notificationMessage: {
    fontSize: 16,
    color: '#2c3e50',
  },
  timestamp: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
    textAlign: 'right',
  },

  'Nouveaux produits': {
    borderLeftWidth: 5,
    borderLeftColor: '#81b0ff',
  },
  'Modification de prix': {
    borderLeftWidth: 5,
    borderLeftColor: '#F58320',
  },
  Promotion: {
    borderLeftWidth: 5,
    borderLeftColor: '#f1c40f',
  },
  'Produits disponibles': {
    borderLeftWidth: 5,
    borderLeftColor: '#2ecc71',
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

export default NotificationsScreen;