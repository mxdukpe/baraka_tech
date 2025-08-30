/**
 * Écran dédié à l'affichage des produits récents (14 derniers jours + 90 derniers jours)
 * Accessible via la bannière "Nouveaux produits"
 *
 * @module NewArrivalsScreen
 */
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, Switch,
  FlatList,RefreshControl,
  Dimensions, 
  TouchableOpacity,
  ScrollView, 
  Image,Alert,
  StatusBar, ImageBackground,
  ActivityIndicator,TouchableWithoutFeedback,
  TextInput,
  Platform, AppState,
  Modal
} from 'react-native';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { Badge } from 'react-native-elements';
import { getProducts, getProducts50Simple, getProductsPaginated } from '../../services/apiService';
import {  Product } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderComponent from './HeaderComponent';

type NewArrivalsScreenProps = {
  navigation: any;
  route: any;
};

// Fonction utilitaire pour calculer si un produit est récent (14 jours)
const isRecentProduct = (createdDate: string) => {
  const now = new Date();
  const productDate = new Date(createdDate);
  const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
  return productDate >= fourteenDaysAgo && productDate <= now;
};

// Fonction utilitaire pour calculer si un produit est dans les 90 derniers jours
const isNinetyDaysProduct = (createdDate: string) => {
  const now = new Date();
  const productDate = new Date(createdDate);
  const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
  const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
  return productDate >= ninetyDaysAgo && productDate < fourteenDaysAgo;
};

// Fonction pour calculer le nombre de jours depuis la création
const getDaysAgo = (createdDate: string) => {
  const now = new Date();
  const productDate = new Date(createdDate);
  const diffTime = now.getTime() - productDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};


const getResponsiveDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isLargeScreen = width >= 1024;
  const isLandscape = width > height;
  const isPortrait = height > width;
  
  // Calculer les colonnes en fonction de l'orientation et de la taille d'écran
  let productColumns = 2; // Par défaut
  let categoryColumns = 2;
  let sidebarWidth = 200;
  
  if (isLandscape) {
    // En mode paysage
    if (isLargeScreen) {
      productColumns = 2;
      categoryColumns = 3;
      sidebarWidth = 280;
    } else if (isTablet) {
      productColumns = 2;
      categoryColumns = 3;
      sidebarWidth = 250;
    } else {
      productColumns = 2;
      categoryColumns = 2;
      sidebarWidth = 200;
    }
  } else {
    // En mode portrait
    if (isLargeScreen) {
      productColumns = 2;
      categoryColumns = 2;
      sidebarWidth = 300;
    } else if (isTablet) {
      productColumns = 2;
      categoryColumns = 2;
      sidebarWidth = 250;
    } else {
      productColumns = 2;
      categoryColumns = 2;
      sidebarWidth = width < 400 ? 180 : 200;
    }
  }
  
  // Ajustements pour les très petits écrans
  if (width < 375) {
    productColumns = Math.max(1, productColumns - 1);
    categoryColumns = Math.max(1, categoryColumns - 1);
    sidebarWidth = Math.min(160, sidebarWidth);
  }
  
  // Calculer les dimensions des cartes en fonction du nombre de colonnes
  const availableWidth = width - sidebarWidth - 40; // 40 pour les paddings
  const cardSpacing = isTablet ? 12 : 8;
  const totalSpacing = cardSpacing * (productColumns + 1);
  const productCardWidth = (availableWidth - totalSpacing) / productColumns;
  const categoryCardWidth = (availableWidth - (cardSpacing * (categoryColumns + 1))) / categoryColumns;
  
  return {
    width,
    height,
    isTablet,
    isLargeScreen,
    isLandscape,
    isPortrait,
    isSmallScreen: width < 375,
    productColumns,
    categoryColumns,
    sidebarWidth,
    
    // Dimensions calculées dynamiquement
    productCardWidth: Math.max(140, productCardWidth), // Minimum 140px
    categoryCardWidth: Math.max(150, categoryCardWidth), // Minimum 150px
    
    // Padding adaptatif
    horizontalPadding: isTablet ? 20 : 16,
    verticalPadding: isTablet ? 20 : 16,
    
    // Espacement entre les produits - adaptatif
    productSpacing: isLandscape ? (isTablet ? 12 : 8) : (isTablet ? 10 : 6),
    productMargin: isLandscape ? (isTablet ? 8 : 6) : (isTablet ? 6 : 4),
    
    // Hauteurs adaptatives
    headerHeight: isTablet ? 70 : 60,
    productImageHeight: isLandscape ? (isTablet ? 140 : 120) : (isTablet ? 160 : 140),
    categoryImageSize: isTablet ? 70 : 60,
    
    // Tailles de police adaptatives
    titleFontSize: isTablet ? 20 : (isLandscape ? 16 : 18),
    subtitleFontSize: isTablet ? 16 : (isLandscape ? 13 : 14),
    bodyFontSize: isTablet ? 15 : (isLandscape ? 12 : 13),
    captionFontSize: isTablet ? 13 : (isLandscape ? 10 : 11),
    
    // Espacements adaptatifs
    sectionSpacing: isTablet ? 24 : (isLandscape ? 16 : 20),
    itemSpacing: isTablet ? 16 : (isLandscape ? 10 : 12),
  };
};

