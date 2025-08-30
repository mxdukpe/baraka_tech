import React, { useState, useEffect, useCallback } from 'react';
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
  ScrollView,
  Platform, AppState,
  Modal
} from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, ProductImage, CategoryParentInfo, Category, ProductResponse } from '../../services/types';
import { getProducts, getProducts50Simple, getProductsPaginated  } from '../../services/apiService';
import axios from 'axios';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import HeaderComponent from './HeaderComponent';

const API_BASE_URL = 'https://backend.barakasn.com/api/v0/';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

const getIconForCategory = (categoryName: string): keyof typeof Ionicons.glyphMap => {
  const lowerName = categoryName.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (lowerName.includes(key)) {
      return icon as keyof typeof Ionicons.glyphMap;
    }
  }
  return 'grid-outline';
};

interface ParentCategory {
  id: number;
  name: string;
  count: number;
  hasProducts?: boolean;
}

interface CategoryWithSubcategories {
  id: number;
  name: string;
  subcategories: Category[];
}

const CategoryScreen: React.FC<CategoryScreenProps> = ({ navigation }) => {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [parentsWithoutCategories, setParentsWithoutCategories] = useState<ParentCategory[]>([]);
  const [categoriesWithSubcategories, setCategoriesWithSubcategories] = useState<CategoryWithSubcategories[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Category | null>(null);
  const [subcategoryProducts, setSubcategoryProducts] = useState<Product[]>([]);
  
  const [loading, setLoading] = useState({
    categories: true,
    products: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showPrices, setShowPrices] = useState(true);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalProducts, setModalProducts] = useState<Product[]>([]);
  const [modalCategoryName, setModalCategoryName] = useState<string>('');
  const [modalLoading, setModalLoading] = useState(false);
  
  // Share modal states
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [shareWithPrice, setShareWithPrice] = useState(true);
  const [shareWithDescription, setShareWithDescription] = useState(true);
  const [shareWithImage, setShareWithImage] = useState(true);
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  
  const { isDarkMode, toggleTheme } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
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

  // Fonction pour vérifier si une catégorie a des produits
  const categoryHasProducts = async (categoryId: string): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await axios.get(`${API_BASE_URL}products/products/?category=${categoryId}&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      return response.data.results && response.data.results.length > 0;
    } catch (error) {
      return false;
    }
  };

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

  // Récupérer les produits pour une catégorie spécifique
  const fetchProductsForCategory = async (categoryId: string, limit: number = 50): Promise<Product[]> => {
    if (!token) return [];

    try {
      let response = await axios.get(`${API_BASE_URL}products/products/?category=${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.data.results || response.data.results.length === 0) {
        const selectedCat = allCategories.find(cat => cat.id === categoryId);
        if (selectedCat) {
          response = await axios.get(`${API_BASE_URL}products/products/?category_name=${selectedCat.name}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      if (!response.data.results || response.data.results.length === 0) {
        response = await axios.get(`${API_BASE_URL}products/products/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const selectedCat = allCategories.find(cat => cat.id === categoryId);
        if (selectedCat && response.data.results) {
          const filteredProducts = response.data.results.filter((product: any) => {
            return product.category === selectedCat.name || 
                   product.category?.toLowerCase() === selectedCat.name.toLowerCase() ||
                   (product.category_info && product.category_info.name === selectedCat.name);
          });
          return filteredProducts.slice(0, limit);
        }
      }

      return (response.data.results || []).slice(0, limit);
    } catch (err: any) {
      console.error('Erreur fetchProducts:', err);
      return [];
    }
  };

  // Récupérer toutes les catégories et créer la nouvelle structure
  const fetchAllCategories = async () => {
    if (!token) return;

    try {
      setLoading(prev => ({ ...prev, categories: true }));
      setError(null);

      const allCategoriesData = await fetchAllCategoriesPages(token);
      setAllCategories(allCategoriesData);
      
      // Séparer les catégories parent
      const parentMap = new Map<number, { name: string; count: number; hasChildren: boolean }>();
      
      // Compter les enfants pour chaque parent
      allCategoriesData.forEach(category => {
        if (category.parent_info) {
          const parentId = category.parent_info.id;
          const parentName = category.parent_info.name;
          
          if (parentMap.has(parentId)) {
            parentMap.get(parentId)!.count++;
            parentMap.get(parentId)!.hasChildren = true;
          } else {
            parentMap.set(parentId, { name: parentName, count: 1, hasChildren: true });
          }
        }
      });

      // Ajouter les parents qui n'ont pas d'enfants (catégories sans sous-catégories)
      const allParentIds = new Set(Array.from(parentMap.keys()));
      
      // Vérifier tous les parents possibles
      const uniqueParents = allCategoriesData.reduce((acc, category) => {
        if (category.parent_info && !acc.some(p => p.id === category.parent_info.id)) {
          acc.push({
            id: category.parent_info.id,
            name: category.parent_info.name
          });
        }
        return acc;
      }, [] as Array<{id: number, name: string}>);

      // Identifier les parents sans enfants
      const parentsWithoutChildren: ParentCategory[] = [];
      const parentsWithChildren: ParentCategory[] = [];

      uniqueParents.forEach(parent => {
        if (parentMap.has(parent.id)) {
          parentsWithChildren.push({
            id: parent.id,
            name: parent.name,
            count: parentMap.get(parent.id)!.count
          });
        } else {
          parentsWithoutChildren.push({
            id: parent.id,
            name: parent.name,
            count: 0
          });
        }
      });

      setParentsWithoutCategories(parentsWithoutChildren);

      // Créer les catégories avec leurs sous-catégories (SANS vérifier les produits)
      const categoriesWithSubs: CategoryWithSubcategories[] = [];
      
      for (const parent of parentsWithChildren) {
        const subcategories = allCategoriesData.filter(cat => 
          cat.parent_info && cat.parent_info.id === parent.id
        );

        // Afficher toutes les catégories qui ont des sous-catégories
        if (subcategories.length > 0) {
          categoriesWithSubs.push({
            id: parent.id,
            name: parent.name,
            subcategories: subcategories
          });
        }
      }

      setCategoriesWithSubcategories(categoriesWithSubs);

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

  // Gestion de la sélection d'une sous-catégorie
  const handleSubcategorySelect = async (subcategory: Category) => {
    setSelectedSubcategory(subcategory);
    setLoading(prev => ({ ...prev, products: true }));
    
    const products = await fetchProductsForCategory(subcategory.id);
    setSubcategoryProducts(products);
    
    setLoading(prev => ({ ...prev, products: false }));
  };

  useEffect(() => {
    if (token) {
      fetchAllCategories();
    }
  }, [token]);

  const getImageUri = (imagePath: string | undefined) => {
    if (!imagePath) return undefined;
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('/media/')) {
      return `https://backend.barakasn.com${imagePath}`;
    }
    
    if (imagePath.includes('product_iamges')) {
      return `https://backend.barakasn.com/media/${imagePath}`;
    }
    
    return `https://backend.barakasn.com/media/${imagePath}`;
  };

  const getPriceByCriterion = (product: Product) => {
    return product.prices[0];
  };

  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };

  // Fonction pour créer un message de partage unifié
  const generateUnifiedShareMessage = () => {
    if (!product) return '';
    
    let message = `🛍️ *${product.name}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (shareWithPrice) {
      const priceToUse = useCustomPrice ? customPrice : (product.prices[0]?.price || '0');
      message += `💰 *Prix:* ${formatPrice(priceToUse)} FCFA\n\n`;
    }
    
    if (shareWithDescription && product.description) {
      message += `📝 *Description:*\n${product.description}\n\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📱 *Contactez-nous pour plus d'informations !*\n`;
    message += `🛒 *Commandez maintenant !*`;
    
    return message;
  };

  const openShareModal = (productToShare: Product) => {
    setProduct(productToShare);
    setShareModalVisible(true);
  };

  // Rendu des éléments de liste
  const renderSidebarParent = ({ item }: { item: ParentCategory }) => {
    return (
      <View style={styles.sidebarItem}>
        <Text style={styles.sidebarText} numberOfLines={2}>
          {item.name}
        </Text>
      </View>
    );
  };

  const renderCategoryWithSubs = ({ item: categoryGroup }: { item: CategoryWithSubcategories }) => {
    return (
      <View style={styles.categorySection}>
        <Text style={styles.categorySectionTitle}>{categoryGroup.name}</Text>
        
        <View style={styles.subcategoriesGrid}>
          {categoryGroup.subcategories.map((subcategory) => (
            <TouchableOpacity
              key={subcategory.id}
              style={[
                styles.subcategoryCard,
                selectedSubcategory?.id === subcategory.id && styles.subcategoryCardSelected
              ]}
              onPress={() => handleSubcategorySelect(subcategory)}
            >
              <Ionicons 
                name={getIconForCategory(subcategory.name) as any} 
                size={24} 
                color={selectedSubcategory?.id === subcategory.id ? '#fff' : '#F58320'} 
              />
              <Text style={[
                styles.subcategoryName,
                selectedSubcategory?.id === subcategory.id && styles.subcategoryNameSelected
              ]} numberOfLines={2}>
                {subcategory.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const productImage = item.images?.[0]?.image;
    const productPrice = getPriceByCriterion(item);
    const stockStatus = item.stock === 0;
    
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => {
          navigation.navigate('ProductDetailScreen', { productId: item.id });
        }}
      >
        <View style={styles.productImageContainer}>
          {productImage ? (
            <Image
              source={{ uri: getImageUri(productImage) }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <Image
              source={require('../../assets/images/baraka_icon.png')}
              style={styles.productImage}
              resizeMode="contain"
            />
          )}
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          
          {showPrices && (
            <Text style={styles.productPrice}>
              {productPrice ? `${formatPrice(productPrice.price)} FCFA` : 'Prix N/A'}
            </Text>
          )}
          
          <View style={[
            styles.stockIndicator,
            { backgroundColor: stockStatus ? '#FF3B30' : '#34C759' }
          ]}>
            <Text style={styles.stockText}>
              {stockStatus ? 'RUPTURE' : 'STOCK'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderShareModal = () => {
    if (!product) return null;
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={shareModalVisible}
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Partager le produit
              </Text>
              <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Options de partage */}
              <View style={styles.shareOptions}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Éléments à inclure
                </Text>
                
                <TouchableOpacity 
                  style={styles.optionRow}
                  onPress={() => setShareWithPrice(!shareWithPrice)}
                >
                  <Ionicons 
                    name={shareWithPrice ? "checkbox" : "square-outline"} 
                    size={20} 
                    color="#F58320" 
                  />
                  <Text style={[styles.optionText, { color: theme.text }]}>
                    Inclure le prix
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.optionRow}
                  onPress={() => setShareWithDescription(!shareWithDescription)}
                >
                  <Ionicons 
                    name={shareWithDescription ? "checkbox" : "square-outline"} 
                    size={20} 
                    color="#F58320" 
                  />
                  <Text style={[styles.optionText, { color: theme.text }]}>
                    Inclure la description
                  </Text>
                </TouchableOpacity>

                {shareWithPrice && (
                  <TouchableOpacity 
                    style={[styles.optionRow, { marginLeft: 20 }]}
                    onPress={() => setUseCustomPrice(!useCustomPrice)}
                  >
                    <Ionicons 
                      name={useCustomPrice ? "checkbox" : "square-outline"} 
                      size={20} 
                      color="#F58320" 
                    />
                    <Text style={[styles.optionText, { color: theme.text }]}>
                      Utiliser un prix personnalisé
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Prix personnalisé */}
              {shareWithPrice && useCustomPrice && (
                <View style={styles.customPriceSection}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Prix personnalisé
                  </Text>
                  <View style={styles.priceInputContainer}>
                    <TextInput
                      style={[styles.customPriceInput, { 
                        color: theme.text, 
                        borderColor: theme.text + '40',
                        backgroundColor: theme.background 
                      }]}
                      value={customPrice}
                      onChangeText={setCustomPrice}
                      placeholder="Entrez le prix"
                      keyboardType="numeric"
                      placeholderTextColor={theme.text + '60'}
                    />
                    <Text style={[styles.currencyLabel, { color: theme.text }]}>FCFA</Text>
                  </View>
                </View>
              )}

              {/* Aperçu du message */}
              <View style={styles.previewSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Aperçu du message
                </Text>
                <View style={[styles.previewBox, { 
                  backgroundColor: theme.background, 
                  borderColor: theme.text + '20' 
                }]}>
                  <Text style={[styles.previewText, { color: theme.text }]}>
                    {generateUnifiedShareMessage()}
                  </Text>
                </View>
              </View>

              {/* Aperçu de l'image */}
              {shareWithImage && product.images && product.images.length > 0 && (
                <View style={styles.imagePreviewSection}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Image à partager
                  </Text>
                  <Image 
                    source={{ uri: getImageUri(product.images[0]?.image) }}
                    style={styles.sharePreviewImage}
                    defaultSource={require('../../assets/images/baraka_icon.png')}
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: theme.text + '40' }]}
                onPress={() => setShareModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
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
      {/* Header */}
      <HeaderComponent 
        navigation={navigation}
        title="Nos Catégories"
      />

      {/* Render du modal de partage */}
      {renderShareModal()}

      {/* Contenu principal */}
      <View style={styles.mainContent}>
        {/* Sidebar - Parents sans catégories */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Catégories</Text>
          <FlatList
            data={parentsWithoutCategories}
            renderItem={renderSidebarParent}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sidebarContent}
            ListEmptyComponent={
              <Text style={styles.emptySidebarText}>Aucune catégorie</Text>
            }
          />
        </View>

        {/* Zone de contenu principal */}
        <View style={styles.contentArea}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Section des catégories avec sous-catégories */}
            <View style={styles.categoriesSection}>
              <FlatList
                data={categoriesWithSubcategories}
                renderItem={renderCategoryWithSubs}
                keyExtractor={item => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.categoryList}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="folder-open-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>Aucune catégorie avec produits disponible</Text>
                  </View>
                }
              />
            </View>

            {/* Section des produits de la sous-catégorie sélectionnée */}
            {selectedSubcategory && (
              <View style={styles.productsSection}>
                <View style={styles.productsSectionHeader}>
                  <Text style={styles.productsSectionTitle}>
                    Produits - {selectedSubcategory.name}
                  </Text>
                </View>

                {loading.products ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#F58320" />
                    <Text style={styles.loadingText}>Chargement des produits...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={subcategoryProducts}
                    renderItem={renderProduct}
                    keyExtractor={item => item.id.toString()}
                    numColumns={2}
                    columnWrapperStyle={styles.productRow}
                    contentContainerStyle={styles.productsList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                        <Ionicons name="cube-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>Aucun produit disponible dans cette sous-catégorie</Text>
                      </View>
                    }
                  />
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
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

  // Layout principal
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
  },

  // Sidebar - Parents sans catégories
  sidebar: {
  width: wp("28%"), // au lieu de width: 120
  backgroundColor: '#f8f9fa',
  borderRightWidth: 1,
  borderRightColor: '#e9ecef',
  paddingTop: hp("2%"),
},
sidebarTitle: {
  fontSize: hp("1.6%"), // taille relative
  fontWeight: 'bold',
  color: '#333',
  textAlign: 'center',
  marginBottom: hp("1.5%"),
  paddingHorizontal: wp("2%"),
},
  
  sidebarContent: {
    padding: 8,
  },
  
  sidebarItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginVertical: 2,
    borderRadius: 6,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
  },
  
  sidebarText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    lineHeight: 13,
  },
  
  emptySidebarText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },

  // Zone de contenu
  contentArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  categoriesSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  
  categoryList: {
    paddingBottom: 20,
  },

  // Section catégorie avec sous-catégories
  categorySection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  categorySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },

  subcategoryCard: {
  width: wp("28%"), // au lieu de (screenWidth - 80) / 3
  backgroundColor: '#f8f9fa',
  borderRadius: 10,
  padding: hp("1.5%"),
  marginBottom: hp("1.5%"),
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#e9ecef',
},
subcategoryName: {
  fontSize: hp("1.5%"),
  fontWeight: '600',
  color: '#333',
  textAlign: 'center',
  marginTop: hp("1%"),
  lineHeight: hp("2%"),
},

  
  subcategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  // subcategoryCard: {
  //   width: (screenWidth - 80) / 3,
  //   backgroundColor: '#f8f9fa',
  //   borderRadius: 10,
  //   padding: 12,
  //   marginBottom: 12,
  //   alignItems: 'center',
  //   borderWidth: 1,
  //   borderColor: '#e9ecef',
  // },
  
  subcategoryCardSelected: {
    backgroundColor: '#F58320',
    borderColor: '#F58320',
  },
  
  // subcategoryName: {
  //   fontSize: 12,
  //   fontWeight: '600',
  //   color: '#333',
  //   textAlign: 'center',
  //   marginTop: 8,
  //   lineHeight: 14,
  // },
  
  subcategoryNameSelected: {
    color: '#fff',
  },

  // Section des produits
  productsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  
  productsSectionHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  
  productsSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  
  productsList: {
    paddingBottom: 20,
  },
  
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  productCard: {
  flex: 1,
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: hp("1.5%"),
  marginHorizontal: wp("1%"),
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
  maxWidth: wp("46%"), // au lieu de (screenWidth - 48) / 2
},
productImageContainer: {
  height: hp("20%"), // responsive au lieu de 140
  borderRadius: 8,
  overflow: 'hidden',
  marginBottom: hp("1%"),
  position: 'relative',
},
productName: {
  fontSize: hp("1.8%"),
  fontWeight: '600',
  color: '#333',
  marginBottom: hp("0.8%"),
  lineHeight: hp("2%"),
},
productPrice: {
  fontSize: hp("1.7%"),
  color: '#F58320',
  fontWeight: 'bold',
  marginBottom: hp("1%"),
},
stockText: {
  fontSize: hp("1.2%"),
  color: '#fff',
  fontWeight: 'bold',
},

  
  // productCard: {
  //   flex: 1,
  //   backgroundColor: '#fff',
  //   borderRadius: 12,
  //   padding: 12,
  //   marginHorizontal: 6,
  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.1,
  //   shadowRadius: 4,
  //   elevation: 3,
  //   maxWidth: (screenWidth - 48) / 2,
  // },
  
  // productImageContainer: {
  //   height: 140,
  //   borderRadius: 8,
  //   overflow: 'hidden',
  //   marginBottom: 8,
  //   position: 'relative',
  // },
  
  productImage: {
    width: '100%',
    height: '100%',
  },
  
  productInfo: {
    flex: 1,
  },
  
  // productName: {
  //   fontSize: 14,
  //   fontWeight: '600',
  //   color: '#333',
  //   marginBottom: 6,
  //   lineHeight: 16,
  // },
  
  // productPrice: {
  //   fontSize: 13,
  //   color: '#F58320',
  //   fontWeight: 'bold',
  //   marginBottom: 8,
  // },
  
  stockIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  
  // stockText: {
  //   fontSize: 10,
  //   color: '#fff',
  //   fontWeight: 'bold',
  // },

  // États vides
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Styles pour les modals de partage
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  modalBody: {
    maxHeight: '75%',
  },
  
  shareOptions: {
    marginBottom: 20,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  
  optionText: {
    fontSize: 16,
    marginLeft: 10,
  },
  
  customPriceSection: {
    marginBottom: 20,
  },
  
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  customPriceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  previewSection: {
    marginBottom: 20,
  },
  
  previewBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  
  previewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  
  imagePreviewSection: {
    marginBottom: 20,
  },
  
  sharePreviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  
  cancelButtonText: {
    fontSize: 16,
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

export default CategoryScreen;