import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Platform, AppState,
  TextInput, Alert, ActivityIndicator,
  Dimensions, TouchableWithoutFeedback, Switch, FlatList } from 'react-native'; // Ajouter FlatList
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { getProductsPaginated } from '../../services/apiService'; // Supprimer getProducts et getProducts50Simple
import { Product } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Icon, Badge } from 'react-native-elements';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import { useCart } from './useCart';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';
import { Order, OrderItem } from '../../services/types';

type ProductListScreenProps = {
  navigation: any;
  route: any;
};

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
    isSmallScreen: width < 375,productColumns: 2,
    categoryColumns: width > 600 ? (width > 900 ? 6 : 5) : 4,
    horizontalPadding: isTablet ? 30 : 20,
    verticalPadding: isTablet ? 25 : 15,
    cardWidth: isLargeScreen ? (width - 80) / 4 : isTablet ? (width - 70) / 3 : (width - 50) / 2,
    headerHeight: isTablet ? 80 : 60,
    bannerHeight: isTablet ? 200 : 180,
    productImageHeight: isTablet ? 150 : 120,
    categoryImageSize: isTablet ? 80 : 60,
    titleFontSize: isTablet ? 22 : 18,
    subtitleFontSize: isTablet ? 18 : 16,
    bodyFontSize: isTablet ? 16 : 14,
    captionFontSize: isTablet ? 14 : 12,
    sectionSpacing: isTablet ? 35 : 25,
    itemSpacing: isTablet ? 20 : 15,
  };
};

