import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, ProductImage, CategoryParentInfo, Category, ProductResponse } from '../../services/types';
import axios from 'axios';

const API_BASE_URL = 'https://backend.barakasn.com/api/v0/';
const { width, height } = Dimensions.get('window');

interface CategoryScreenProps {
  navigation: any;
}

// Données de configuration pour les icônes
const categoryIcons: { [key: string]: string } = {
  'téléphone': 'phone-portrait-outline',
  'smartphone': 'phone-portrait-outline',
  'phone': 'phone-portrait-outline',
  'ordinateur': 'laptop-outline',
  'informatique': 'laptop-outline',
  'montre': 'watch-outline',
  'watch': 'watch-outline',
  'mode': 'shirt-outline',
  'vêtement': 'shirt-outline',
  'appareil': 'camera-outline',
  'photo': 'camera-outline',
  'électronique': 'flash-outline',
  'accessoire': 'headset-outline',
  'bluetooth': 'bluetooth-outline',
  'batterie': 'battery-half-outline',
  'carte': 'card-outline',
  'chargeur': 'battery-charging-outline',
  'câble': 'git-branch-outline',
  'coque': 'phone-portrait-outline',
  'film': 'shield-outline',
  'protecteur': 'shield-outline',
  'video': 'videocam-outline',
  'projecteur': 'videocam-outline',
  'television': 'tv-outline',
  'tv': 'tv-outline',
};

const getIconForCategory = (categoryName: string): string => {
  const lowerName = categoryName.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (lowerName.includes(key)) {
      return icon;
    }
  }
  return 'grid-outline';
};

// Types pour la navigation
type NavigationLevel = 'parents' | 'categories' | 'products';

interface ParentCategory {
  id: number;
  name: string;
  count: number;
}

