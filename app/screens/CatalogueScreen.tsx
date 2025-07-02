import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput,
  TouchableOpacity, 
  Image, 
  Alert, 
  ActivityIndicator, 
  ScrollView, 
  Share 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { getProducts } from '../../services/apiService';
import { Product } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type CatalogueScreenProps = {
  navigation: any;
};

const CatalogueScreen: React.FC<CatalogueScreenProps> = ({ navigation }) => {

  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [showPrices, setShowPrices] = useState(true);

  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!token) return;
  
      try {
        const data = await getProducts(token);
        setProducts(data);

        const uniqueCategories = Array.from(
          new Set(data.map((product) => product.category.name))
        ).map((name) => ({
          id: data.find((product) => product.category.name === name)!.category.id.toString(),
          name,
        }));
        setCategories(uniqueCategories);

        setIsLoading(false);
      } catch (error) {
        setError('Erreur lors du chargement des produits');
      }
    };
  
    fetchProducts();
  }, [token]);

  const updateQuantity = (productId: string, increment: boolean) => {
    setProductQuantities(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + (increment ? 1 : -1));
      return { ...prev, [productId]: newQty };
    });
  };

  const addToCart = async (product_id: string) => {
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

  const handleShareProduct = async (product: Product) => {
    try {
      await Share.share({
        message: `Découvrez ce produit: ${product.name} - ${formatPrice(product.prices[0]?.price)} FCFA\n\nDisponible sur l'application Barakasn`,
        url: product.image,
        title: `Partager ${product.name}`
      });
    } catch (error) {
      console.error('Erreur lors du partage:', error);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory ? product.category.name === selectedCategory : true;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderProduct = ({ item }: { item: Product }) => {
    const quantity = productQuantities[item.id] || 0;
    const stockStatus = item.stock === 0; // true si rupture, false si en stock
    
    return (
      <TouchableOpacity
        style={[styles.productCard, { backgroundColor: theme.background }]}
        onPress={() => navigation.navigate('ProductDetailScreen', { productId: item.id })}
      >
        <Image 
          source={{ uri: item.image }} 
          style={styles.productImage} 
          resizeMode="contain"
        />
        
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={(e) => {
            e.stopPropagation();
            handleShareProduct(item);
          }}
        >
          <Ionicons name="share-social" size={20} color="#F58320" />
        </TouchableOpacity>

        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.productCategory, { color: theme.text }]}>
            {item.category.name}
          </Text>
          {/* Modification ici pour le prix */}
          <Text style={[styles.productPrice, { color: '#F58320' }]}>
            {showPrices ? `${formatPrice(item.prices[0]?.price)} FCFA` : '•••••'}
          </Text>
        </View>

        <View style={styles.quantityControls}>
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              updateQuantity(item.id, false);
            }}
            disabled={quantity <= 0}
          >
            <Ionicons 
              name="remove-circle" 
              size={24} 
              color={quantity > 0 ? '#F58320' : '#ccc'} 
            />
          </TouchableOpacity>

          <Text style={[styles.quantityText, { color: theme.text }]}>
            {quantity}
          </Text>

          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              updateQuantity(item.id, true);
            }}
          >
            <Ionicons name="add-circle" size={24} color="#F58320" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.addButton, 
            { 
              backgroundColor: quantity > 0 ? '#F58320' : '#ccc',
              opacity: quantity > 0 ? 1 : 0.6
            }
          ]}
          onPress={(e) => {
            e.stopPropagation();
            if (quantity > 0) addToCart(item.id);
          }}
          disabled={quantity <= 0 || isAddingToCart}
        >
          {isAddingToCart ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.addButtonText}>
              {quantity > 0 ? `Ajouter (${quantity})` : 'Ajouter'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Indicateur de stock */}
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
      </TouchableOpacity>
    );
  };

  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F58320" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: '#F58320' }]}
          onPress={() => {
            setError(null);
            setIsLoading(true);
          }}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#F58320" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notre catalogue</Text>
      </View>

      {/* Nouveau bouton */}
        <TouchableOpacity 
          style={styles.togglePricesButton}
          onPress={() => setShowPrices(!showPrices)}
        >
          <Ionicons 
            name={showPrices ? 'eye-off' : 'eye'} 
            size={24} 
            color="#F58320" 
          />
        </TouchableOpacity>

      <TextInput
        style={[
          styles.searchInput, 
          { 
            backgroundColor: theme.background,
            color: theme.text,
            borderColor: theme.header.background
          }
        ]}
        placeholder="Rechercher un produit..."
        placeholderTextColor={theme.text}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <View style={styles.categoryContainer}>
        <TouchableOpacity
          style={[
            styles.categoryButton,
            !selectedCategory && styles.selectedCategoryButton,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[
            styles.categoryText,
            !selectedCategory && styles.selectedCategoryText,
          ]}>
            Tous
          </Text>
        </TouchableOpacity>

        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.name && styles.selectedCategoryButton,
            ]}
            onPress={() => setSelectedCategory(category.name)}
          >
            <Text style={styles.categoryText}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.resultsCount, { color: theme.text }]}>
        {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} trouvé{filteredProducts.length !== 1 ? 's' : ''}
      </Text>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingVertical: 50,
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
    marginBottom: 20,
    textAlign: 'center',
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

  togglePricesButton: {
    marginLeft: 'auto',
    padding: 8,
  },

  retryButton: {
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  searchInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  shareButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  categoriesScroll: {
    marginBottom: 12,
  },
  categoriesContainer: {
    paddingRight: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#FFF5EC',
    borderWidth: 1,
    borderColor: '#F58320',
  },
  selectedCategoryButton: {
    backgroundColor: '#F58320',
  },
  categoryText: {
    fontSize: 14,
    color: '#F58320',
  },
  selectedCategoryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultsCount: {
    fontSize: 14,
    marginBottom: 8,
  },
  productList: {
    paddingBottom: 16,
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
  productImage: {
    width: '100%',
    height: 120,
    marginBottom: 8,
  },
  productInfo: {
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productCategory: {
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
});

export default CatalogueScreen;