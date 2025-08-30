import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
  Dimensions,
  Platform, AppState,
  TouchableWithoutFeedback,
  Alert,
  Animated
} from 'react-native';
import { Order } from '../../services/types';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { getProducts, getProductsPaginated } from '../../services/apiService';
import { Product } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from './useCart';
import debounce from 'lodash.debounce';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Données de démonstration pour les recherches récentes
const DEMO_RECENT_SEARCHES = [
  'iPhone 15',
  'Samsung Galaxy',
  'MacBook Pro',
  'AirPods',
  'Laptop Dell'
];

// Données de démonstration pour les suggestions populaires
const DEMO_POPULAR_SEARCHES = [
  'Smartphones',
  'Ordinateurs portables',
  'Écouteurs',
  'Tablettes',
  'Accessoires',
  'Gaming',
  'Audio',
  'Photo'
];

// Fonction pour obtenir les dimensions responsives
const getResponsiveDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isLandscape = width > height;
  const productColumns = isLandscape ? (isTablet ? 3 : 3) : 2;
  const productCardWidth = (width - 40) / productColumns - 10;
  
  return {
    width,
    height,
    isTablet,
    isLandscape,
    productColumns,
    productCardWidth: Math.floor(productCardWidth),
    horizontalPadding: 20,
    verticalPadding: 15,
  };
};

