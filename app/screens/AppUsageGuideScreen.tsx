/**
 * Ce fichier définit l'écran du guide d'utilisation de l'application.
 * Il fournit des instructions complètes sur toutes les fonctionnalités de l'application.
 *
 * @module AppUsageGuideScreen
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableWithoutFeedback,
  StatusBar,ImageBackground,
  Platform, AppState,
  Dimensions, TouchableOpacity, Switch, Animated } from 'react-native';
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

type VideoScreenProps = {
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
    // Colonnes adaptatives - ajustez en fonction de la largeur
    productColumns: 2,
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

const AppUsageGuideScreen: React.FC<VideoScreenProps> = ({ navigation, route }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  const theme = isDarkMode ? darkTheme : lightTheme;
  // const responsive = getResponsiveDimensions();
  const [menuVisible, setMenuVisible] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});
  
  const { addedProduct } = route.params || {};
  const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const allCartItems = [...localCartItems, ...orders];
  const [token, setToken] = useState<string | null>(null);
  
  const { loadCart } = useCart();
  const totalCartItems = allCartItems.reduce((total, order) => {
    return total + order.items.reduce((sum, item) => sum + item.quantity, 0);
  }, 0);

  const { cartItems, saveCart } = useCart();
  const [cartItemsCount, setCartItemsCount] = useState(0);
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

  useEffect(() => {
    const updateCartHook = async () => {
      await saveCart(allCartItems);
    };
    updateCartHook();
  }, [allCartItems.length]);

  const addToCart = async (product) => {
    const newItems = [...cartItems, product];
    await saveCart(newItems);
  };

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  const loadLocalCart = async () => {
    try {
      const localCart = await AsyncStorage.getItem('local_cart');
      if (localCart) {
        const cartItems = JSON.parse(localCart);
        setLocalCartItems(cartItems);
      }
    } catch (error) {
      console.warn('Erreur lors du chargement du panier local:', error);
    }
  };

  useEffect(() => {
    loadLocalCart();
    
    if (addedProduct) {
      if (addedProduct.id.startsWith('local_')) {
        setLocalCartItems(prev => {
          const existingIndex = prev.findIndex(item => 
            item.items.some(orderItem => 
              orderItem.product.id === addedProduct.items[0].product.id
            )
          );
          
          if (existingIndex !== -1) {
            const updatedItems = [...prev];
            updatedItems[existingIndex].items[0].quantity += addedProduct.items[0].quantity;
            updatedItems[existingIndex].total_price = (
              parseFloat(updatedItems[existingIndex].items[0].unit_price) * 
              updatedItems[existingIndex].items[0].quantity
            ).toString();
            return updatedItems;
          } else {
            return [...prev, addedProduct];
          }
        });
      } else {
        setOrders(prev => [...prev, addedProduct]);
      }
    }
  }, [token, addedProduct]);

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

  const handleNavigation = (screenName: string) => {
    closeMenu();
    navigation.navigate(screenName);
  };

  const closeMenu = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const FeatureCard = ({ icon, title, description, isExpanded, onToggle }) => (
    <TouchableOpacity 
      style={[styles.featureCard, { backgroundColor: theme.background || '#fff' }]} 
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.featureHeader}>
        <View style={styles.featureIconContainer}>
          <Ionicons name={icon} size={24} color="#F58320" />
        </View>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{title}</Text>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={theme.text} 
        />
      </View>
      {isExpanded && (
        <View style={styles.featureDescription}>
          <Text style={[styles.featureDescriptionText, { color: theme.text }]}>
            {description}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const sections = [
    {
      id: 'navigation',
      title: '🧭 Navigation Principale',
      subtitle: 'Découvrez les sections de l\'application',
      features: [
        { icon: 'home-outline', title: 'Accueil', description: 'Découvrez les produits phares, promotions exclusives et nouveautés. L\'écran d\'accueil est votre point de départ pour explorer notre catalogue.' },
        { icon: 'grid-outline', title: 'Produits', description: 'Parcourez notre catalogue complet organisé par catégories. Utilisez les filtres pour affiner votre recherche selon vos besoins.' },
        { icon: 'search-outline', title: 'Recherche', description: 'Trouvez rapidement des produits spécifiques grâce à notre moteur de recherche intelligent avec suggestions automatiques.' },
        { icon: 'cart-outline', title: 'Panier', description: 'Gérez vos articles avant paiement. Modifiez les quantités, supprimez des articles et calculez le total en temps réel.' }
      ]
    },
    {
      id: 'search',
      title: '🔍 Recherche Avancée',
      subtitle: 'Outils puissants pour trouver vos produits',
      features: [
        { icon: 'options-outline', title: 'Filtres Intelligents', description: 'Filtrez par catégorie, fourchette de prix, marque, disponibilité et notes clients pour des résultats précis.' },
        { icon: 'time-outline', title: 'Historique', description: 'Retrouvez facilement vos recherches précédentes et vos produits consultés récemment.' },
        { icon: 'star-outline', title: 'Tendances', description: 'Découvrez les produits les plus populaires et les meilleures ventes du moment.' }
      ]
    },
    {
      id: 'products',
      title: '📱 Détails Produits',
      subtitle: 'Informations complètes sur chaque article',
      features: [
        { icon: 'images-outline', title: 'Galerie Photo', description: 'Visualisez les produits sous tous les angles avec zoom haute définition et mode plein écran.' },
        { icon: 'document-text-outline', title: 'Fiche Technique', description: 'Accédez aux caractéristiques détaillées, spécifications techniques et informations de compatibilité.' },
        { icon: 'chatbubble-outline', title: 'Avis Clients', description: 'Lisez les retours d\'expérience authentiques et les notes attribuées par d\'autres acheteurs.' }
      ]
    },
    {
      id: 'cart',
      title: '🛒 Gestion du Panier',
      subtitle: 'Contrôlez vos achats en toute simplicité',
      features: [
        { icon: 'add-circle-outline', title: 'Ajout Rapide', description: 'Augmentez les quantités d\'un simple tap. Le total se met à jour automatiquement.' },
        { icon: 'remove-circle-outline', title: 'Ajustement', description: 'Diminuez les quantités ou retirez complètement un article de votre panier.' },
        { icon: 'card-outline', title: 'Paiement Sécurisé', description: 'Procédez au paiement avec nos solutions sécurisées : carte bancaire, mobile money, etc.' }
      ]
    },
    {
      id: 'profile',
      title: '👤 Votre Profil',
      subtitle: 'Gérez votre compte et vos préférences',
      features: [
        { icon: 'list-outline', title: 'Mes Commandes', description: 'Suivez vos commandes en temps réel, consultez l\'historique et téléchargez vos factures.' },
        { icon: 'settings-outline', title: 'Paramètres', description: 'Personnalisez votre expérience : notifications, langue, adresses de livraison, moyens de paiement.' },
        { icon: 'moon-outline', title: 'Mode Sombre', description: 'Activez le thème sombre pour un confort visuel optimal, surtout en soirée.' }
      ]
    }
  ];

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
              {/* Barre des tâches fixe en haut */}
        <HeaderComponent 
          navigation={navigation}
          title="Notre Guide d'Utilisation"
          // showCart={false} // Optionnel: masquer l'icône panier
        />

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: theme.background || '#fff' }]}>
          <View style={styles.heroIcon}>
            <Ionicons name="book-outline" size={48} color="#F58320" />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Guide d'Utilisation</Text>
          <Text style={[styles.heroSubtitle, { color: theme.text }]}>
            Découvrez toutes les fonctionnalités de votre application Baraka Electronique
          </Text>
        </View>

        {/* Sections */}
        {sections.map((section) => (
          <View key={section.id} style={[styles.sectionContainer, { backgroundColor: theme.background || '#fff' }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.text }]}>{section.subtitle}</Text>
            </View>
            
            <View style={styles.featuresContainer}>
              {section.features.map((feature, index) => (
                <FeatureCard
                  key={`${section.id}-${index}`}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  isExpanded={expandedSections[`${section.id}-${index}`]}
                  onToggle={() => toggleSection(`${section.id}-${index}`)}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Section Contact */}
        <View style={[styles.contactSection, { backgroundColor: '#F58320' }]}>
          <View style={styles.contactHeader}>
            <Ionicons name="headset-outline" size={32} color="white" />
            <Text style={styles.contactTitle}>Besoin d'Aide ?</Text>
          </View>
          <Text style={styles.contactSubtitle}>
            Notre équipe support est là pour vous accompagner
          </Text>
          
          <View style={styles.contactMethods}>
            <TouchableOpacity style={styles.contactMethod}>
              <Ionicons name="mail-outline" size={24} color="white" />
              <Text style={styles.contactText}>support@barakasn.com</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.contactMethod}>
              <Ionicons name="call-outline" size={24} color="white" />
              <Text style={styles.contactText}>+229 XX XX XX XX</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.contactMethod}>
              <Ionicons name="time-outline" size={24} color="white" />
              <Text style={styles.contactText}>Lun-Sam : 8h-18h</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 8, // Réduit encore plus l'espacement général
    // paddingTop: 10,
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

  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 120,
    paddingBottom: 30,
  },
  heroSection: {
    margin: 20,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroIcon: {
    backgroundColor: 'rgba(245, 131, 32, 0.1)',
    borderRadius: 50,
    padding: 20,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 24,
  },
  sectionContainer: {
    margin: 20,
    marginTop: 10,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  featuresContainer: {
    gap: 12,
  },
  featureCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 131, 32, 0.1)',
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconContainer: {
    backgroundColor: 'rgba(245, 131, 32, 0.1)',
    borderRadius: 12,
    padding: 8,
    marginRight: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  featureDescription: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 131, 32, 0.1)',
  },
  featureDescriptionText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  contactSection: {
    margin: 20,
    marginTop: 10,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  contactHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
  },
  contactSubtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.9,
  },
  contactMethods: {
    width: '100%',
    gap: 16,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
  },
  contactText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
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
  },

  
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  errorBanner: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    marginTop: 10,
  },
  errorText: {
    color: '#c0392b',
    fontSize: 14,
  },
  productCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 5,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2, // Android
    shadowColor: '#000', // iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  productIndex: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  indexText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  endMessage: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
  },
  endMessageText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '500',
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

export default AppUsageGuideScreen;