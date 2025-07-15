import React, { useState, useEffect, useCallback } from 'react';
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
  Keyboard,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash.debounce';
import { getProducts } from '../../services/apiService';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { Product } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SearchScreenProps = {
  navigation: any;
};

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  // Détection de la taille de l'écran
  const windowWidth = Dimensions.get('window').width;
  const isTablet = windowWidth >= 768;
  const numColumns = isTablet ? 3 : 2;

  // Charger le token et les recherches récentes
  useEffect(() => {
    const loadData = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
      
      const searches = await AsyncStorage.getItem('recent_searches');
      if (searches) setRecentSearches(JSON.parse(searches));
    };
    loadData();
  }, []);

  // Charger les produits
  useEffect(() => {
    if (!token) return;

    const fetchProducts = async () => {
      try {
        const data = await getProducts(token);
        
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
              image: product.images?.[0]?.image
            });
          }
        });
        
        setProducts(data);
        setIsLoading(false);
      } catch (error) {
        setError('Erreur lors du chargement des produits');
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [token]);

  // Recherche avec debounce - MODIFIÉ pour inclure la marque
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.trim() === '') {
        setFilteredProducts([]);
        return;
      }
      
      const searchTerm = query.toLowerCase();
      const results = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm) ||
        product.category.name.toLowerCase().includes(searchTerm) ||
        product.brand.name.toLowerCase().includes(searchTerm)
      );
      setFilteredProducts(results);
    }, 300),
    [products]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  const handleSearch = async () => {
    if (searchQuery.trim() === '') return;
    
    Keyboard.dismiss();
    
    // Mettre à jour les recherches récentes
    const updatedSearches = [searchQuery, ...recentSearches.filter(item => item !== searchQuery)].slice(0, 5);
    setRecentSearches(updatedSearches);
    await AsyncStorage.setItem('recent_searches', JSON.stringify(updatedSearches));
  };

  const handleRecentSearchPress = (query: string) => {
    setSearchQuery(query);
    handleSearch();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredProducts([]);
  };

  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    return (
      <TouchableOpacity 
        style={[
          styles.productItem, 
          { 
            backgroundColor: theme.background,
            width: isTablet ? '30%' : '48%', // Ajustement de la largeur selon le device
            margin: isTablet ? '1.5%' : '1%'
          }
        ]}
        onPress={() => navigation.navigate('ProductDetailScreen', { productId: item.id })}
      >
        <Image 
          source={{ 
            uri: getImageUri(item.images?.[0]?.image),
            headers: {
              'Authorization': `Bearer ${token}`,
            }
          }} 
          style={styles.productImage}
          defaultSource={require('../../assets/images/baraka_icon.png')}
          onError={(error) => {
            console.log('Erreur de chargement image:', error.nativeEvent.error);
          }}
          resizeMode="cover"
        />
        <View style={styles.productDetails}>
          <Text style={[styles.productName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.productBrand, { color: '#F58320' }]}>
            {item.brand.name}
          </Text>
          <Text style={[styles.productPrice, { color: '#F58320' }]}>
            {item.prices.length > 0 ? `${formatPrice(item.prices[0]?.price)} FCFA` : 'Prix non défini'}
          </Text>
          {item.description && (
            <Text style={[styles.productDescription, { color: theme.text }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={[styles.productCategory, { color: theme.text }]}>
            {item.category.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRecentSearchItem = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={[styles.recentSearchItem, { backgroundColor: theme.background }]}
      onPress={() => handleRecentSearchPress(item)}
    >
      <Ionicons name="time" size={18} color={theme.text} />
      <Text style={[styles.recentSearchText, { color: theme.text }]}>{item}</Text>
    </TouchableOpacity>
  );

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
      </View>
    );
  }

  const getImageUri = (imagePath: string | undefined) => {
    if (!imagePath) {
      console.log('Aucun chemin image fourni');
      return undefined;
    }
    
    console.log('Chemin image original:', imagePath);
    
    // Si l'image est déjà une URL complète
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Si le chemin commence par /media/
    if (imagePath.startsWith('/media/')) {
      return `https://backend.barakasn.com${imagePath}`;
    }
    
    // Si le chemin contient product_iamges (avec la faute de frappe)
    if (imagePath.includes('product_iamges')) {
      return `https://backend.barakasn.com/media/${imagePath}`;
    }
    
    // Par défaut, on suppose que c'est un chemin relatif dans /media/
    return `https://backend.barakasn.com/media/${imagePath}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header avec champ de recherche */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#F58320" />
        </TouchableOpacity>
        <View style={[styles.searchContainer, { backgroundColor: theme.background }]}>
          <Ionicons name="search" size={20} color={theme.text} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher par nom, marque, catégorie..."
            placeholderTextColor={theme.text}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Contenu */}
      <FlatList
        data={searchQuery ? filteredProducts : []}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns} // Ajout du nombre de colonnes
        columnWrapperStyle={isTablet ? styles.columnWrapperTablet : styles.columnWrapperPhone}
        ListHeaderComponent={
          <>
            {searchQuery === '' && recentSearches.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Recherches récentes</Text>
                <FlatList
                  data={recentSearches}
                  renderItem={renderRecentSearchItem}
                  keyExtractor={(item, index) => index.toString()}
                  scrollEnabled={false}
                />
              </>
            )}
            {searchQuery !== '' && (
              <Text style={[styles.resultsTitle, { color: theme.text }]}>
                {filteredProducts.length} résultats pour "{searchQuery}"
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          searchQuery !== '' ? (
            <View style={styles.emptyResults}>
              <Ionicons name="search" size={50} color={theme.text} />
              <Text style={[styles.emptyText, { color: theme.text }]}>Aucun résultat trouvé</Text>
              <Text style={[styles.emptySubtext, { color: theme.text }]}>
                Essayez avec d'autres termes de recherche
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
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
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginLeft: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    marginRight: 10,
  },
  listContent: {
    padding: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  resultsTitle: {
    fontSize: 16,
    marginBottom: 15,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recentSearchText: {
    fontSize: 16,
    marginLeft: 10,
  },
  productItem: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  productDetails: {
    width: '100%',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  emptyResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    width: '100%',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  columnWrapperTablet: {
    justifyContent: 'space-between',
    marginHorizontal: '1%',
  },
  columnWrapperPhone: {
    justifyContent: 'space-between',
    marginHorizontal: '1%',
  },
});

export default SearchScreen;