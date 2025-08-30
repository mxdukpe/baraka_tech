/**
 * Ce fichier définit l'écran d'accueil de l'application adaptatif.
 * Il s'adapte automatiquement aux différentes tailles d'écran.
 *
 * @module Header
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, RefreshControl,
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
  
  Platform, AppState, 
  StatusBar, 
  Modal, 
  Linking, 
  Keyboard,ImageBackground,
  TextInput
} from 'react-native';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';
import { Icon, Badge } from 'react-native-elements';
import { Ionicons } from '@expo/vector-icons';
import { usersData } from '../../data/userData';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProducts, getProducts50Simple, getProductsPaginated  } from '../../services/apiService';
import * as Print from 'expo-print';
import { Product, Order, OrderItem } from '../../services/types';
import { useCart } from './useCart';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import debounce from 'lodash.debounce';
import { Asset } from 'expo-asset';
import axios from 'axios';

// Définir le type pour les éléments du menu
type MenuItemType = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap; // ✅ Type correct pour les icônes Ionicons
  title: string;
  screen: string;
  description: string;
  badge?: string;
  badgeColor?: string;
};

type HeaderProps = {
  navigation: any;
  showCart?: boolean;
  showSearch?: boolean;
  showOrders?: boolean;
  title?: string;
};

const HeaderComponent: React.FC<HeaderProps> = ({ 
  navigation, 
  showCart = true, 
  showSearch = true, 
  showOrders = true,
  title = "Baraka Electronique"
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  const [showPrices, setShowPrices] = useState(true);

  const getResponsiveDimensions = () => {
    const { width, height } = screenDimensions;
    const isPhone = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const isLandscape = width > height;
    
    return {
      // Header dimensions
      headerHeight: isPhone ? 56 : isTablet ? 70 : 80,
      horizontalPadding: isPhone ? 16 : isTablet ? 24 : 32,
      iconSpacing: isPhone ? 16 : isTablet ? 20 : 24,
      
      // Menu dimensions
      menuWidth: isPhone ? width * 0.9 : isTablet ? Math.min(450, width * 0.7) : Math.min(550, width * 0.5),
    
      // Réduction significative des hauteurs pour Android
      menuItemHeight: isPhone ? (Platform.OS === 'android' ? 46 : 52) : isTablet ? 60 : 68,
      menuPaddingHorizontal: isPhone ? (Platform.OS === 'android' ? 16 : 20) : isTablet ? 28 : 36,
      menuPaddingVertical: isPhone ? (Platform.OS === 'android' ? 8 : 12) : isTablet ? 16 : 20,
      
      // Typography - Réduction importante pour Android
      titleFontSize: isPhone ? (Platform.OS === 'android' ? 14 : 16) : isTablet ? 18 : 20,
      menuItemFontSize: isPhone ? (Platform.OS === 'android' ? 13 : 15) : isTablet ? 16 : 17,
      menuItemDescriptionFontSize: isPhone ? (Platform.OS === 'android' ? 10 : 11) : isTablet ? 12 : 13,
      badgeFontSize: isPhone ? (Platform.OS === 'android' ? 8 : 9) : isTablet ? 10 : 11,
      menuHeaderFontSize: isPhone ? (Platform.OS === 'android' ? 16 : 18) : isTablet ? 20 : 22,
      
      // Icons - Léger ajustement
      headerIconSize: isPhone ? (Platform.OS === 'android' ? 24 : 26) : isTablet ? 30 : 32,
      menuIconSize: isPhone ? (Platform.OS === 'android' ? 20 : 22) : isTablet ? 24 : 26,
      
      // Spacing - Réduction pour Android
      menuIconMargin: isPhone ? (Platform.OS === 'android' ? 12 : 16) : isTablet ? 20 : 24,
      menuItemSpacing: isPhone ? (Platform.OS === 'android' ? 2 : 4) : isTablet ? 6 : 8,
    };
  };

  const responsive = getResponsiveDimensions();
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
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const loadCartItems = async () => {
      try {
        const localCart = await AsyncStorage.getItem('local_cart');
        if (localCart) {
          const cartItems = JSON.parse(localCart);
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

  
  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };

  // Fonction corrigée pour la navigation avec gestion du menu
  const handleNavigation = (screenName: string) => {
    closeMenu(); // Fermer le menu d'abord
    // Petit délai pour éviter les conflits
    setTimeout(() => {
      navigation.navigate(screenName);
    }, 100);
  };

  // Fonction pour gérer le toggle des prix avec sauvegarde
  const toggleShowPrices = async () => {
    const newValue = !showPrices;
    setShowPrices(newValue);
    try {
      await AsyncStorage.setItem('showPrices', newValue.toString());
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const menuItems: Array<{
  key: string;
  icon: React.ComponentProps<typeof Ionicons>['name']; // ✅ Type dynamique
  title: string;
  screen: string;
  description: string;
  badge?: string;
  badgeColor?: string;
}> = [
  { 
    key: 'home', 
    icon: 'home-outline',
    title: 'Accueil', 
    screen: 'HomeStack',
    description: 'Retour à l\'accueil'
  },
  { 
    key: 'categories', 
    icon: 'grid-outline' as const,
    title: 'Catégories', 
    screen: 'CategoriesTab',
    description: 'Parcourir par catégorie'
  },
  { 
    key: 'brands', 
    icon: 'diamond-outline' as const,
    title: 'Nos Marques', 
    screen: 'BrandsScreen',
    description: 'Découvrir nos marques'
  },
  { 
    key: 'notifications', 
    icon: 'notifications-outline' as const,
    title: 'Notifications', 
    screen: 'NotificationsScreen',
    description: 'Vos alertes'
  },
  { 
    key: 'contacts', 
    icon: 'people-outline' as const,
    title: 'Contacts', 
    screen: 'ContactScreen',
    description: 'Nous contacter'
  },
  { 
    key: 'sale', 
    icon: 'pricetag-outline' as const,
    title: 'Produits en solde', 
    screen: 'SaleScreen',
    description: 'Offres spéciales',
    // badge: 'SOLDE'
  },
  { 
    key: 'promotions', 
    icon: 'flash-outline' as const,
    title: 'Promotions', 
    screen: 'PromotionsScreen',
    description: 'Dernières promos'
  },
  { 
    key: 'messages', 
    icon: 'chatbubble-outline' as const,
    title: 'Messages', 
    screen: 'MessagesScreen',
    description: 'Vos conversations',
    // badge: 'NOUVEAU',
    badgeColor: '#10B981'
  },
  { 
    key: 'profile', 
    icon: 'person-outline' as const,
    title: 'Mon profil', 
    screen: 'ProfileScreen',
    description: 'Gérer votre compte'
  },
  { 
    key: 'products', 
    icon: 'list-outline' as const,
    title: 'Liste des produits', 
    screen: 'ProductListScreen',
    description: 'Tous nos produits'
  },
  { 
    key: 'bulk', 
    icon: 'cloud-upload-outline' as const,
    title: 'Envoi groupé', 
    screen: 'BulkUploadScreen',
    description: 'Plusieurs produits'
  },
  { 
    key: 'catalog', 
    icon: 'library-outline' as const,
    title: 'Catalogue', 
    screen: 'CatalogueScreen',
    description: 'Parcourir le catalogue'
  },
  { 
    key: 'guide', 
    icon: 'library-outline' as const,
    title: 'Notre Guide', 
    screen: 'AppUsageGuideScreen',
    description: 'Naviguer avec aisance'
  },
] as const;


  const dynamicStyles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: responsive.headerHeight,
      paddingHorizontal: responsive.horizontalPadding,
      paddingBottom: 12,
      backgroundColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    profileText: {
      fontWeight: '700',
      color: '#1F2937',
      fontSize: responsive.titleFontSize,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      letterSpacing: Platform.OS === 'android' ? 0.2 : 0.5, // Réduction pour Android
      lineHeight: Platform.OS === 'android' ? responsive.titleFontSize * 1.1 : responsive.titleFontSize * 1.2,
    },
    iconsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: responsive.iconSpacing,
    },
    menuDropdown: {
      height: '100%',
      width: responsive.menuWidth,
      borderTopRightRadius: 0,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: responsive.menuPaddingVertical,
      paddingHorizontal: responsive.menuPaddingHorizontal,
      minHeight: responsive.menuItemHeight,
    },
    menuIcon: {
      marginRight: responsive.menuIconMargin,
      width: responsive.menuIconSize,
      textAlign: 'center',
    },
    menuItemText: {
      fontSize: responsive.menuItemFontSize,
      color: '#1F2937',
      fontWeight: Platform.OS === 'android' ? '500' : '600', // Légèrement moins gras sur Android
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      letterSpacing: Platform.OS === 'android' ? 0.1 : 0.3, // Réduction pour Android
      lineHeight: Platform.OS === 'android' ? responsive.menuItemFontSize * 1.1 : responsive.menuItemFontSize * 1.2,
      flexShrink: 1, // Permet au texte de se rétrécir si nécessaire
    },
    menuItemDescription: {
      fontSize: responsive.menuItemDescriptionFontSize,
      color: '#6B7280',
      fontWeight: '400',
      marginTop: Platform.OS === 'android' ? 1 : 2, // Réduction de l'espacement
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      lineHeight: Platform.OS === 'android' ? responsive.menuItemDescriptionFontSize * 1.1 : responsive.menuItemDescriptionFontSize * 1.2,
      flexShrink: 1, // Permet au texte de se rétrécir si nécessaire
    },
    menuBadge: {
      backgroundColor: '#EF4444',
      borderRadius: Platform.OS === 'android' ? 10 : 12, // Légèrement plus petit sur Android
      paddingHorizontal: Platform.OS === 'android' ? 6 : 8, // Réduction du padding
      paddingVertical: Platform.OS === 'android' ? 2 : 3,
      marginLeft: 4,
    },
    menuBadgeText: {
      color: '#FFFFFF',
      fontSize: responsive.badgeFontSize,
      fontWeight: '700',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      textTransform: 'uppercase',
      letterSpacing: Platform.OS === 'android' ? 0.2 : 0.5, // Réduction pour Android
    },
  });

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
      {/* Header principal */}
      <SafeAreaView style={styles.safeArea}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity 
            onPress={toggleMenu}
            activeOpacity={0.7}
            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
            style={styles.menuButton}
          >
            <Ionicons name="menu" size={responsive.headerIconSize} color="#F58320" />
          </TouchableOpacity>

          <View style={styles.profileContainer}>
            <Text style={dynamicStyles.profileText}>
              {title}
            </Text>
          </View>

          <View style={dynamicStyles.iconsContainer}>
            {showCart && (
              <TouchableOpacity 
                onPress={() => navigation.navigate("CartTab")} 
                style={styles.iconContainer}
                activeOpacity={0.7}
              >
                <Ionicons name="cart-outline" size={responsive.headerIconSize} color="#F58320" />
                {cartItemsCount > 0 && (
                  <Badge
                    value={cartItemsCount > 99 ? '99+' : cartItemsCount.toString()}
                    status="error"
                    containerStyle={styles.badgeContainer}
                    textStyle={{ 
                      fontSize: responsive.badgeFontSize,
                      fontWeight: '700'
                    }}
                  />
                )}
              </TouchableOpacity>
            )}

            {showSearch && (
              <TouchableOpacity 
                onPress={() => navigation.navigate("SearchScreen")}
                activeOpacity={0.7}
              >
                <Ionicons name="search-outline" size={responsive.headerIconSize} color="#F58320" />
              </TouchableOpacity>
            )}

            {showOrders && (
              <TouchableOpacity 
                onPress={() => navigation.navigate("OrderStatusScreen")} 
                style={styles.iconContainer}
                activeOpacity={0.7}
              >
                <Ionicons name="bag-outline" size={responsive.headerIconSize} color="#F58320" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Menu dropdown avec Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeMenu}
      >
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.menuContainer}>
                <ImageBackground
                  source={require('../../assets/images/rectangle2_menu.png')}
                  style={dynamicStyles.menuDropdown}
                  resizeMode="stretch"
                >
                  <View style={styles.menuHeader}>
                    <Text style={[styles.menuHeaderTitle, {
                      fontSize: responsive.menuHeaderFontSize,
                      lineHeight: Platform.OS === 'android' ? responsive.menuHeaderFontSize * 1.1 : responsive.menuHeaderFontSize * 1.2
                    }]}>
                      Menu Principal
                    </Text>
                  </View>

                  <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.menuScrollContainer}
                    bounces={false}
                  >
                    {menuItems.map((item) => (
                      <TouchableOpacity 
                        key={item.key}
                        onPress={() => handleNavigation(item.screen)}
                        style={dynamicStyles.menuItem}
                        activeOpacity={0.8}
                      >
                        <Ionicons 
                          name={item.icon}
                          size={responsive.menuIconSize} 
                          color="#F58320" 
                          style={dynamicStyles.menuIcon} 
                        />
                        <View style={styles.menuItemContent}>
                          <Text style={dynamicStyles.menuItemText} numberOfLines={1}>
                            {item.title}
                          </Text>
                          {screenDimensions.width >= 768 && (
                            <Text 
                              style={dynamicStyles.menuItemDescription}
                              numberOfLines={1}
                            >
                              {item.description}
                            </Text>
                          )}
                        </View>
                        {item.badge && (
                          <View style={[
                            dynamicStyles.menuBadge, 
                            item.badgeColor && { backgroundColor: item.badgeColor }
                          ]}>
                            <Text style={dynamicStyles.menuBadgeText}>{item.badge}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}

                    {/* Mode sombre */}
                    {/* <TouchableOpacity 
                      onPress={toggleTheme}
                      style={dynamicStyles.menuItem}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name="contrast-outline" 
                        size={responsive.menuIconSize} 
                        color="#F58320" 
                        style={dynamicStyles.menuIcon} 
                      />
                      <View style={styles.menuItemContent}>
                        <Text style={dynamicStyles.menuItemText} numberOfLines={1}>
                          Mode sombre
                        </Text>
                        {screenDimensions.width >= 768 && (
                          <Text 
                            style={dynamicStyles.menuItemDescription}
                            numberOfLines={1}
                          >
                            Basculer l'apparence
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity> */}

                    {/* Affichage des prix */}
                    <TouchableOpacity 
                      onPress={toggleShowPrices}
                      style={dynamicStyles.menuItem}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={showPrices ? "eye-outline" : "eye-off-outline"} 
                        size={responsive.menuIconSize} 
                        color="#F58320" 
                        style={dynamicStyles.menuIcon} 
                      />
                      <View style={styles.menuItemContent}>
                        <Text style={dynamicStyles.menuItemText} numberOfLines={1}>
                          {showPrices ? "Masquer les prix" : "Afficher les prix"}
                        </Text>
                        {screenDimensions.width >= 768 && (
                          <Text 
                            style={dynamicStyles.menuItemDescription}
                            numberOfLines={1}
                          >
                            Contrôler l'affichage
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  </ScrollView>
                </ImageBackground>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    zIndex: 100,
  },
  safeArea: {
    zIndex: 101,
  },
  fullContainer: {
    flex: 1,
  },
  menuButton: {
    padding: 4,
    borderRadius: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  menuContainer: {
    flex: 1,
  },
  profileContainer: { 
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    position: 'relative',
    padding: 4,
    borderRadius: 8,
  },
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24, // Réduction du padding pour Android
    paddingTop: Platform.OS === 'android' ? 20 : 24,
    paddingBottom: Platform.OS === 'android' ? 12 : 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuHeaderTitle: {
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: Platform.OS === 'android' ? 0.2 : 0.5, // Réduction pour Android
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuScrollContainer: {
    paddingBottom: Platform.OS === 'android' ? 60 : 80, // Réduction pour Android
  },
  menuItemContent: {
    flex: 1,
    paddingRight: Platform.OS === 'android' ? 8 : 12, // Padding pour éviter les débordements
  },
  menuSeparator: {
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: Platform.OS === 'android' ? 2 : 4, // Réduction pour Android
    marginHorizontal: Platform.OS === 'android' ? 20 : 24,
  },
  menuSwitch: {
    transform: Platform.OS === 'ios' 
      ? [{ scaleX: 0.9 }, { scaleY: 0.9 }] 
      : [{ scaleX: 1.0 }, { scaleY: 1.0 }] // Taille normale pour Android
  },
  menuFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  menuFooterText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
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

export default HeaderComponent;