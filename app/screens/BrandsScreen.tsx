import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ScrollView,
  Platform, AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProducts, getProducts50Simple, getProductsPaginated } from '../../services/apiService';
import { Product, Order, OrderItem } from '../../services/types';
import HeaderComponent from './HeaderComponent';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';

interface Brand {
  id: string;
  name: string;
  image?: string;
}

interface BrandsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Brand[];
}

const getResponsiveDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isLargeScreen = width >= 1024;
  const isLandscape = width > height;
  const isPortrait = height > width;
  
  // Calcul du nombre de colonnes selon l'orientation et la taille
  let brandColumns;
  if (isLargeScreen) {
    brandColumns = isLandscape ? 4 : 3;
  } else if (isTablet) {
    brandColumns = isLandscape ? 3 : 2;
  } else {
    // Mobile
    brandColumns = isLandscape ? 3 : 2;
  }
  
  const horizontalPadding = isTablet ? 20 : 16;
  const cardSpacing = isTablet ? 12 : 10;
  const brandCardWidth = (width - (horizontalPadding * 2) - ((brandColumns - 1) * cardSpacing)) / brandColumns;
  
  return {
    width,
    height,
    isTablet,
    isLargeScreen,
    isLandscape,
    isPortrait,
    isSmallScreen: width < 375,
    brandColumns,
    productColumns: width > 900 ? 3 : 2,
    horizontalPadding,
    verticalPadding: isTablet ? 20 : 12,
    itemSpacing: isTablet ? 16 : 12,
    cardSpacing,
    brandCardWidth,
    brandCardHeight: brandCardWidth * 0.8, // Ratio hauteur/largeur comme dans l'image
    productCardWidth: (width - (horizontalPadding * 2) - ((width > 900 ? 2 : 1) * cardSpacing)) / (width > 900 ? 3 : 2),
    headerHeight: isTablet ? 80 : 64,
    brandImageHeight: brandCardWidth * 0.6, // Image occupe 60% de la hauteur de la carte
    productImageHeight: isTablet ? 160 : 140,
    titleFontSize: isTablet ? 22 : 18,
    subtitleFontSize: isTablet ? 16 : 14,
    bodyFontSize: isTablet ? 16 : 14,
    captionFontSize: isTablet ? 14 : 12,
    smallFontSize: isTablet ? 12 : 10,
    buttonHeight: isTablet ? 48 : 40,
  };
};

