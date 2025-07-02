/**
 * Ce fichier définit l'écran d'accueil de l'application.
 * Il affiche des informations sur l'utilisateur, l'objectif du jour, les progrès,
 * un article suggéré et la dernière notification.
 *
 * @module BulkUploadScreen
 */

import React, { useState, useEffect } from 'react';
import { View, 
    Text, 
    TouchableOpacity, 
    FlatList, 
    StyleSheet, 
    Button,
    SafeAreaView,
    ScrollView,
    Image,
    Share,
    Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { getProducts } from '../../services/apiService';
import { Product } from '../../services/types';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type ProductType = {
  id: string;
  name: string;
  price: string;
  image: string; // L'image sera maintenant une URL
  quantity?: number;
};

type SearchScreenProps = {
    navigation: any;
  };
  

const BulkUploadScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
      
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
    const [productPrice, setProductPrice] = useState(99.99); // Prix initial du produit
    const productDescription = "Ceci est une description détaillée du produit. Il est fabriqué avec des matériaux de haute qualité et conçu pour durer.";
    const [searchQuery, setSearchQuery] = useState<string>('');
  
    const { isDarkMode, toggleTheme } = useTheme();
    const theme = isDarkMode ? darkTheme : lightTheme;
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
      const loadToken = async () => {
        const storedToken = await AsyncStorage.getItem('access_token');
        setToken(storedToken);
      };
      loadToken();
    }, []);
    

  // Simuler un chargement de produits
    useEffect(() => {
      const fetchProducts = async () => {
        if (!token) return; // Ne rien faire si le token n'est pas chargé
    
        try {
          const data = await getProducts(token); // Passe le token ici
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
    }, [token]); // Déclencher quand le token change

    const shareProduct = async (includePrice: boolean, customPrice?: number) => {
        const priceText = includePrice ? `Prix: $${customPrice || productPrice}` : '';
        const message = `Découvrez ce produit: ${productDescription}\n${priceText}\nLien: https://exemple.com/produit`;
  
        try {
            await Share.share({
            message: message,
            });
        } catch (error) {
            Alert.alert('Erreur', 'Impossible de partager le produit.');
        }
    };
   
   
    const filteredProducts = products.filter((product) => {
      const matchesCategory = selectedCategory ? product.category.name === selectedCategory : true;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
   
     // Fonction pour mettre à jour la quantité d'un produit
     const updateQuantity = (productId: string, increment: boolean) => {
       setProductQuantities((prev) => ({
         ...prev,
         [productId]: Math.max(0, prev[productId] + (increment ? 1 : -1)),
       }));
     };
   
     const formatPrice = (price: string) => {
      return parseInt(price).toLocaleString('fr-FR');
    };
   
     const renderProduct = ({ item }: { item: Product }) => (
        <TouchableOpacity style={[
        styles.productCard,
        selectedProducts.includes(item.id) && styles.selectedProductItem,
        ]}
        onPress={() => toggleProductSelection(item.id)}>

            {selectedProducts.includes(item.id) && (
                <Ionicons name="checkmark-circle" size={24} color="green" />
                )}

            <View style={styles.productImageContainer}>
            {/* <Image source={{ uri: item.image }} style={styles.productImage} /> */}
            </View>
            <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>{formatPrice(item.prices[0]?.price)} FCFA</Text>
            </View>
        </TouchableOpacity>
       );

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prevSelected) =>
      prevSelected.includes(productId)
        ? prevSelected.filter((id) => id !== productId)
        : [...prevSelected, productId]
    );
  };

  const handleShareProducts = () => {
    const selectedProductNames = selectedProducts.map((id) => {
      const product = products.find((p) => p.id === id);
      return product ? product.name : '';
    });

    // Ici, vous pouvez implémenter la logique de partage
    console.log('Produits sélectionnés:', selectedProductNames);
    // Exemple de partage avec une API ou une autre application
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView>
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={28} color="#F58320" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Sélectionnez les produits</Text>
            </View>
            {/* Liste des produits */}
            <FlatList
                data={filteredProducts}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.productList}
            />

            <Button
                color="#F58320" 
                title="Partager les produits"
                onPress={() => shareProduct(false)}
                disabled={selectedProducts.length === 0}/>
        </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 40,
    paddingVertical: 50,
      },
      headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
      },
      errorText: {
        color: 'red',
        textAlign: 'center',
        marginTop: 20,
      },
      headerContainer: {
        flexDirection: "row",  
        alignItems: "center",  
        marginBottom: 10,  
      },
      iconBack: {
        marginRight: 10, // Espacement entre l'icône et le texte
      },
      sectionTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#2c3e50",
      },
    
      header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F58320',
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 10,
      },
      categoryContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 20,
      },
      categoryButton: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#FFF5EC',
        marginRight: 10,
      },
      selectedCategoryButton: {
        backgroundColor: '#F58320',
      },
      categoryText: {
        color: '#2c3e50',
        fontWeight: '500',
      },
      // productList: {
      //   paddingHorizontal: 20,
      // },
      // productCard: {
      //   flex: 1,
      //   backgroundColor: '#FFF5EC',
      //   borderRadius: 15,
      //   padding: 15,
      //   margin: 5,
      //   alignItems: 'center',
      // },
      // productImage: {
      //   width: 80,
      //   height: 80,
      //   resizeMode: 'contain',
      // },
      // productName: {
      //   fontSize: 16,
      //   fontWeight: 'bold',
      //   color: '#2c3e50',
      //   marginTop: 10,
      // },
      // productPrice: {
      //   fontSize: 14,
      //   color: '#F58320',
      //   marginTop: 5,
      // },
    
      productList: {
        paddingHorizontal: 20,
        paddingVertical: 10,
      },
      productCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
      },
      productImageContainer: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF5EC',
        borderRadius: 10,
      },
      productImage: {
        width: 60,
        height: 60,
        resizeMode: 'contain',
      },
      productInfo: {
        flex: 1,
        marginLeft: 15,
      },
      productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
      },
      productPrice: {
        fontSize: 14,
        color: '#F58320',
        fontWeight: '600',
      },
      cartActions: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      cartButton: {
        padding: 5,
      },
      quantityText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginHorizontal: 10,
      },
      cartIconContainer: {
        backgroundColor: '#FFF5EC',
        padding: 8,
        borderRadius: 8,
      },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  selectedProductItem: {
    backgroundColor: '#e0f7fa',
  },
  productText: {
    fontSize: 16,
  },
});

export default BulkUploadScreen;