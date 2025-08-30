/**
 * Ce fichier définit l'écran de gestion des objectifs.
 * Il permet à l'utilisateur de créer, suivre et supprimer des objectifs.
 *
 * @module bestsellers
 */
import React, { useState, useEffect, useRef } from 'react';
import HeaderComponent from './HeaderComponent';
import { View, Text, FlatList, StyleSheet,
  Dimensions, Image, TouchableOpacity, TextInput,
  Platform, AppState, Alert, ScrollView,TouchableWithoutFeedback, Switch,ImageBackground,
  StatusBar, } from 'react-native';
import { goalsData, Goal, MiniTask } from '../../data/goalsData';
// import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { Icon, Badge } from 'react-native-elements';
import { useCart } from './useCart';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import { Product, Order, OrderItem } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';

/**
 * Type pour les catégories d'objectifs.
 */
type Category = 'Ordinateurs' | 'Tablettes' | 'Télévisions' | 'Disques durs' | 'Casques' | 'Souris';


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
/**
 * Composant pour l'écran des objectifs.
 * @returns {JSX.Element} L'écran des objectifs.
 */


type VideoScreenProps = {
  navigation: any;
  route?: any; // Ajout de la route pour la navigation
};

const bestsellers: React.FC<VideoScreenProps> = ({ navigation, route }) => {
  const [goals, setGoals] = useState<Goal[]>(goalsData);
  const [newGoalTitle, setNewGoalTitle] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Tous'>('Tous');
  const [newGoalCategory, setNewGoalCategory] = useState<Category>('Ordinateurs');
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  const theme = isDarkMode ? darkTheme : lightTheme;
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
  const [menuVisible, setMenuVisible] = useState(false);

  
  const { addedProduct } = route.params || {};
  const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const allCartItems = [...localCartItems, ...orders];
    const [token, setToken] = useState<string | null>(null);
  
  // const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  // const allCartItems = [...localCartItems, ...orders];
  
  const { loadCart } = useCart();

  const totalCartItems = allCartItems.reduce((total, order) => {
    return total + order.items.reduce((sum, item) => sum + item.quantity, 0);
  }, 0);

  const { cartItems, saveCart } = useCart();

  // CORRECTION 3: Mettre à jour le hook useCart quand allCartItems change
  useEffect(() => {
    // Synchroniser le hook useCart avec les données locales du panier
    const updateCartHook = async () => {
      await saveCart(allCartItems);
    };
    updateCartHook();
  }, [allCartItems.length]); // Surveiller les changements dans le panier

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

  // Charger le panier local depuis AsyncStorage
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
    // Charger le panier local au démarrage
    loadLocalCart();
    
    // Gestion du produit ajouté depuis d'autres écrans
    if (addedProduct) {
      // Vérifier si c'est un produit local (ID commence par "local_")
      if (addedProduct.id.startsWith('local_')) {
        // Mettre à jour directement le state local
        setLocalCartItems(prev => {
          const existingIndex = prev.findIndex(item => 
            item.items.some(orderItem => 
              orderItem.product.id === addedProduct.items[0].product.id
            )
          );
          
          if (existingIndex !== -1) {
            // Mettre à jour la quantité
            const updatedItems = [...prev];
            updatedItems[existingIndex].items[0].quantity += addedProduct.items[0].quantity;
            updatedItems[existingIndex].total_price = (
              parseFloat(updatedItems[existingIndex].items[0].unit_price) * 
              updatedItems[existingIndex].items[0].quantity
            ).toString();
            return updatedItems;
          } else {
            // Ajouter le nouveau produit
            return [...prev, addedProduct];
          }
        });
      } else {
        // Produit provenant de l'API
        setOrders(prev => [...prev, addedProduct]);
      }
    }
    
  }, [token, addedProduct]);

  
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
  // Fonction pour basculer l'état d'une mini-tâche
  const toggleMiniTaskCompletion = (goalId: number, miniTaskId: number) => {
    setGoals((prevGoals) =>
      prevGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              miniTasks: goal.miniTasks.map((miniTask) =>
                miniTask.id === miniTaskId
                  ? { ...miniTask, completed: !miniTask.completed }
                  : miniTask
              ),
            }
          : goal
      )
    );
  };

  // Filtrer les objectifs par catégorie
  const filteredGoals = selectedCategory === 'Tous' 
    ? goals 
    : goals.filter((goal) => goal.category === selectedCategory);

  // Catégories disponibles
  const categories: Category[] = ['Ordinateurs', 'Tablettes', 'Télévisions', 'Disques durs', 'Casques', 'Souris'];

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
              {/* Barre des tâches fixe en haut */}
        <HeaderComponent 
          navigation={navigation}
          title="Nos Meilleures Ventes"
          // showCart={false} // Optionnel: masquer l'icône panier
        />

      {/* Catégories */}
      <View style={styles.categories}>
        <Text style={styles.sectionTitle}>Catégories de produits</Text>
        <View style={styles.categoryGrid}>
          {/* Ordi bureau */}
          <View style={styles.category}>
            <Image
              source={require("../../assets/images/baraka_images/ordi_bureau.png")} // Exemple d'image
              style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Ordinateurs de bureau</Text>
          </View>

          {/* TV */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/télévision.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Télévisions</Text>
          </View>

          {/* Souris */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/souris.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Souris</Text>
          </View>

          {/* Casques */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/casque.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Casques audios</Text>
          </View>

          
          {/* Ordi bureau */}
          <View style={styles.category}>
            <Image
              source={require("../../assets/images/baraka_images/ordi_bureau.png")} // Exemple d'image
              style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Ordinateurs de bureau</Text>
          </View>

          {/* TV */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/télévision.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Télévisions</Text>
          </View>

          {/* Souris */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/souris.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Souris</Text>
          </View>

          {/* Casques */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/casque.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Casques audios</Text>
          </View>

          
          {/* Ordi bureau */}
          <View style={styles.category}>
            <Image
              source={require("../../assets/images/baraka_images/ordi_bureau.png")} // Exemple d'image
              style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Ordinateurs de bureau</Text>
          </View>

          {/* TV */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/télévision.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Télévisions</Text>
          </View>

          {/* Souris */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/souris.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Souris</Text>
          </View>

          {/* Casques */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/casque.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Casques audios</Text>
          </View>
        </View>
      </View>
    </ScrollView>
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

    time: {
        fontSize: 16,
        fontWeight: "bold",
    },
    icons: {
        flexDirection: "row",
    },
    icon: {
        height: 27,
        width: 27,
        // marginHorizontal: 10, // Espacement entre les icônes
    },
    circle: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "black",
        marginHorizontal: 2,
    },
    newArrivals: {
        flexDirection: 'row', // Aligner le texte et les images horizontalement
        alignItems: 'center', // Centrer verticalement
        justifyContent: 'space-between', // Espacer le texte et les images
        padding: 10,
      },
      newArrivalsText: {
        color: '#FF6600', // Couleur orange du texte
        fontSize: 16,
        fontWeight: 'bold',
      },
      imageContainer: {
        flexDirection: 'row', // Empile les images horizontalement
        alignItems: 'center',
      },
      appareilsImage: {
        width: 180, // Ajuste la largeur pour correspondre à l’image
        height: 100, // Ajuste la hauteur
        resizeMode: 'contain', // Empêche la distorsion
      },
    categories: {
        marginVertical: 10,
    },
    sectionTitle: {
      marginTop: 20,
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
      color: '#2c3e50',
        // fontSize: 18,
        // fontWeight: "bold",
        // marginBottom: 10,
    },
    categoryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    category: {
        width: "48%",
        alignItems: "center",
        marginBottom: 10,
    },
    categoryImage: {
        width: 150,
        height: 100,
        marginBottom: 5,
        // borderWidth: 1, // Épaisseur de la bordure
        backgroundColor: "#f1f1f1", // Couleur grise claire
        borderRadius: 8,
    },
    categoryText: {
        textAlign: "center",
    },
    viewMore: {
        color: "blue",
        marginTop: 5,
        textAlign: "right",
    },
    featuredProducts: {
        marginVertical: 10,
    },
    productGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    product: {
        width: "48%",
        alignItems: "center",
        marginBottom: 10,
    },
    productImage: {
        width: 150,
        height: 100,
        marginBottom: 5,
        // borderWidth: 1, // Épaisseur de la bordure
        backgroundColor: "#f1f1f1", // Couleur grise claire
        borderRadius: 8,
    },
    productText: {
        textAlign: "center",
    },
    promo: {
        backgroundColor: "orange",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        marginVertical: 20,
    },
    promoText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "white",
    },
    promoDetails: {
        fontSize: 16,
        color: "white",
        textAlign: "center",
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
export default bestsellers;