const ProductListScreen: React.FC<ProductListScreenProps> = ({ navigation, route }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const viewRef = useRef(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const responsive = getResponsiveDimensions();
  const [menuVisible, setMenuVisible] = useState(false);

  // Variables pour la pagination
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [categories, setCategories] = useState<Array<{ id: string; name: string; productCount: number; image?: string }>>([]);

  const { addedProduct } = route.params || {};
  const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const allCartItems = [...localCartItems, ...orders];
  const [token, setToken] = useState<string | null>(null);
  
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

  // Timer pour le chargement automatique
const autoLoadTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  // Fonction pour charger les produits avec pagination
  const fetchProducts = async (page: number = 1, append: boolean = false) => {
    if (!token) return;

    try {
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      setLoadingError(null);
      
      // Utiliser la fonction de pagination
      const response = await getProductsPaginated(token, page, 20);
      
      console.log(`Page ${page}: ${response.results.length} produits récupérés`);
      
      if (append) {
        setAllProducts(prev => [...prev, ...response.results]);
      } else {
        setAllProducts(response.results);
        
        // Mettre à jour les catégories seulement pour la première page
        const categoryMap = new Map();
        response.results.forEach(product => {
          const categoryName = product.category.name;
          if (categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, {
              ...categoryMap.get(categoryName),
              productCount: categoryMap.get(categoryName).productCount + 1
            });
          } else {
            categoryMap.set(categoryName, {
              id: product.category.id || categoryName,
              name: categoryName,
              productCount: 1,
              image: product.images?.[0]?.image
            });
          }
        });
        
        const categoriesArray = Array.from(categoryMap.values());
        setCategories(categoriesArray);
      }
      
      // Vérifier s'il y a plus de pages
      setHasMore(response.next !== null);
      setCurrentPage(page);
      
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      setLoadingError('Échec du chargement des produits');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProducts(1, false);
    }
  }, [token]);

  // Effet pour le chargement automatique tous les 20 produits
  useEffect(() => {
    if (allProducts.length > 0 && hasMore && !isLoading && !isLoadingMore) {
      // Calculer combien de produits ont été chargés
      const loadedCount = allProducts.length;
      
      // Vérifier si on a atteint un multiple de 20
      if (loadedCount % 20 === 0) {
        // Déclencher le chargement automatique après un court délai
        autoLoadTimerRef.current = setTimeout(() => {
          fetchProducts(currentPage + 1, true);
        }, 1000); // 1 seconde de délai pour éviter les requêtes trop rapides
      }
    }

    // Nettoyer le timer lors du démontage
    return () => {
  if (autoLoadTimerRef.current !== null) {
    clearTimeout(autoLoadTimerRef.current);
  }
};
  }, [allProducts.length, hasMore, isLoading, isLoadingMore, currentPage]);

  // Filtrer les produits selon la recherche
  const filteredProducts = allProducts.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fonction pour forcer manuellement le chargement de plus de produits
  const loadMoreProducts = () => {
    if (!isLoadingMore && hasMore) {
      fetchProducts(currentPage + 1, true);
    }
  };

  const closeMenu = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
  };

  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };

  const generatePDF = async () => {
    try {
      setIsLoading(true);
      
      const productsToExport = searchQuery ? filteredProducts : allProducts;
      
      console.log('Produits à exporter:', productsToExport.length);
      
      if (productsToExport.length === 0) {
        Alert.alert('Aucun produit', 'Aucun produit à exporter en PDF');
        return;
      }

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial; margin: 20px; }
              h1 { color: #F58320; text-align: center; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #F58320; color: white; padding: 12px; text-align: left; }
              td { padding: 10px; border-bottom: 1px solid #ddd; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
            </style>
          </head>
          <body>
            <h1>Liste des Produits</h1>
            <div>Date d'export: ${new Date().toLocaleDateString('fr-FR')}</div>
            <div>Nombre de produits: ${productsToExport.length}</div>
            
            <table>
              <tr>
                <th>Nom</th>
                <th>Prix (FCFA)</th>
              </tr>
              ${productsToExport.map(product => {
                const price = product.prices && product.prices.length > 0 
                  ? product.prices[0].price 
                  : '0';
                
                return `
                  <tr>
                    <td>${product.name || 'Nom non disponible'}</td>
                    <td>${formatPrice(price)}</td>
                  </tr>
                `;
              }).join('')}
            </table>
            
            <div class="footer">
              Généré par BARAKA - ${new Date().getFullYear()}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ 
        html,
        width: 842,
        height: 595,
        base64: false
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Exporter les produits',
          UTI: 'com.adobe.pdf'
        });
      } else {
        const pdfName = `Produits_${new Date().toISOString().slice(0,10)}.pdf`;
        const newUri = `${FileSystem.documentDirectory}${pdfName}`;
        
        await FileSystem.copyAsync({ from: uri, to: newUri });
        Alert.alert(
          'PDF sauvegardé', 
          `Le fichier a été enregistré dans vos documents.`
        );
      }
      
    } catch (error) {
      console.error('Erreur PDF:', error);
      Alert.alert(
        'Erreur', 
        'Une erreur est survenue lors de la génération du PDF'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de rendu pour chaque produit
  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={[styles.tableRow, { backgroundColor: theme.background }]}>
      <Text style={[styles.cell, styles.nameCell, { color: theme.text }]} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={[styles.cell, styles.priceCell, { color: '#F58320' }]}>
        {item.prices && item.prices.length > 0 
          ? formatPrice(item.prices[0].price) 
          : 'N/A'
        } FCFA
      </Text>
    </View>
  );

  // Fonction de rendu pour le pied de page
  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#F58320" />
          <Text style={styles.footerText}>Chargement automatique...</Text>
        </View>
      );
    }
    
    if (!hasMore && allProducts.length > 0) {
      return (
        <View style={styles.endMessage}>
          <Text style={styles.endMessageText}>
            Tous les produits ont été chargés ({allProducts.length} produits)
          </Text>
        </View>
      );
    }
    
    return null;
  };

  if (isLoading && currentPage === 1) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F58320" />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Chargement des produits...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: '#F58320' }]}
          onPress={() => fetchProducts(1, false)}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#F58320" />
        </TouchableOpacity>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Ionicons name="search-outline" size={22} color="#F58320" />
        </View>
      </View>

      <View ref={viewRef} style={styles.tableContainer}>
        <View style={[styles.tableHeader, { backgroundColor: theme.header.background }]}>
          <Text style={[styles.headerCell, styles.nameCell, { color: theme.header.text }]}>Nom</Text>
          <Text style={[styles.headerCell, styles.priceCell, { color: theme.header.text }]}>Prix</Text>
        </View>

        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id.toString()}
          ListFooterComponent={renderFooter}
          onEndReached={loadMoreProducts} // Chargement manuel au scroll
          onEndReachedThreshold={0.1}
          showsVerticalScrollIndicator={true}
        />
      </View>

      <TouchableOpacity 
        style={styles.exportButton}
        onPress={generatePDF}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="download-outline" size={20} color="white" />
            <Text style={styles.exportButtonText}>Exporter PDF</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={[styles.resultsCount, { color: theme.text }]}>
        {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} trouvé{filteredProducts.length !== 1 ? 's' : ''}
        {hasMore && ` (Chargement automatique tous les 20 produits...)`}
      </Text>

      {/* Bouton pour forcer manuellement le chargement */}
      {hasMore && (
        <TouchableOpacity 
          style={[styles.exportButton, { marginTop: 10 }]}
          onPress={loadMoreProducts}
          disabled={isLoadingMore}
        >
          <Text style={styles.exportButtonText}>
            {isLoadingMore ? 'Chargement...' : 'Charger plus de produits'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingVertical: 50,
  },
  exportButton: {
    flexDirection: 'row',
    backgroundColor: '#F58320',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  exportButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  errorText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginTop: -50,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginLeft: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  
  // Nouveau container pour les icônes avec espacement adaptatif
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  icon1Container: {
    position: 'relative',
  },
  searchIcon: {
    marginLeft: 10,
  },
  headerText: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 36,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tableContainer: {
    flex: 1,
    marginTop: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  cell: {
    fontSize: 14,
    paddingHorizontal: 4,
  },
  nameCell: {
    flex: 2,
  },
  priceCell: {
    flex: 1,
    textAlign: 'right',
  },
  resultsCount: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
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

export default ProductListScreen;