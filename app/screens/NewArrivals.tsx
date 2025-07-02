/**
 * Ce fichier définit l'écran de gestion des objectifs.
 * Il permet à l'utilisateur de créer, suivre et supprimer des objectifs.
 *
 * @module NewArrivalsScreen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { usersData } from '../../data/userData';

// Données statiques pour les catégories et produits
const categories = [
  { id: '1', name: 'Électronique' },
  { id: '2', name: 'Vêtements' },
  { id: '3', name: 'Maison' },
];

const products = [
  {
    id: '1',
    name: 'iPhone 15 Pro Max',
    price: 1200000, // 1200 USD ≈ 1200000 XOF
    image: 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-blacktitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1693009279096',
    category: 'Électronique',
    description: 'Le dernier iPhone avec un écran Super Retina XDR, une puce A17 Pro et un appareil photo avancé.',
  },
  {
    id: '2',
    name: 'Samsung Galaxy S23 Ultra',
    price: 1000000, // 1000 USD ≈ 1000000 XOF
    image: 'https://images.samsung.com/is/image/samsung/p6pim/fr/2302/gallery/fr-galaxy-s23-ultra-s918-sm-s918bzadeub-534864917?$650_519_PNG$',
    category: 'Électronique',
    description: 'Smartphone haut de gamme avec un écran Dynamic AMOLED 2X, un appareil photo 200 MP et une batterie longue durée.',
  },
  {
    id: '3',
    name: 'MacBook Air M2',
    price: 1300000, // 1300 USD ≈ 1300000 XOF
    image: 'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/macbook-air-midnight-select-20220606?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1653084303665',
    category: 'Électronique',
    description: 'Ordinateur portable ultra-léger avec la puce M2, un écran Retina et une autonomie de batterie impressionnante.',
  },
];

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
};

type NewArrivalsScreenProps = {
  navigation: any;
};

const NewArrivalsScreen: React.FC<NewArrivalsScreenProps> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
      const [productQuantities, setProductQuantities] = useState<Record<string, number>>(
        products.reduce((acc, product) => ({ ...acc, [product.id]: 0 }), {})
      );
  
    const currentUser = usersData[0];
    
      const updateQuantity = (productId: string, increment: boolean) => {
        setProductQuantities(prev => ({
          ...prev,
          [productId]: Math.max(0, prev[productId] + (increment ? 1 : -1))
        }));
      };

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[styles.productCard, { backgroundColor: theme.header.backgroundColor }]}
      onPress={() => navigation.navigate('ProductDetail', { product: item })}
    >
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <Text style={[styles.productName, { color: theme.header.text }]}>{item.name}</Text>
      <Text style={styles.productPrice}>{item.price.toFixed(2)} FCFA</Text>
      
      
      <View style={styles.cartActions}>
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => updateQuantity(item.id, false)}>
          <Ionicons name="remove-circle" size={24} color="#F58320" />
        </TouchableOpacity>

        <Text style={[styles.quantityText, {color: theme.header.text}]}>{productQuantities[item.id]}</Text>
        
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => updateQuantity(item.id, true)}>
          <Ionicons name="add-circle" size={24} color="#F58320" />
        </TouchableOpacity>
        
        <View style={[styles.cartIconContainer, {backgroundColor: theme.header.backgroundColor}]}>
          <Ionicons name="cart-outline" size={24} color="#F58320" />
        </View>
      </View>
    </TouchableOpacity>
  );
  
    const { isDarkMode, toggleTheme } = useTheme();
  
    const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={28} color="#F58320" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.header.text }]}>Nouveaux produits</Text>
          </View>
      <TextInput
        style={[styles.searchInput, { backgroundColor: theme.header.backgroundColor }]}
        placeholder="Rechercher un produit..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <View style={styles.categoryContainer}>
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
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.productList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    paddingVertical: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
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

  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  selectedCategoryButton: {
    backgroundColor: '#F58320',
  },
  categoryText: {
    color: '#2c3e50',
  },
  productList: {
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    width: '48%',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  productPrice: {
    fontSize: 14,
    color: '#F58320',
  },
  

  cartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  cartButton: {
    padding: 5,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 10,
  },
  cartIconContainer: {
    backgroundColor: '#FFF5EC',
    padding: 8,
    borderRadius: 8,
  },
});

export default NewArrivalsScreen;
