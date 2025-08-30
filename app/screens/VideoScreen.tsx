/**
 * Ce fichier définit l'écran de gestion des objectifs.
 * Il permet à l'utilisateur de créer, suivre et supprimer des objectifs.
 *
 * @module VideoScreen
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Image,
  StatusBar,
  Platform, AppState,
  Dimensions, TouchableWithoutFeedback, Switch ,ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { Icon, Badge } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import { useCart } from './useCart';
import { Order, OrderItem } from '../../services/types';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';



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

type VideoScreenProps = {
  navigation: any;
  route: any;
};

// Définition du type pour une vidéo tutorielle
type Tutorial = {
  id: string;
  title: string;
  duration: string;
  thumbnail: any;
  description: string;
};

// Données des tutoriels
const tutorials: Tutorial[] = [
  {
    id: '1',
    title: 'Comment parcourir le catalogue',
    duration: '2:30',
    thumbnail: require('../../assets/images/baraka_images/appareils.png'),
    description: 'Découvrez comment naviguer dans notre catalogue de produits.'
  },
  {
    id: '2',
    title: 'Effectuer un achat',
    duration: '3:45',
    thumbnail: require('../../assets/images/baraka_images/appareils.png'),
    description: 'Guide étape par étape pour réaliser votre premier achat.'
  },
  {
    id: '3',
    title: 'Gérer votre panier',
    duration: '1:55',
    thumbnail: require('../../assets/images/baraka_images/appareils.png'),
    description: 'Apprenez à ajouter, modifier et supprimer des articles de votre panier.'
  },
  {
    id: '4',
    title: 'Processus de paiement',
    duration: '4:15',
    thumbnail: require('../../assets/images/baraka_images/appareils.png'),
    description: 'Comprendre les différentes options de paiement disponibles.'
  }
];

const VideoScreen: React.FC<VideoScreenProps> = ({ navigation, route }) => {
  
    const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  

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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
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
      <View style={styles.headerText}>
        {/* <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#F58320" />
        </TouchableOpacity> */}
        <Text style={[styles.headerTitle, {color: theme.header.text}]}>Tutoriels vidéo</Text>
        <Text style={[styles.subTitle, {color: theme.header.text}]}>Apprenez à utiliser l'application</Text>
      </View>

      <View style={styles.tutorialsGrid}>
        {tutorials.map((tutorial) => (
          <TouchableOpacity key={tutorial.id} style={[styles.tutorialCard, { backgroundColor: theme.header.backgroundColor }]}>
            <View style={styles.thumbnailContainer}>
              <Image source={tutorial.thumbnail} style={styles.thumbnail} />
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{tutorial.duration}</Text>
              </View>
              <View style={styles.playButton}>
                <Ionicons name="play-circle" size={40} color="#fff" />
              </View>
            </View>
            <View style={styles.tutorialInfo}>
              <Text style={[styles.tutorialTitle, {color: theme.header.text}]}>{tutorial.title}</Text>
              <Text style={[styles.tutorialDescription, {color: theme.header.text}]}>{tutorial.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      
            {/* Menu dropdown avec image de fond */}
            {menuVisible && (
              <>
                <TouchableWithoutFeedback onPress={closeMenu}>
                  <View style={styles.menuOverlay} />
                </TouchableWithoutFeedback>
      
                <ImageBackground
                            source={require('../../assets/images/rectangle2_menu.png')}
                            style={[
                              styles.menuDropdown,
                              {
                                height: screenDimensions.height, // Hauteur dynamique
                                width: Math.min(550, screenDimensions.width * 0.85), // Largeur adaptive
                              }
                            ]}
                            resizeMode="stretch"
                          >
                  {/* Header du menu avec les infos NOVA */}
                  <View style={styles.menuHeader}>
                  </View>
      
                  <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.menuScrollContainer}
                    bounces={false}
                  >
                    {/* Accueil */}
                    <TouchableWithoutFeedback onPress={() => handleNavigation('HomeStack')}>
                      <View style={styles.menuItem}>
                        <Ionicons name="home-outline" size={20} color="#000000" style={styles.menuIcon} />
                        <Text style={styles.menuItemText}>Accueil</Text>
                      </View>
                    </TouchableWithoutFeedback>
      
                    {/* Catégories */}
                    <TouchableWithoutFeedback onPress={() => handleNavigation('CategoriesTab')}>
                      <View style={styles.menuItem}>
                        <Ionicons name="grid-outline" size={20} color="#000000" style={styles.menuIcon} />
                        <Text style={styles.menuItemText}>Catégories</Text>
                      </View>
                    </TouchableWithoutFeedback>
      
                    {/* Notifications */}
                    <TouchableWithoutFeedback onPress={() => handleNavigation('NotificationsScreen')}>
                      <View style={styles.menuItem}>
                        <Ionicons name="notifications-outline" size={20} color="#000000" style={styles.menuIcon} />
                        <Text style={styles.menuItemText}>Notifications</Text>
                      </View>
                    </TouchableWithoutFeedback>
      
                    {/* Contacts */}
                    <TouchableWithoutFeedback onPress={() => handleNavigation('ContactScreen')}>
                      <View style={styles.menuItem}>
                        <Ionicons name="people-outline" size={20} color="#000000" style={styles.menuIcon} />
                        <Text style={styles.menuItemText}>Contacts</Text>
                      </View>
                    </TouchableWithoutFeedback>
      
                    {/* Produits en solde */}
                    <TouchableWithoutFeedback onPress={() => handleNavigation('SaleScreen')}>
                      <View style={styles.menuItem}>
                        <Ionicons name="pricetag-outline" size={20} color="#000000" style={styles.menuIcon} />
                        <Text style={styles.menuItemText}>Produits en solde</Text>
                      </View>
                    </TouchableWithoutFeedback>
      
                    {/* Promouvoir */}
                    <TouchableWithoutFeedback onPress={() => handleNavigation('PromotionsScreen')}>
                      <View style={styles.menuItem}>
                        <Ionicons name="diamond-outline" size={20} color="#000000" style={styles.menuIcon} />
                        <Text style={styles.menuItemText}>Promouvoir</Text>
                      </View>
                    </TouchableWithoutFeedback>
      
                    {/* Message */}
                    <TouchableWithoutFeedback onPress={() => handleNavigation('MessagesScreen')}>
                      <View style={styles.menuItem}>
                        <Ionicons name="chatbubble-outline" size={20} color="#000000" style={styles.menuIcon} />
                        <Text style={styles.menuItemText}>Message</Text>
                        <View style={styles.messageBadge}>
                          <Text style={styles.messageBadgeText}>new</Text>
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
      
                    {/* Mon profil */}
                    <TouchableWithoutFeedback onPress={() => handleNavigation('ProfileTab')}>
                      <View style={styles.menuItem}>
                        <Ionicons name="person-outline" size={20} color="#000000" style={styles.menuIcon} />
                        <Text style={styles.menuItemText}>Mon profil</Text>
                      </View>
                    </TouchableWithoutFeedback>
      
                    {/* Mode */}
                    <View style={styles.menuItem}>
                      <Ionicons name="contrast-outline" size={20} color="#000000" style={styles.menuIcon} />
                      <Text style={styles.menuItemText}>Mode</Text>
                      <Switch 
                        value={isDarkMode} 
                        onValueChange={toggleTheme}
                        trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#3B82F6' }}
                        thumbColor={isDarkMode ? '#000000' : '#000000'}
                        ios_backgroundColor="rgba(255,255,255,0.3)"
                        style={styles.menuSwitch}
                      />
                    </View>
      
                    {/* Masquer/Afficher les prix */}
                    <TouchableWithoutFeedback onPress={() => setShowPrices(!showPrices)}>
                      <View style={styles.menuItem}>
                        <Ionicons name={showPrices ? "eye-outline" : "eye-off-outline"} size={20} color="#000000" style={styles.menuIcon} />
                        <Text style={styles.menuItemText}>{showPrices ? "Masquer" : "Afficher"}</Text>
                      </View>
                    </TouchableWithoutFeedback>
      
                    {/* Liste des produits */}
                    <TouchableWithoutFeedback onPress={() => handleNavigation('ProductListScreen')}>
                      <View style={styles.menuItem}>
                        <Ionicons name="list-outline" size={20} color="#000000" style={styles.menuIcon} />
                        <Text style={styles.menuItemText}>Liste des produits</Text>
                      </View>
                    </TouchableWithoutFeedback>
      
                    {/* Envoyer plusieurs produits */}
                    <TouchableWithoutFeedback onPress={() => handleNavigation('BulkUploadScreen')}>
                      <View style={styles.menuItem}>
                        <Ionicons name="cloud-upload-outline" size={20} color="#000000" style={styles.menuIcon} />
                        <Text style={styles.menuItemText}>Envoyer plusieurs produits</Text>
                      </View>
                    </TouchableWithoutFeedback>
      
                    {/* Catalogue */}
                    <TouchableWithoutFeedback onPress={() => handleNavigation('CatalogueScreen')}>
                      <View style={styles.menuItem}>
                        <Ionicons name="library-outline" size={20} color="#000000" style={styles.menuIcon} />
                        <Text style={styles.menuItemText}>Catalogue</Text>
                      </View>
                    </TouchableWithoutFeedback>
                  </ScrollView>
                </ImageBackground>
              </>
            )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
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
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  tutorialsGrid: {
    flex: 1,
  },
  tutorialCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailContainer: {
    position: 'relative',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -20 },
      { translateY: -20 }
    ],
  },
  tutorialInfo: {
    padding: 15,
  },
  tutorialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  tutorialDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
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

export default VideoScreen;