const BrandsScreen: React.FC<{ navigation: any, route: any }> = ({ navigation, route }) => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [brandProducts, setBrandProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // État pour les dimensions responsives
  const [responsive, setResponsive] = useState(getResponsiveDimensions());
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

  // Mettre à jour les dimensions lors du changement d'orientation
  useEffect(() => {
    const updateDimensions = () => {
      setResponsive(getResponsiveDimensions());
    };

    const subscription = Dimensions.addEventListener('change', updateDimensions);
    return () => subscription?.remove();
  }, []);

  // Récupérer le token depuis AsyncStorage
  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('access_token');
        if (storedToken) {
          setToken(storedToken);
        } else {
          setError('Token d\'authentification manquant. Veuillez vous reconnecter.');
        }
      } catch (err) {
        console.error('Erreur lors de la récupération du token:', err);
        setError('Erreur lors de la récupération des informations d\'authentification.');
      }
    };
    getToken();
  }, []);

  const fetchBrands = async (isRefreshing = false) => {
    try {
      setRefreshing(isRefreshing);
      setLoading(!isRefreshing);
      setError(null);

      if (!token) {
        throw new Error('Token non disponible. Veuillez vous reconnecter.');
      }

      const response = await fetch('https://backend.barakasn.com/api/v0/products/brands/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        // Token expiré ou invalide
        await AsyncStorage.removeItem('access_token');
        setToken(null);
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
      }

      const data: BrandsResponse = await response.json();
      
      if (data && data.results && Array.isArray(data.results)) {
        setBrands(data.results);
        console.log(`${data.results.length} marques chargées avec succès`);
      } else {
        setBrands([]);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des marques:', error);
      const errorMessage = error.message || 'Erreur lors du chargement des marques';
      setError(errorMessage);
      setBrands([]);
      
      // Si c'est une erreur d'authentification, rediriger vers la page de connexion
      if (error.message?.includes('Session expirée') || error.message?.includes('reconnecter')) {
        // Optionnel: Rediriger vers l'écran de connexion
        // navigation.navigate('LoginScreen');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAllProducts = async () => {
    if (!token) {
      console.log('Token manquant pour charger les produits');
      return;
    }

    try {
      console.log('Chargement des produits avec le token...');
      const products = await getProducts50Simple(token);
      setAllProducts(products);
      console.log(`${products.length} produits chargés avec succès`);
    } catch (error: any) {
      console.error('Erreur lors du chargement des produits:', error);
      
      // Vérifier si c'est une erreur d'authentification
      if (error.message?.includes('401') || error.response?.status === 401) {
        await AsyncStorage.removeItem('access_token');
        setToken(null);
        setError('Session expirée. Veuillez vous reconnecter.');
      } else {
        console.log('Erreur non critique lors du chargement des produits, continuation...');
        // Ne pas définir une erreur bloquante pour les produits
        setAllProducts([]);
      }
    }
  };

  useEffect(() => {
    if (token) {
      console.log('Token disponible, chargement des données...');
      fetchBrands();
      fetchAllProducts();
    } else if (token === null) {
      // Token explicitement null (pas encore chargé vs vraiment manquant)
      console.log('Aucun token disponible');
    }
  }, [token]);

  const onRefresh = () => {
    if (!token) {
      setError('Token manquant. Veuillez vous reconnecter.');
      return;
    }
    fetchBrands(true);
    fetchAllProducts();
  };

  const handleBrandSelect = (brand: Brand) => {
    setLoadingProducts(true);
    setSelectedBrand(brand);
    
    const productsForBrand = allProducts.filter(product => {
      if (!product.brand || !product.brand.id || !brand.id) return false;
      return product.brand.id.toString() === brand.id.toString();
    });
    
    setBrandProducts(productsForBrand);
    setLoadingProducts(false);
  };

  const handleBackToBrands = () => {
    setSelectedBrand(null);
    setBrandProducts([]);
  };

  const filteredBrands = (brands || []).filter(brand =>
    brand && brand.name && brand.id && brand.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (prices: any[]) => {
    if (!prices || prices.length === 0) return 'Prix non disponible';
    try {
      const price = prices[0]?.price;
      if (!price) return 'Prix non disponible';
      return `${parseFloat(price).toLocaleString('fr-FR')} FCFA`;
    } catch (error) {
      return 'Prix non disponible';
    }
  };

  const renderBrandItem = ({ item: brand }: { item: Brand }) => {
    // Extraire l'image de la marque et construire l'URL correcte
    const brandImage = brand.image;
    
    // Construire l'URL correcte selon le format de votre exemple
    let imageUri: string | null = null;
    if (brandImage) {
      // Si l'image contient déjà le domaine complet, l'utiliser telle quelle
      if (brandImage.startsWith('http')) {
        imageUri = brandImage;
      } else {
        // Sinon, construire l'URL avec le bon format
        imageUri = `https://backend.barakasn.com/media/${brandImage}`;
      }
    }

    return (
      <TouchableOpacity
        style={[
          styles.brandCard, 
          { 
            width: responsive.brandCardWidth,
            height: responsive.brandCardHeight,
          }
        ]}
        onPress={() => handleBrandSelect(brand)}
        activeOpacity={0.8}
      >
        <View style={styles.brandImageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={[
                styles.brandImage,
                { height: responsive.brandImageHeight }
              ]}
              resizeMode="contain"
              onError={(e) => {
                console.log('Erreur chargement image marque:', brandImage, 'URL finale:', imageUri);
                console.log('Erreur:', e.nativeEvent.error);
              }}
            />
          ) : (
            <Image
              source={require('../../assets/images/baraka_icon.png')}
              style={[
                styles.brandImage,
                { height: responsive.brandImageHeight }
              ]}
              resizeMode="contain"
            />
          )}
        </View>
        <View style={styles.brandTextContainer}>
          <Text style={[
            styles.brandName, 
            { fontSize: responsive.captionFontSize }
          ]} numberOfLines={2}>
            {brand.name}
          </Text>
          <Text style={[
            styles.productsCount, 
            { fontSize: responsive.smallFontSize }
          ]}>
            {allProducts.filter(p => p.brand?.id && brand.id && p.brand.id.toString() === brand.id.toString()).length} produit(s)
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProductItem = ({ item: product }: { item: Product }) => (
    <TouchableOpacity
      style={[styles.productCard, { width: responsive.productCardWidth }]}
      activeOpacity={0.8}
    >
      <View style={styles.productImageContainer}>
        {product.images && product.images.length > 0 ? (
          <Image
            source={{ uri: `https://backend.barakasn.com${product.images[0].image}` }}
            style={[styles.productImage, { height: responsive.productImageHeight }]}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={require('../../assets/images/baraka_icon.png')}
            style={[styles.productImage, { height: responsive.productImageHeight }]}
            resizeMode="contain"
          />
        )}
        <View style={styles.stockBadge}>
          <Text style={[styles.stockText, { fontSize: responsive.smallFontSize }]}>
            Stock: {product.stock || 0}
          </Text>
        </View>
      </View>
      
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { fontSize: responsive.captionFontSize }]} numberOfLines={2}>
          {product.name || 'Nom non disponible'}
        </Text>
        <Text style={[styles.productDescription, { fontSize: responsive.smallFontSize }]} numberOfLines={2}>
          {product.description || 'Description non disponible'}
        </Text>
        <Text style={[styles.productPrice, { fontSize: responsive.bodyFontSize }]}>
          {formatPrice(product.prices)}
        </Text>
        <Text style={[styles.productReference, { fontSize: responsive.smallFontSize }]}>
          Réf: {product.reference || 'N/A'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={selectedBrand ? "cube-outline" : "storefront-outline"} 
        size={responsive.isTablet ? 80 : 64} 
        color="#9CA3AF" 
      />
      <Text style={[styles.emptyTitle, { fontSize: responsive.subtitleFontSize }]}>
        {selectedBrand 
          ? 'Aucun produit trouvé' 
          : searchTerm 
            ? 'Aucune marque trouvée' 
            : 'Aucune marque disponible'
        }
      </Text>
      <Text style={[styles.emptyDescription, { fontSize: responsive.captionFontSize }]}>
        {selectedBrand 
          ? `Aucun produit disponible pour la marque ${selectedBrand.name}`
          : searchTerm 
            ? `Aucune marque ne correspond à "${searchTerm}"`
            : 'Il n\'y a actuellement aucune marque disponible.'
        }
      </Text>
      {(searchTerm || selectedBrand) && (
        <TouchableOpacity
          style={[styles.clearButton, { height: responsive.buttonHeight }]}
          onPress={selectedBrand ? handleBackToBrands : () => setSearchTerm('')}
        >
          <Text style={[styles.clearButtonText, { fontSize: responsive.captionFontSize }]}>
            {selectedBrand ? 'Retour aux marques' : 'Effacer la recherche'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={[styles.loadingText, { fontSize: responsive.subtitleFontSize }]}>
            Chargement des marques...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !brands.length) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={responsive.isTablet ? 64 : 48} color="#EF4444" />
          <Text style={[styles.errorText, { fontSize: responsive.subtitleFontSize }]}>
            Erreur lors du chargement
          </Text>
          <Text style={[styles.errorDescription, { fontSize: responsive.captionFontSize }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { height: responsive.buttonHeight }]}
            onPress={() => {
              if (error?.includes('Session expirée') || error?.includes('reconnecter')) {
                // Rediriger vers l'écran de connexion
                Alert.alert(
                  'Session expirée',
                  'Votre session a expiré. Veuillez vous reconnecter.',
                  [
                    {
                      text: 'Se reconnecter',
                      onPress: () => {
                        // navigation.navigate('LoginScreen');
                        // Ou toute autre logique de reconnexion
                        console.log('Redirection vers la connexion...');
                      }
                    }
                  ]
                );
              } else {
                fetchBrands();
              }
            }}
          >
            <Text style={[styles.retryButtonText, { fontSize: responsive.captionFontSize }]}>
              Réessayer
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
      {/* Header Component */}
      <HeaderComponent 
        navigation={navigation}
        title="Nos Marques"
      />
      
      {/* Header */}
      <View style={[styles.header, { 
        height: responsive.headerHeight,
        paddingHorizontal: responsive.horizontalPadding 
      }]}>
        <View style={styles.headerTop}>
          {selectedBrand && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToBrands}
            >
              <Ionicons name="arrow-back" size={responsive.titleFontSize} color="#2563EB" />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { fontSize: responsive.titleFontSize }]}>
              {selectedBrand ? selectedBrand.name : 'Marques'}
            </Text>
            <Text style={[styles.headerSubtitle, { fontSize: responsive.captionFontSize }]}>
              {selectedBrand 
                ? `${brandProducts.length} produit(s) disponible(s)`
                : `Découvrez ${(brands || []).length} marque(s) disponible(s)`
              }
            </Text>
          </View>
        </View>
        
        {!selectedBrand && (
          <View style={[styles.searchContainer, { 
            marginTop: responsive.itemSpacing / 2,
            height: responsive.buttonHeight,
          }]}>
            <Ionicons name="search" size={responsive.captionFontSize} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { fontSize: responsive.captionFontSize }]}
              placeholder="Rechercher une marque..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9CA3AF"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchTerm('')}
                style={styles.searchClearButton}
              >
                <Ionicons name="close-circle" size={responsive.captionFontSize} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Content */}
      <View style={[styles.content, { 
        paddingHorizontal: responsive.horizontalPadding,
        paddingTop: responsive.verticalPadding,
      }]}>
        {searchTerm && filteredBrands.length > 0 && !selectedBrand && (
          <Text style={[styles.searchResults, { fontSize: responsive.smallFontSize }]}>
            {filteredBrands.length} résultat(s) pour "{searchTerm}"
          </Text>
        )}

        {loadingProducts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={[styles.loadingText, { fontSize: responsive.captionFontSize }]}>
              Chargement des produits...
            </Text>
          </View>
        ) : selectedBrand ? (
          <FlatList<Product>
            key={`products-${responsive.productColumns}`}
            data={brandProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => `product-${item.id}`}
            numColumns={responsive.productColumns}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#2563EB']}
                tintColor="#2563EB"
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              brandProducts.length === 0 
                ? styles.emptyListContainer 
                : styles.listContainer
            }
            columnWrapperStyle={
              brandProducts.length > 0 && responsive.productColumns > 1
                ? [styles.row, { paddingHorizontal: 0 }]
                : undefined
            }
            ItemSeparatorComponent={() => <View style={{ height: responsive.cardSpacing }} />}
          />
        ) : (
          <FlatList<Brand>
            key={`brands-${responsive.brandColumns}-${responsive.isLandscape ? 'landscape' : 'portrait'}`}
            data={filteredBrands}
            renderItem={renderBrandItem}
            keyExtractor={(item) => `brand-${item.id}`}
            numColumns={responsive.brandColumns}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#2563EB']}
                tintColor="#2563EB"
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              filteredBrands.length === 0 
                ? styles.emptyListContainer 
                : styles.listContainer
            }
            columnWrapperStyle={
              filteredBrands.length > 0 && responsive.brandColumns > 1
                ? [styles.row, { justifyContent: 'space-between' }]
                : undefined
            }
            ItemSeparatorComponent={() => <View style={{ height: responsive.cardSpacing }} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#6B7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    paddingVertical: 0,
  },
  searchClearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  searchResults: {
    color: '#6B7280',
    marginBottom: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  
  // Brand styles
  brandCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    marginBottom: 0,
  },
  brandImageContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  brandImage: {
    width: '90%',
    resizeMode: 'contain',
  },
  brandTextContainer: {
    backgroundColor: '#ffffff',
    padding: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F1F1',
  },
  brandName: {
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 2,
  },
  productsCount: {
    color: '#6B7280',
    textAlign: 'center',
  },
  
  // Product styles
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F3F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
    backgroundColor: '#F8F9FA',
  },
  productImage: {
    width: '100%',
    backgroundColor: '#F3F4F6',
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stockText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 16,
  },
  productDescription: {
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 14,
  },
  productPrice: {
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  productReference: {
    color: '#9CA3AF',
  },
  
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  clearButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Error styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
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

export default BrandsScreen;