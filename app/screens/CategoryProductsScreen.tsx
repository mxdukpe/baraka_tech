/**
 * Écran qui affiche tous les produits d'une catégorie spécifique
 * @module CategoryProductsScreen
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { Product } from '../../services/types';
// import { getProductsByCategory } from '../../services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProducts, getProductsPage } from '../../services/apiService';

// Fonction pour obtenir les dimensions responsives
const getResponsiveDimensions = () => {
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isLargeScreen = width >= 1024;
  
  return {
    width,
    isTablet,
    isLargeScreen,
    cardWidth: isLargeScreen ? (width - 80) / 4 : isTablet ? (width - 70) / 3 : (width - 50) / 2,
    productImageHeight: isTablet ? 150 : 120,
    bodyFontSize: isTablet ? 16 : 14,
    captionFontSize: isTablet ? 14 : 12,
    horizontalPadding: isTablet ? 30 : 20,
    itemSpacing: isTablet ? 20 : 15,
  };
};

type CategoryProductsScreenProps = {
  route: any;
  navigation: any;
};

const CategoryProductsScreen: React.FC<CategoryProductsScreenProps> = ({ route, navigation }) => {
  const { categoryId, categoryName } = route.params;
  const responsive = getResponsiveDimensions();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrices, setShowPrices] = useState(true);
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; productCount: number; image?: string }>>([]);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);


  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  useEffect(() => {
    const fetchAllProducts = async () => {
      console.log('Début du chargement des produits');
      if (!token) {
        console.log('Token non disponible');
        return;
      }

      try {
        setIsLoading(true);
        setLoadingError(null);
        
        let currentPage = 1;
        let hasMore = true;
        const products: Product[] = [];
        console.log('Initialisation chargement');

        while (hasMore) {
          try {
            const response = await getProductsPage(token, currentPage);
            
            if (!response.results || response.results.length === 0) {
              console.warn('Page vide reçue');
              break;
            }

            products.push(...response.results);
            hasMore = response.next !== null;
            currentPage++;
          } catch (error) {
            console.error(`Erreur page ${currentPage}:`, error);
            hasMore = false;
            throw error;
          }
        }

        console.log('Total produits:', products.length);
        setAllProducts(products);
        
        // Créer les catégories avec le nombre de produits
        const categoryMap = new Map();
        products.forEach(product => {
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
              image: product.images?.[0]?.image // Utiliser la première image du premier produit comme image de catégorie
            });
          }
        });
        
        setCategories(Array.from(categoryMap.values()));
      } catch (error) {
        console.error('Erreur globale:', error);
        setLoadingError('Échec du chargement des produits');
      } finally {
        console.log('Chargement terminé');
        setIsLoading(false);
      }
    };

    fetchAllProducts();
  }, [token]);

  
  // Filtrer les produits selon la recherche
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });
  
    const getPriceByCriterion = (product: Product) => {
      return product.prices[0];
    };
  

  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };

  const updateQuantity = (productId: string, increment: boolean) => {
    setProductQuantities(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + (increment ? 1 : -1));
      return { ...prev, [productId]: newQty };
    });
  };

  const addToCart = async (product_id: string) => {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter');
      navigation.navigate('Login');
      return;
    }
  
    const quantity = productQuantities[product_id] || 1;
    if (quantity < 1) return;
  
    setIsAddingToCart(true);
  
    try {
      const productIdNum = parseInt(product_id, 10);
      if (isNaN(productIdNum)) {
        throw new Error('ID de produit invalide');
      }
  
      const payload = {
        products: [{
          product_id: productIdNum,
          quantity: quantity
        }]
      };
  
      const response = await fetch('https://backend.barakasn.com/api/v0/orders/orders/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      });
  
      const responseData = await response.json();
  
      if (!response.ok) {
        throw new Error(
          responseData.detail || 
          responseData.message || 
          `Erreur ${response.status}`
        );
      }
  
      Alert.alert('Succès', 'Produit ajouté au panier');
      setProductQuantities(prev => ({ ...prev, [product_id]: 0 }));
  
    } catch (error) {
      const errorMessage = (error instanceof Error && error.message) ? error.message : "Erreur lors de l'ajout au panier";
      Alert.alert('Erreur', errorMessage);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const quantity = productQuantities[item.id] || 0;
    const stockStatus = item.stock === 0;
    const productImage = item.images?.[0]?.image;
    const productPrice = getPriceByCriterion(item);
  
    return (
      <TouchableOpacity
        style={[styles.productCard, 
          { 
            backgroundColor: theme.background,
            width: responsive.cardWidth,
            margin: responsive.itemSpacing / 4,
            shadowColor: theme.background,
            elevation: 3
          }]}
        onPress={() => navigation.navigate('ProductDetailScreen', { productId: item.id })}
      >
        <View style={styles.productImageContainer}>
          {productImage ? (
            <Image
              source={{ uri: `https://backend.barakasn.com${productImage}` }}
              style={[styles.productImage, { height: responsive.productImageHeight }]}
              resizeMode="cover"
            />
          ) : (
            <Image
              source={require('../../assets/images/baraka_icon.png')}
              style={[styles.productImage, { height: responsive.productImageHeight }]}
              resizeMode="cover"
            />
          )}
          
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-social" size={20} color="#F58320" />
          </TouchableOpacity>
  
          <View style={[
            styles.stockIndicator,
            { 
              backgroundColor: stockStatus ? '#FF3B30' : '#34C759',
            }
          ]}>
            <Text style={styles.stockText}>
              {stockStatus ? 'RUPTURE' : 'EN STOCK'}
            </Text>
          </View>
        </View> 
  
        <View style={styles.productInfo}>
          <Text style={[styles.productName, 
            { 
              color: theme.text,
              fontSize: responsive.bodyFontSize
            }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.productCategory, 
            { 
              color: theme.text,
              fontSize: responsive.captionFontSize
            }]}>
            {item.category.name}
          </Text>
          <Text style={[styles.productCategoryParent, 
            { 
              color: '#F58320',
              fontSize: responsive.captionFontSize
            }]}>
            {item.category.parent_info.name} - {item.brand?.name || 'Marque non spécifiée'}
          </Text>
          <Text style={[
            styles.productPrice, 
            { 
              color: '#F58320',
              fontSize: responsive.bodyFontSize,
              fontWeight: 'bold',
            }
          ]}>
            {showPrices 
              ? productPrice ? `${formatPrice(productPrice.price)} FCFA` : 'Prix non disponible'
              : ' '}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F58320" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF3B30" />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#F58320" />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {categoryName}
        </Text>
        
        <TouchableOpacity onPress={() => setShowPrices(!showPrices)}>
          <Ionicons 
            name={showPrices ? 'eye-off' : 'eye'} 
            size={24} 
            color="#F58320" 
          />
        </TouchableOpacity>
      </View>

      <Text style={[styles.resultsCount, { color: theme.text }]}>
        {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} trouvé{filteredProducts.length !== 1 ? 's' : ''}
      </Text>

      <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>
        {categoryProducts.length} produit{categoryProducts.length !== 1 ? 's' : ''} dans "{categoryName}"
      </Text>

      <FlatList
        data={categoryProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              Aucun produit trouvé
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  searchInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    margin: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  
  shareButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 6,
  },
  productCategoryParent: {
    fontWeight: '500',
    marginBottom: 4,
  },
  productCategory: {
    opacity: 0.7,
    marginBottom: 2,
  },
  resultsCount: {
    fontSize: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    fontWeight: '500',
  },
  productList: {
    paddingBottom: 16,
    paddingHorizontal: 8,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    width: '48%',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  productInfo: {
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 12,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  addButton: {
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stockIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginVertical: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F58320',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default CategoryProductsScreen;