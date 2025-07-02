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
  Keyboard
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
        setProducts(data);
        setIsLoading(false);
      } catch (error) {
        setError('Erreur lors du chargement des produits');
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [token]);

  // Recherche avec debounce
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.trim() === '') {
        setFilteredProducts([]);
        return;
      }
      
      const results = products.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description?.toLowerCase().includes(query.toLowerCase()) ||
        product.category.name.toLowerCase().includes(query.toLowerCase())
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

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={[styles.productItem, { backgroundColor: theme.background }]}
      onPress={() => navigation.navigate('ProductDetailScreen', { productId: item.id })}
    >
      <Image 
        source={{ uri: item.image }} 
        style={styles.productImage} 
        resizeMode="contain"
      />
      <View style={styles.productDetails}>
        <Text style={[styles.productName, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.productPrice, { color: '#F58320' }]}>
          {formatPrice(item.prices[0]?.price)} FCFA
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
            placeholder="Rechercher un produit..."
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
    padding: 20,
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
    padding: 15,
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
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
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
});

export default SearchScreen;