const CategoryScreen: React.FC<CategoryScreenProps> = ({ navigation }) => {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [parentCategories, setParentCategories] = useState<ParentCategory[]>([]);
  const [currentCategories, setCurrentCategories] = useState<Category[]>([]);
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);
  
  const [selectedParent, setSelectedParent] = useState<ParentCategory | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>('parents');
  const [loading, setLoading] = useState({
    categories: true,
    products: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Récupérer le token depuis AsyncStorage
  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('access_token');
        setToken(storedToken);
      } catch (err) {
        console.error('Erreur lors de la récupération du token:', err);
      }
    };
    getToken();
  }, []);

  // Fonction pour récupérer toutes les pages de catégories
  const fetchAllCategoriesPages = async (token: string, page: number = 1, accumulatedCategories: Category[] = []): Promise<Category[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}products/categories/?page=${page}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data;
      const newCategories = [...accumulatedCategories, ...(data.results || [])];

      if (data.next) {
        return await fetchAllCategoriesPages(token, page + 1, newCategories);
      }

      return newCategories;
    } catch (error) {
      console.error(`Erreur lors du chargement de la page ${page}:`, error);
      return accumulatedCategories;
    }
  };

  // Récupérer toutes les catégories et créer la structure parent-enfant
  const fetchAllCategories = async () => {
    if (!token) return;

    try {
      setLoading(prev => ({ ...prev, categories: true }));
      setError(null);

      console.log('Début du chargement de toutes les catégories...');
      
      const allCategoriesData = await fetchAllCategoriesPages(token);
      console.log(`Total des catégories chargées: ${allCategoriesData.length}`);
      
      setAllCategories(allCategoriesData);
      
      // Créer la structure des catégories parent
      const parentMap = new Map<number, { name: string; count: number }>();
      
      allCategoriesData.forEach(category => {
        if (category.parent_info) {
          const parentId = category.parent_info.id;
          const parentName = category.parent_info.name;
          
          if (parentMap.has(parentId)) {
            parentMap.get(parentId)!.count++;
          } else {
            parentMap.set(parentId, { name: parentName, count: 1 });
          }
        }
      });

      const parents: ParentCategory[] = Array.from(parentMap.entries()).map(([id, info]) => ({
        id,
        name: info.name,
        count: info.count
      }));

      setParentCategories(parents);
      console.log(`Catégories parent trouvées: ${parents.length}`);
      console.log('Parents:', parents);

    } catch (err: any) {
      setError(err.message);
      console.error('Erreur lors de la récupération des catégories:', err);

      if (err.response?.status === 401) {
        Alert.alert(
          'Session expirée',
          'Veuillez vous reconnecter',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  };

  // Récupérer les produits d'une catégorie spécifique
  const fetchProductsForCategory = async (categoryId: string) => {
    if (!token) return;

    try {
      setLoading(prev => ({ ...prev, products: true }));

      let allProducts: Product[] = [];
      let page = 1;
      let hasNext = true;

      while (hasNext) {
        const response = await axios.get(`${API_BASE_URL}products/products/?page=${page}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data: ProductResponse = response.data;
        
        // Filtrer les produits de cette catégorie
        const categoryProducts = data.results.filter(product => 
          product.category.id.toString() === categoryId.toString()
        );

        allProducts = [...allProducts, ...categoryProducts];

        hasNext = !!data.next;
        page++;
      }

      setCurrentProducts(allProducts);
      console.log(`Produits trouvés pour la catégorie ${categoryId}: ${allProducts.length}`);

    } catch (err: any) {
      console.error('Erreur lors de la récupération des produits:', err);
      Alert.alert('Erreur', 'Impossible de charger les produits');
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllCategories();
    }
  }, [token]);

  // Gestion de la navigation
  const handleParentSelect = (parent: ParentCategory) => {
    console.log(`Sélection du parent: ${parent.name} (ID: ${parent.id})`);
    setSelectedParent(parent);
    
    // Filtrer les catégories enfant de ce parent
    const childCategories = allCategories.filter(cat => 
      cat.parent_info && cat.parent_info.id === parent.id
    );
    
    setCurrentCategories(childCategories);
    setCurrentLevel('categories');
    console.log(`Catégories enfant trouvées: ${childCategories.length}`);
  };

  const handleCategorySelect = (category: Category) => {
    console.log(`Sélection de la catégorie: ${category.name} (ID: ${category.id})`);
    setSelectedCategory(category);
    setCurrentLevel('products');
    fetchProductsForCategory(category.id);
  };

  const handleBackNavigation = () => {
    if (currentLevel === 'products') {
      setCurrentLevel('categories');
      setSelectedCategory(null);
      setCurrentProducts([]);
    } else if (currentLevel === 'categories') {
      setCurrentLevel('parents');
      setSelectedParent(null);
      setCurrentCategories([]);
    }
  };

  // Rendu des éléments de liste
  const renderParentItem = ({ item }: { item: ParentCategory }) => (
    <TouchableOpacity
      style={styles.parentItem}
      onPress={() => handleParentSelect(item)}
    >
      <View style={styles.parentIcon}>
        <Ionicons name={getIconForCategory(item.name) as any} size={28} color="#F58320" />
      </View>
      <View style={styles.parentInfo}>
        <Text style={styles.parentTitle}>{item.name}</Text>
        <Text style={styles.parentSubtitle}>{item.count} catégories</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => handleCategorySelect(item)}
    >
      <View style={styles.categoryIcon}>
        <Ionicons name={getIconForCategory(item.name) as any} size={24} color="#666" />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryTitle}>{item.name}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#666" />
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.productItem}>
      <View style={styles.productImageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image 
            source={{ uri: `${API_BASE_URL.replace('/api/v0/', '')}${item.images[0].image}` }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={40} color="#ccc" />
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description || 'Aucune description disponible'}
        </Text>
        <View style={styles.productFooter}>
          <Text style={styles.productBrand}>{item.brand?.name}</Text>
          <Text style={styles.productStock}>Stock: {item.stock}</Text>
        </View>
        {item.prices && item.prices.length > 0 && (
          <Text style={styles.productPrice}>
            {parseFloat(item.prices[0].price).toLocaleString()} FCFA
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // Fonction pour obtenir le titre de la page
  const getPageTitle = () => {
    if (currentLevel === 'parents') return 'Catégories';
    if (currentLevel === 'categories') return selectedParent?.name || 'Sous-catégories';
    if (currentLevel === 'products') return selectedCategory?.name || 'Produits';
    return 'Catégories';
  };

  if (!token) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F58320" />
        <Text style={styles.loadingText}>Chargement des informations d'authentification...</Text>
      </View>
    );
  }

  if (loading.categories) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F58320" />
        <Text style={styles.loadingText}>Chargement des catégories...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => fetchAllCategories()}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {currentLevel !== 'parents' && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackNavigation}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>{getPageTitle()}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.breadcrumb}>
              {currentLevel === 'parents' && `${parentCategories.length} catégories`}
              {currentLevel === 'categories' && `${currentCategories.length} sous-catégories`}
              {currentLevel === 'products' && `${currentProducts.length} produits`}
            </Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Contenu principal */}
      <View style={styles.content}>
        {loading.products ? (
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#F58320" />
            <Text style={styles.loadingText}>Chargement des produits...</Text>
          </View>
        ) : currentLevel === 'parents' ? (
          <FlatList
            data={parentCategories}
            renderItem={renderParentItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : currentLevel === 'categories' ? (
          <FlatList
            data={currentCategories}
            renderItem={renderCategoryItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={currentProducts}
            renderItem={renderProductItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            numColumns={2}
            columnWrapperStyle={styles.productRow}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>Aucun produit disponible</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  breadcrumb: {
    fontSize: 12,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  // Styles pour les parents
  parentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  parentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  parentInfo: {
    flex: 1,
  },
  parentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  parentSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  // Styles pour les catégories
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  // Styles pour les produits
  productRow: {
    justifyContent: 'space-between',
  },
  productItem: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productImageContainer: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  productStock: {
    fontSize: 11,
    color: '#666',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F58320',
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default CategoryScreen;