type SearchScreenProps = {
  navigation: any;
  route: any;
};

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation, route }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recentSearches, setRecentSearches] = useState<string[]>(DEMO_RECENT_SEARCHES);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(true);
  
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const responsive = getResponsiveDimensions();
  
  // Animation pour la barre de recherche
  const searchBarAnimation = useRef(new Animated.Value(0)).current;
  const fadeInAnimation = useRef(new Animated.Value(0)).current;
  

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

  // Animation d'entrée
  useEffect(() => {
    Animated.parallel([
      Animated.timing(searchBarAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeInAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Charger le token
  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  // Charger les produits
  useEffect(() => {
    if (token) {
      loadProducts();
    }
  }, [token]);

  const loadProducts = async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getProductsPaginated(token, 1, 50);
      setProducts(response.results);
      setAllProducts(response.results);
      setHasMore(response.next !== null);
    } catch (err) {
      setError('Erreur lors du chargement des produits');
      console.error('Erreur:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de recherche avec debounce
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredProducts([]);
      setShowSearchHistory(true);
      return;
    }
    
    setShowSearchHistory(false);
    const searchTerm = query.toLowerCase().trim();
    const results = allProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm) ||
      product.category?.name?.toLowerCase().includes(searchTerm) ||
      product.brand?.name?.toLowerCase().includes(searchTerm)
    );
    
    setFilteredProducts(results);
  }, [allProducts]);

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      performSearch(query);
    }, 300),
    [performSearch]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleSearchSubmit = async () => {
    if (searchQuery.trim() === '') return;
    
    Keyboard.dismiss();
    
    // Sauvegarder dans les recherches récentes
    const updatedSearches = [
      searchQuery, 
      ...recentSearches.filter(item => item !== searchQuery)
    ].slice(0, 8);
    setRecentSearches(updatedSearches);
    
    try {
      await AsyncStorage.setItem('recent_searches', JSON.stringify(updatedSearches));
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde:', error);
    }
    
    performSearch(searchQuery);
  };

  const handleRecentSearchPress = (query: string) => {
    setSearchQuery(query);
    setShowSearchHistory(false);
    performSearch(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredProducts([]);
    setShowSearchHistory(true);
  };

  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };

  const getImageUri = (imagePath: string | undefined) => {
    if (!imagePath) return undefined;
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('/media/')) {
      return `https://backend.barakasn.com${imagePath}`;
    }
    
    return `https://backend.barakasn.com/media/${imagePath}`;
  };

  const renderSearchSuggestion = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.suggestionItem, { backgroundColor: theme.background }]}
      onPress={() => handleRecentSearchPress(item)}
    >
      <Ionicons name="search-outline" size={18} color="#F58320" />
      <Text style={[styles.suggestionText, { color: theme.text }]}>{item}</Text>
      <Ionicons name="arrow-up-outline" size={16} color={theme.text + '60'} />
    </TouchableOpacity>
  );

  const renderRecentSearch = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.recentSearchChip, { backgroundColor: theme.text + '10' }]}
      onPress={() => handleRecentSearchPress(item)}
    >
      <Ionicons name="time-outline" size={14} color={theme.text + '80'} />
      <Text style={[styles.recentSearchText, { color: theme.text }]}>{item}</Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <Animated.View style={[styles.emptyStateContainer, { opacity: fadeInAnimation }]}>
      <View style={styles.emptyStateContent}>
        <View style={[styles.searchIconContainer, { backgroundColor: '#F58320' + '15' }]}>
          <Ionicons name="search-outline" size={48} color="#F58320" />
        </View>
        
        <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
          Recherchez parmi nos produits
        </Text>
        
        <Text style={[styles.emptyStateSubtitle, { color: theme.text + '70' }]}>
          Tapez le nom d'un produit, une marque ou une catégorie pour commencer votre recherche
        </Text>

        {/* Suggestions populaires */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={20} color="#F58320" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recherches populaires</Text>
          </View>
          <View style={styles.popularSearchesGrid}>
            {DEMO_POPULAR_SEARCHES.map((search, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.popularSearchItem, { 
                  backgroundColor: theme.text + '05',
                  borderColor: '#F58320' + '20'
                }]}
                onPress={() => handleRecentSearchPress(search)}
                activeOpacity={0.7}
              >
                <Text style={[styles.popularSearchText, { color: theme.text }]}>{search}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Conseils de recherche */}
        <View style={[styles.tipsContainer, { backgroundColor: '#F58320' + '10' }]}>
          <Ionicons name="bulb-outline" size={20} color="#F58320" />
          <Text style={[styles.tipsText, { color: theme.text + '80' }]}>
            Utilisez des mots-clés spécifiques pour obtenir de meilleurs résultats de recherche
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const getPriceByCriterion = (product: Product) => {
    return product.prices[0];
  };

    const [showPrices, setShowPrices] = useState(true);
  

  const renderProductItem = ({ item, index }: { item: Product; index: number }) => {
    const stockStatus = item.stock === 0;
            const productImage = item.images?.[0]?.image;
            const productPrice = getPriceByCriterion(item);
            // const isSelected = selectedProducts.includes(item.id.toString());
            
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
                // isSelected && styles.selectedProductCardStyle
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

  const renderSearchResults = () => (
    <View style={styles.resultsContainer}>
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: theme.text }]}>
          {filteredProducts.length} résultat{filteredProducts.length > 1 ? 's' : ''} 
          {searchQuery && ` pour "${searchQuery}"`}
        </Text>
        
        {filteredProducts.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle-outline" size={20} color="#F58320" />
            <Text style={styles.clearText}>Effacer</Text>
          </TouchableOpacity>
        )}
      </View>

      {filteredProducts.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <View style={[styles.noResultsIconContainer, { backgroundColor: '#FF3B30' + '15' }]}>
            <Ionicons name="search-outline" size={40} color="#FF3B30" />
          </View>
          <Text style={[styles.noResultsTitle, { color: theme.text }]}>
            Aucun résultat trouvé
          </Text>
          <Text style={[styles.noResultsSubtitle, { color: theme.text + '70' }]}>
            Essayez avec d'autres termes de recherche ou vérifiez l'orthographe
          </Text>
          
          <TouchableOpacity 
            style={styles.suggestionButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.suggestionButtonText}>Modifier la recherche</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={item => item.id.toString()}
          numColumns={responsive.productColumns}
          key={`products-${responsive.productColumns}-${responsive.width}`} // Force re-render sur changement
          columnWrapperStyle={responsive.productColumns > 1 ? styles.productRow : null}
          contentContainerStyle={[
            styles.productList,
            { 
              padding: responsive.horizontalPadding,
              paddingBottom: responsive.verticalPadding + 20,
            }
          ]}
          showsVerticalScrollIndicator={false}
          // ListEmptyComponent={
          //   !loading.products && (
          //     <View style={styles.emptyContainer}>
          //       <Ionicons name="cube-outline" size={64} color="#ccc" />
          //       <Text style={styles.emptyText}>Aucun produit disponible</Text>
          //       <Text style={styles.emptySubtext}>Cette catégorie ne contient pas encore de produits</Text>
          //     </View>
          //   )
          // }
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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
      {/* Header avec barre de recherche améliorée */}
      <Animated.View 
        style={[
          styles.header, 
          { backgroundColor: theme.background },
          {
            transform: [
              {
                translateY: searchBarAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
            opacity: searchBarAnimation,
          },
        ]}
      >
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#F58320" />
        </TouchableOpacity>
        
        <View style={[styles.searchContainer, { 
          backgroundColor: theme.text + '08',
          borderColor: searchQuery ? '#F58320' : 'transparent',
          borderWidth: searchQuery ? 1 : 0
        }]}>
          <Ionicons name="search-outline" size={20} color="#F58320" style={styles.searchInputIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher un produit..."
            placeholderTextColor={theme.text + '50'}
            value={searchQuery}
            onChangeText={handleSearchInputChange}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoFocus={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearInputButton}>
              <Ionicons name="close-circle" size={18} color={theme.text + '60'} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Contenu principal */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F58320" />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Chargement des produits...
            </Text>
          </View>
        ) : searchQuery === '' ? (
          renderEmptyState()
        ) : (
          renderSearchResults()
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  
  container: {
    flex: 1,
    // padding: 8, // Réduit encore plus l'espacement général
    // paddingTop: 10,
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

  // Barre de sélection plus compacte
  selectedProductsBar: {
    position: 'absolute',
    top: 60, // Ajusté pour les petits écrans
    left: 8, // Réduit de 10 à 8
    right: 8, // Réduit de 10 à 8
    zIndex: 50,
    borderRadius: 10,
    padding: 8, // Réduit de 12 à 8
    marginBottom: 8, // Espacement réduit
  },

  // Chip de produit sélectionné plus compact
  selectedProductChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 16, // Légèrement réduit
    paddingHorizontal: 8, // Réduit de 12 à 8
    paddingVertical: 4, // Réduit de 6 à 4
    marginRight: 6, // Réduit de 8 à 6
    maxWidth: 120, // Réduit de 150 à 120
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    marginVertical: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#F58320',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  
  searchInputIcon: {
    marginRight: 8,
  },
  
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  
  clearInputButton: {
    padding: 4,
    marginLeft: 8,
  },

  content: {
    flex: 1,
  },

  // État vide amélioré
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  
  emptyStateContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  searchIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },

  section: {
    width: '100%',
    marginBottom: 32,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },

  popularSearchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  
  popularSearchItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  
  popularSearchText: {
    fontSize: 14,
    fontWeight: '500',
  },

  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
  },
  
  tipsText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },

  // Résultats de recherche
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  
  clearText: {
    fontSize: 14,
    color: '#F58320',
    fontWeight: '500',
    marginLeft: 4,
  },

  // Aucun résultat
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  
  noResultsIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  noResultsTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  
  noResultsSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  
  suggestionButton: {
    backgroundColor: '#F58320',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  
  suggestionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  productsList: {
    paddingVertical: 16,
  },
  
  productCard: {
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  
  productCardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  
  productImageContainer: {
    position: 'relative',
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  productImage: {
    width: 80,
    height: 80,
    backgroundColor: '#f8f8f8',
  },
  
  placeholderImage: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  stockBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  
  stockBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },

  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  
  productCategory: {
    fontSize: 13,
    marginBottom: 8,
  },
  
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F58320',
  },

  // Styles pour les suggestions et recherches récentes (gardés pour compatibilité)
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  
  suggestionText: {
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  
  recentSearchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  
  recentSearchText: {
    fontSize: 14,
    marginLeft: 8,
  },
  // Liste des produits responsive
  productList: {
    flexGrow: 1,
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

export default SearchScreen;