const NewArrivalsScreen: React.FC<NewArrivalsScreenProps> = ({ navigation, route }) => {
  // États principaux
  const [recentProducts, setRecentProducts] = useState<Product[]>([]); // 14 derniers jours
  const [olderProducts, setOlderProducts] = useState<Product[]>([]); // 90 derniers jours (hors 14 derniers)
  const [filteredRecentProducts, setFilteredRecentProducts] = useState<Product[]>([]);
  const [filteredOlderProducts, setFilteredOlderProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  
  // États pour les modals
  const [showNewProductsModal, setShowNewProductsModal] = useState(false);
  const [showAvailableAgainModal, setShowAvailableAgainModal] = useState(false);

  const { isDarkMode, toggleTheme } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  const [responsive, setResponsive] = useState(getResponsiveDimensions());
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  const [showPrices, setShowPrices] = useState(true);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
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

  // Récupérer le token depuis AsyncStorage
  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('access_token');
        console.log('Token récupéré:', storedToken ? 'Token présent' : 'Aucun token');
        setToken(storedToken);
      } catch (err) {
        console.error('Erreur lors de la récupération du token:', err);
        setError('Erreur lors de la récupération des données d\'authentification');
      } finally {
        setTokenChecked(true);
      }
    };
    getToken();
  }, []);

  // Fonction pour récupérer les produits récents (14 derniers jours)
  const fetchRecentProducts = useCallback(async (authToken: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
      
      // Format dates pour l'API (YYYY-MM-DD)
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      
      // Essayer d'abord avec le filtrage par date de l'API
      let response = await fetch(
        `https://backend.barakasn.com/api/v0/products/products/?created_at_after=${formatDate(fourteenDaysAgo)}&created_at_before=${formatDate(now)}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        // Si l'API ne supporte pas le filtrage par date, utiliser getProductsPaginated
        console.log('Filtrage par date non supporté, récupération via pagination...');
        const paginatedResponse = await getProductsPaginated(authToken, 1, 100);
        const allProducts = paginatedResponse.results || [];
        
        // Filtrer localement les produits des 14 derniers jours
        const recent = allProducts.filter(product => isRecentProduct(product.created_at));
        setRecentProducts(recent);
        setFilteredRecentProducts(recent);
        
        // Initialiser les quantités
        const initialQuantities = recent.reduce((acc: Record<string, number>, product: Product) => {
          acc[product.id.toString()] = 0;
          return acc;
        }, {});
        setProductQuantities(initialQuantities);
        
        return;
      }
      
      const data = await response.json();
      const recent = data.results || [];
      setRecentProducts(recent);
      setFilteredRecentProducts(recent);
      
      // Initialiser les quantités
      const initialQuantities = recent.reduce((acc: Record<string, number>, product: Product) => {
        acc[product.id.toString()] = 0;
        return acc;
      }, {});
      setProductQuantities(initialQuantities);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des produits récents:', error);
      setError('Erreur lors de la récupération des produits récents');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fonction pour récupérer les produits plus anciens (90 derniers jours hors 14 derniers)
  const fetchOlderProducts = useCallback(async (authToken: string) => {
    try {
      setLoadingOlder(true);
      
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
      const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      
      // Format dates pour l'API (YYYY-MM-DD)
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      
      // Essayer avec le filtrage par date de l'API
      let response = await fetch(
        `https://backend.barakasn.com/api/v0/products/products/?created_at_after=${formatDate(ninetyDaysAgo)}&created_at_before=${formatDate(fourteenDaysAgo)}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        // Fallback: récupérer plus de produits et filtrer localement
        console.log('Filtrage par date non supporté pour les produits plus anciens, récupération via pagination...');
        const paginatedResponse = await getProductsPaginated(authToken, 1, 200);
        const allProducts = paginatedResponse.results || [];
        
        // Filtrer localement les produits des 90 derniers jours (hors 14 derniers)
        const older = allProducts.filter(product => isNinetyDaysProduct(product.created_at));
        setOlderProducts(older);
        setFilteredOlderProducts(older);
        
        return;
      }
      
      const data = await response.json();
      const older = data.results || [];
      setOlderProducts(older);
      setFilteredOlderProducts(older);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des produits plus anciens:', error);
      // Ne pas définir d'erreur pour les produits plus anciens car ils sont optionnels
    } finally {
      setLoadingOlder(false);
    }
  }, []);

  // Charger les produits quand le token est disponible
  useEffect(() => {
    if (tokenChecked) {
      if (token) {
        fetchRecentProducts(token);
        // Charger les produits plus anciens après un délai
        setTimeout(() => {
          fetchOlderProducts(token);
        }, 1000);
      } else {
        setError('Token d\'authentification manquant. Veuillez vous connecter.');
        setLoading(false);
      }
    }
  }, [token, tokenChecked, fetchRecentProducts, fetchOlderProducts]);

  // Filtrer les produits par recherche et tri
  useEffect(() => {
    const applyFiltersAndSort = (products: Product[]) => {
      let filtered = [...products];

      // Filtrage par recherche
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(product =>
          product.name.toLowerCase().includes(query) ||
          product.reference.toLowerCase().includes(query) ||
          product.brand.name.toLowerCase().includes(query) ||
          product.category.name.toLowerCase().includes(query)
        );
      }

      // Tri
      filtered = filtered.sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'name':
            return a.name.localeCompare(b.name);
          default:
            return 0;
        }
      });

      return filtered;
    };

    setFilteredRecentProducts(applyFiltersAndSort(recentProducts));
    setFilteredOlderProducts(applyFiltersAndSort(olderProducts));
  }, [recentProducts, olderProducts, searchQuery, sortBy]);

  // Fonction pour actualiser
  const handleRefresh = useCallback(() => {
    if (!token) {
      Alert.alert(
        'Authentification requise',
        'Veuillez vous connecter pour voir les produits'
      );
      return;
    }
    
    setError(null);
    setRecentProducts([]);
    setOlderProducts([]);
    fetchRecentProducts(token);
    setTimeout(() => {
      fetchOlderProducts(token);
    }, 1000);
  }, [token, fetchRecentProducts, fetchOlderProducts]);

  const updateQuantity = (productId: string, increment: boolean) => {
    setProductQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + (increment ? 1 : -1))
    }));
  };
  
  const getPriceByCriterion = (product: Product) => {
    // Retourner simplement le premier prix disponible
    return product.prices && product.prices.length > 0 ? product.prices[0] : null;
  };
  
  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toLocaleString('fr-FR');
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const stockStatus = item.stock === 0;
    const productImage = item.images?.[0]?.image;
    const productPrice = getPriceByCriterion(item);
    
    // Description encore plus courte pour les colonnes rapprochées
    const descriptionLength = 20;
    const limitedDescription = item.description 
      ? item.description.length > descriptionLength 
        ? `${item.description.substring(0, descriptionLength - 3)}...` 
        : item.description
      : '';

    return (
      <TouchableOpacity
        style={[
          styles.MODALProductCard,
          {
            width: responsive.productCardWidth,
            marginHorizontal: 1, // Marge horizontale réduite
            marginBottom: 4, // Marge inférieure réduite
            height: 180, // Hauteur réduite pour plus de compacité
          },
        ]}
        onPress={() => {
          navigation.navigate('ProductDetailScreen', { productId: item.id });
        }}
      >
        {/* Conteneur image avec badges */}
        <View style={[
          styles.MODALProductImageContainer,
          { height: 90 } // Hauteur d'image réduite
        ]}>
          {productImage ? (
            <Image
              source={{ uri: `https://backend.barakasn.com${productImage}` }}
              style={[styles.MODALProductImage, { height: 90 }]}
              resizeMode="cover"
            />
          ) : (
            <Image
              source={require('../../assets/images/baraka_icon.png')}
              style={[styles.MODALProductImage, { height: 90 }]}
              resizeMode="contain"
            />
          )}
        </View> 

        {/* Conteneur informations produit */}
        <View style={styles.MODALProductInfo}>
          <Text 
            style={styles.MODALProductName} 
            numberOfLines={2}
          >
            {item.name}
          </Text>
          
          {/* Prix */}
          <Text style={styles.MODALProductPrice}>
            {showPrices 
              ? productPrice ? `${formatPrice(productPrice.price)} FCFA` : 'Prix N/A'
              : ' '}
          </Text>
          
          {/* Badge de statut de stock */}
          <View style={[
            styles.MODALStockIndicator,
            { 
              backgroundColor: stockStatus ? '#FF3B30' : '#34C759',
            }
          ]}>
            <Text style={styles.MODALStockText}>
              {stockStatus ? 'RUPTURE' : 'STOCK'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Modal pour les nouveaux produits
  const renderNewProductsModal = () => (
    <Modal
      visible={showNewProductsModal}
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setShowNewProductsModal(false)}
          >
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Nouveaux Produits</Text>
        </View>
        
        {/* Barre de recherche dans la modal */}
        <View style={styles.modalSearchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.modalSearchInput}
            placeholder="Rechercher dans les nouveaux produits..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView 
          style={styles.modalScrollView}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              colors={['#F58320']}
              tintColor="#F58320"
            />
          }
        >
          {loading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color="#F58320" />
              <Text style={styles.loadingText}>Chargement des nouveaux produits...</Text>
            </View>
          ) : filteredRecentProducts.length > 0 ? (
            <FlatList
              data={filteredRecentProducts}
              renderItem={renderProduct}
              keyExtractor={(item) => `modal-recent-${item.id}`}
              
  numColumns={2} // fixé à 2
  columnWrapperStyle={styles.productRow}
              // numColumns={responsive.productColumns}
              scrollEnabled={false}
              contentContainerStyle={styles.modalProductList}
              // columnWrapperStyle={responsive.productColumns > 1 ? styles.productRow : null}
            />
          ) : (
            <View style={styles.modalEmptyContainer}>
              <Ionicons name="time-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? "Aucun produit ne correspond à votre recherche"
                  : "Aucun nouveau produit dans les 14 derniers jours"
                }
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  // Modal pour les produits de nouveau disponibles
  const renderAvailableAgainModal = () => (
    <Modal
      visible={showAvailableAgainModal}
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setShowAvailableAgainModal(false)}
          >
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>De nouveau disponible</Text>
        </View>
        
        {/* Barre de recherche dans la modal */}
        <View style={styles.modalSearchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.modalSearchInput}
            placeholder="Rechercher dans les produits récents..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView 
          style={styles.modalScrollView}
          refreshControl={
            <RefreshControl
              refreshing={loadingOlder}
              onRefresh={handleRefresh}
              colors={['#F58320']}
              tintColor="#F58320"
            />
          }
        >
          {loadingOlder ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color="#F58320" />
              <Text style={styles.loadingText}>Chargement des produits récents...</Text>
            </View>
          ) : filteredOlderProducts.length > 0 ? (
            <FlatList
              data={filteredOlderProducts}
              renderItem={renderProduct}
              keyExtractor={(item) => `modal-older-${item.id}`}
              
  numColumns={2} // fixé à 2
  columnWrapperStyle={styles.productRow}
              // numColumns={responsive.productColumns}
              scrollEnabled={false}
              contentContainerStyle={styles.modalProductList}
              // columnWrapperStyle={responsive.productColumns > 1 ? styles.productRow : null}
            />
          ) : (
            <View style={styles.modalEmptyContainer}>
              <Ionicons name="time-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? "Aucun produit ne correspond à votre recherche"
                  : "Aucun produit dans cette période"
                }
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  // Menu functions
  const closeMenu = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
  };

  const handleNavigation = (screenName: string) => {
    closeMenu();
    navigation.navigate(screenName);
  };

  const renderDropdownMenu = () => {
    if (!menuVisible) return null;

    return (
      <>
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.menuOverlay} />
        </TouchableWithoutFeedback>

        <ImageBackground
          source={require('../../assets/images/rectangle2_menu.png')}
          style={[
            styles.menuDropdown,
            {
              height: screenDimensions.height,
              width: Math.min(550, screenDimensions.width * 0.85),
            }
          ]}
          resizeMode="stretch"
        >
          <View style={styles.menuHeader} />

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.menuScrollContainer}
            bounces={false}
          >
            {/* Menu items */}
            <TouchableWithoutFeedback onPress={() => handleNavigation('HomeStack')}>
              <View style={styles.menuItem}>
                <Ionicons name="home-outline" size={20} color="#000000" style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Accueil</Text>
              </View>
            </TouchableWithoutFeedback>

            <TouchableWithoutFeedback onPress={() => handleNavigation('CategoriesTab')}>
              <View style={styles.menuItem}>
                <Ionicons name="grid-outline" size={20} color="#000000" style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Catégories</Text>
              </View>
            </TouchableWithoutFeedback>

            <TouchableWithoutFeedback onPress={() => handleNavigation('BrandsScreen')}>
              <View style={styles.menuItem}>
                <Ionicons name="grid-outline" size={20} color="#000000" style={styles.menuIcon} />
                <Text style={styles.menuItemText}>Nos Marques</Text>
              </View>
            </TouchableWithoutFeedback>

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

            <TouchableWithoutFeedback onPress={() => setShowPrices(!showPrices)}>
              <View style={styles.menuItem}>
                <Ionicons name={showPrices ? "eye-outline" : "eye-off-outline"} size={20} color="#000000" style={styles.menuIcon} />
                <Text style={styles.menuItemText}>{showPrices ? "Masquer prix" : "Afficher prix"}</Text>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </ImageBackground>
      </>
    );
  };

  // Affichage d'erreur d'authentification
  if (tokenChecked && !token) {
    return (
      <View style={styles.container}>
        <HeaderComponent 
          navigation={navigation}
          title="Nouveaux Arrivages"
        />
        <View style={styles.errorContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Authentification requise</Text>
          <Text style={styles.errorSubtitle}>Veuillez vous connecter pour accéder aux nouveaux produits</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('LoginScreen')}
          >
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
        {renderDropdownMenu()}
      </View>
    );
  }

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
      <HeaderComponent 
        navigation={navigation}
        title="Nouveaux Arrivages"
      />
      <StatusBar barStyle="light-content" />
      
      {/* Container principal avec dégradé bleu */}
      <View style={styles.gradientContainer}>
        {/* Section des boutons principaux */}
        <View style={styles.mainButtonsContainer}>
          {/* Bouton Nouveau PRODUIT */}
          <TouchableOpacity 
            style={styles.mainButton}
            onPress={() => setShowNewProductsModal(true)}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonTitle}>Nouveau</Text>
              <Text style={styles.buttonSubtitle}>PRODUIT</Text>
            </View>
          </TouchableOpacity>

          {/* Bouton De nouveau DISPONIBLE */}
          <TouchableOpacity 
            style={styles.mainButton}
            onPress={() => setShowAvailableAgainModal(true)}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonTitle}>De nouveau</Text>
              <Text style={styles.buttonSubtitle}>DISPONIBLE</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Informations en bas */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Découvrez nos derniers arrivages et nos produits de nouveau disponibles
          </Text>
          <Text style={styles.countText}>
            {filteredRecentProducts.length + filteredOlderProducts.length} produit{filteredRecentProducts.length + filteredOlderProducts.length > 1 ? 's' : ''} au total
          </Text>
        </View>
      </View>

      {/* Modals */}
      {renderNewProductsModal()}
      {renderAvailableAgainModal()}
      {renderDropdownMenu()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a365d', // Bleu foncé comme base
  },

  // Container principal avec dégradé
  gradientContainer: {
    flex: 1,
    backgroundColor: '#1a365d', // Bleu foncé du haut
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 50,
    // Simulation du dégradé avec des couleurs CSS
    // En réalité, on utiliserait un dégradé mais sans LinearGradient
    borderRadius: 0,
  },

  // Container des boutons principaux
  mainButtonsContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 30,
    marginBottom: 50,
  },

  // Style des boutons principaux
  mainButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Transparence sur le bleu
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  buttonContent: {
    alignItems: 'center',
  },

  buttonTitle: {
    fontSize: 24,
    fontWeight: '300', // Light weight comme dans l'image
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 5,
  },

  buttonSubtitle: {
    fontSize: 28,
    fontWeight: '700', // Bold pour le sous-titre
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 1.5,
  },

  // Section d'informations
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  infoText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 10,
  },

  countText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Styles pour les modals
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },

  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 15,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },

  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
    backgroundColor: 'white',
    borderRadius: 15,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  modalSearchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },

  modalScrollView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  modalLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  modalProductList: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  modalEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },

  // Réduire davantage l'espacement entre les colonnes
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 4, // Espace entre les lignes réduit
    gap: 4, // Espace entre les colonnes réduit
  },

  // Cartes produits encore plus compactes
  MODALProductCard: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 4, // Padding réduit
    marginBottom: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    flex: 1,
    marginHorizontal: 2, // Marge horizontale réduite
  },

  // Image container plus compact
  MODALProductImageContainer: {
    position: 'relative',
    marginBottom: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // Image produit
  MODALProductImage: {
    width: '100%',
    borderRadius: 4,
    backgroundColor: '#f8f8f8',
  },

  // Info produit plus compacte
  MODALProductInfo: {
    flex: 1,
    paddingTop: 2,
  },

  // Textes plus compacts
  MODALProductName: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
    lineHeight: 12,
    fontSize: 10, // Taille de police réduite
  },

  MODALProductDescription: {
    color: '#666',
    marginBottom: 3,
    fontSize: 8, // Taille de police réduite
  },

  MODALProductPrice: {
    fontWeight: 'bold',
    color: '#F58320',
    marginTop: 2,
    fontSize: 10, // Taille de police réduite
  },

  // Boutons plus compacts
  selectionButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 1,
  },

  // Indicateur de stock
  MODALStockIndicator: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },

  MODALStockText: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 8, // Taille réduite
  },

  // Indicateur de sélection
  selectedIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 1,
  },

  searchIcon: {
    marginRight: 10,
  },

  clearButton: {
    padding: 8,
  },

  // Chargement
  loadingText: {
    fontSize: 16,
    color: '#F58320',
    marginTop: 15,
    textAlign: 'center',
  },

  // État vide global
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Erreur
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 20,
    textAlign: 'center',
  },

  errorSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },

  loginButton: {
    backgroundColor: '#F58320',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 30,
  },

  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
    height: '100%',
    width: Math.min(550, Dimensions.get('window').width * 0.85),
    zIndex: 1000,
  },

  menuHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: -20,
  },

  menuScrollContainer: {
    paddingBottom: 50,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
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
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
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
});export default NewArrivalsScreen;