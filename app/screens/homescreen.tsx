/**
 * Ce fichier définit l'écran d'accueil de l'application.
 * Il affiche des informations sur l'utilisateur, l'objectif du jour, les progrès,
 * un article suggéré et la dernière notification.
 *
 * @module HomeScreen
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  FlatList,
  SafeAreaView,
   Alert ,
  Dimensions , Switch,
  Share,
  TouchableWithoutFeedback 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usersData } from '../../data/userData';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../../services/types'; // Importez le type Product
import { getProducts } from '../../services/apiService'; // Importez la fonction getProducts
import { useRef } from 'react';


const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;

type HomeScreenProps = {
  navigation: any;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [hidePrices, setHidePrices] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
    
  // const [productQuantities, setProductQuantities] = useState<Record<string, number>>(
  //   products.reduce((acc, product) => ({ ...acc, [product.id]: 0 }), {})
  // );

  const { isDarkMode, toggleTheme } = useTheme();
  
    const theme = isDarkMode ? darkTheme : lightTheme;

  // Simuler l'utilisateur actuel (par exemple, le premier utilisateur)
  const currentUser = usersData[0];

  // const updateQuantity = (productId: string, increment: boolean) => {
  //   setProductQuantities(prev => ({
  //     ...prev,
  //     [productId]: Math.max(0, prev[productId] + (increment ? 1 : -1))
  //   }));
  // };

  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };

  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const updateQuantity = async (productId: string, increment: boolean) => {
    const newQuantity = Math.max(0, productQuantities[productId] + (increment ? 1 : -1));
    setProductQuantities((prev) => ({ ...prev, [productId]: newQuantity }));

    if (increment && newQuantity > 0) {
      try {
        const response = await fetch('https://backend.barakasn.com/api/v0/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, quantity: newQuantity }),
        });

        if (!response.ok) throw new Error('Erreur lors de l\'ajout au panier');
        const data = await response.json();
        console.log('Réponse du serveur:', data);
      } catch (error) {
        console.error('Erreur:', error);
      }
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

  const addToCart = async (productId: string) => {
    const quantity = productQuantities[productId] || 1;
    try {
      const response = await fetch('https://backend.barakasn.com/api/v0/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      });

      if (!response.ok) throw new Error('Erreur lors de l\'ajout au panier');
      const data = await response.json();
      console.log('Réponse du serveur:', data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory ? product.category.name === selectedCategory : true;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  // console.log("Profile URL:", currentUser.profile);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
    const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      if (!token) return;

      try {
        const data = await getProducts(token);
        // Prendre les 4 premiers produits de l'API
        const apiProducts = data.slice(0, 4);
        
        // Associer chaque produit API avec vos images locales
        const localImages = [
          require('../../assets/images/diamond-necklace.webp'),
          require('../../assets/images/gold-ring.webp'),
          require('../../assets/images/silver-bracelet.webp'),
          require('../../assets/images/pearl-earrings.jpeg')
        ];

        const combinedProducts = apiProducts.map((product, index) => ({
          id: product.id.toString(),
          name: product.name,
          price: `${product.prices[0]?.price || '0'} FCFA`,
          image: localImages[index % localImages.length], // Utilisation cyclique des images si plus de 4 produits
          apiData: product // Conserver les données originales de l'API
        }));

        setFeaturedProducts(combinedProducts);
      } catch (error) {
        console.error("Erreur lors du chargement des produits:", error);
        // En cas d'erreur, afficher les produits par défaut
        setFeaturedProducts([
          {
            id: '1',
            name: 'Collier argent mailles gourmettes',
            price: '200000 FCFA',
            image: require('../../assets/images/diamond-necklace.webp')
          },
          {
            id: '2',
            name: 'Bague Or',
            price: '35000 FCFA',
            image: require('../../assets/images/gold-ring.webp')
          },
          {
            id: '3',
            name: 'Bracelet Argent',
            price: '45500 FCFA',
            image: require('../../assets/images/silver-bracelet.webp')
          },
          {
            id: '4',
            name: 'Boucles Perles',
            price: '10000 FCFA',
            image: require('../../assets/images/pearl-earrings.jpeg')
          }
        ]);
      }
    };

    fetchFeaturedProducts();
  }, [token]);

  const [popularProducts, setPopularProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchPopularProducts = async () => {
      if (!token) return;

      try {
        const data = await getProducts(token);
        // Sélectionner aléatoirement 2 produits parmi les 4 premiers
        const shuffled = data.slice(0, 4).sort(() => 0.5 - Math.random());
        const selectedProducts = shuffled.slice(0, 2);
        
        // Images locales pour les bijoux
        const jewelryImages = [
          require('../../assets/images/diamond-necklace.webp'),
          require('../../assets/images/gold-ring.webp'),
          require('../../assets/images/silver-bracelet.webp'),
          require('../../assets/images/pearl-earrings.jpeg')
        ];

        const combinedProducts = selectedProducts.map((product, index) => ({
          ...product,
          id: product.id.toString(),
          price: `${product.prices[0]?.price || '0'} FCFA`,
          image: jewelryImages[index % jewelryImages.length],
          // Ajouter d'autres propriétés nécessaires pour votre design
          quantity: productQuantities[product.id] || 1
        }));

        setPopularProducts(combinedProducts);
      } catch (error) {
        console.error("Erreur API, utilisation des produits par défaut:", error);
        // Fallback avec des produits locaux
        setPopularProducts([
          {
            id: '1',
            name: 'Collier argent mailles',
            price: '200000 FCFA',
            image: require('../../assets/images/diamond-necklace.webp'),
            quantity: 1
          },
          {
            id: '2',
            name: 'Bague Or 18K',
            price: '35000 FCFA',
            image: require('../../assets/images/gold-ring.webp'),
            quantity: 1
          }
        ]);
      }
    };

    fetchPopularProducts();
  }, [token, productQuantities]);



  const [showPrices, setShowPrices] = useState(true);


  // Composant renderProductCard adapté
  const renderPopularProductCard = ({ item }: { item: any }) => (
    <View style={styles.popularProductContainer}>
      <TouchableOpacity 
        style={[styles.popularProductCard, {backgroundColor: theme.header.backgroundColor}]}
        onPress={() => navigation.navigate('ProductDetailScreen', { productId: item.id })}
      >
        <View style={styles.popularProductImageContainer}>
          <Image source={item.image} style={styles.popularProductImage} />
        </View>
        
        <View style={styles.popularProductInfo}>
          <Text style={[styles.popularProductName, {color: theme.header.text}]}>
            {item.name}
          </Text>
          {/* Modification ici pour le prix */}
          <Text style={[styles.productPrice, { color: '#F58320' }]}>
            {showPrices ? `${formatPrice(item.prices[0]?.price)} FCFA` : '•••••'}
          </Text>
        </View>

        <View style={styles.popularProductActions}>
          <TouchableOpacity 
            style={styles.popularProductActionButton}
            onPress={() => updateQuantity(item.id, false)}
          >
            <Ionicons name="remove" size={20} color="#F58320" />
          </TouchableOpacity>
          
          <Text style={[styles.popularProductQuantity, {color: theme.header.text}]}>
            {item.quantity}
          </Text>
          
          <TouchableOpacity 
            style={styles.popularProductActionButton}
            onPress={() => updateQuantity(item.id, true)}
          >
            <Ionicons name="add" size={20} color="#F58320" />
          </TouchableOpacity>
          
          <TouchableOpacity 
          style={styles.shareButton}
          onPress={(e) => {
            e.stopPropagation();
            handleShareProduct(item);
          }}
        >
          <Ionicons name="share-social" size={20} color="#F58320" />
        </TouchableOpacity>
        </View>

        
      </TouchableOpacity>
    </View>
  );

  
  // Fonction pour fermer le menu
  const closeMenu = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={closeMenu}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView showsVerticalScrollIndicator={false}
        onScrollBeginDrag={closeMenu}>

        {/* <TokenDisplay /> */}
        {/* <NotificationPushScreen /> */}

          {/* En-tête */}
          <View style={styles.header}>
            <TouchableOpacity 
            onPress={(e) => {
                e.stopPropagation(); // Empêche la propagation du clic
                setMenuVisible(!menuVisible);
              }} >
              <Ionicons name="menu" size={28} color="#F58320" />
            </TouchableOpacity>

            <View style={styles.profileContainer}>
              <Text style={[styles.profileText, {color: theme.header.text}]}>Baraka Electronique</Text>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate("CartTab")}>
              <Ionicons name="cart-outline" size={28} color="#F58320" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("ScanTab")}>
              <Ionicons name="search-outline" size={28} color="#F58320" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("OrderStatusScreen")}>
              <Ionicons name="bag-outline" size={28} color="#F58320" />
            </TouchableOpacity>

          </View>

          {/* Bannière des nouveaux bijoux */}
          <TouchableOpacity 
            style={[styles.banner, {backgroundColor: theme.header.backgroundColor}]} 
             onPress={() => navigation.navigate("CategoriesTab")}
          >
            <View style={styles.bannerContent}>
              <View>
                <Text style={[styles.bannerTitle, {color: '#8b4513'}]}>Nouveaux Bijoux</Text>
                <Text style={[styles.bannerSubtitle, {color: '#a0522d'}]}>
                  Collection Printemps 2024
                </Text>
              </View>
              <Image 
                source={require('../../assets/images/jewelry.jpg')} 
                style={styles.bannerImage} 
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>

          {/* Pub & Promos */}
          <AutoScrollingCarousel />

          {/* Notification */}
          <NotificationBanner />

          {/* Carrousel des nouveautés */}
          <View style={styles.section}>
            
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
            
            <Text style={[styles.sectionTitle, {color: theme.header.text}]}>Nos Créations Exclusives</Text>

            <FlatList
              data={featuredProducts}
              renderItem={({item}) => (
                <TouchableOpacity 
                  style={[styles.jewelryCard, {backgroundColor: theme.header.backgroundColor}]}
                  onPress={() => navigation.navigate('ProductDetailScreen', { 
                    productId: item.id,
                    productData: item.apiData || item // Passe les données API si disponibles
                  })}
                >
                  <Image source={item.image} style={[styles.jewelryImage]} />
                  <Text style={[styles.jewelryName, {color: theme.header.text}]}>{item.name}</Text>
                  <Text style={[styles.jewelryPrice, {color: theme.header.text}]}>{showPrices ? `${formatPrice(item.price)} FCFA` : '•••••'}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.jewelryContainer}
            />
          </View>

          {/* Catégories */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: theme.header.text}]}>Catégories</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.categoriesScroll}
            >
              {[
                { name: 'Bracelets', icon: 'desktop-outline', image: require("../../assets/images/bracelet.webp") },
                { name: 'Collier', icon: 'tv-outline', image: require("../../assets/images/collier.webp") },
                { name: 'Montres', icon: 'mouse-outline', image: require("../../assets/images/montre.jpeg") },
                { name: 'Chaînes', icon: 'headset-outline', image: require("../../assets/images/chaine.jpg") },
              ].map((category, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.categoryCard}
                  onPress={() => navigation.navigate('CategoriesTab')}
                >
                  <View style={[styles.categoryImageContainer, {backgroundColor: theme.header.backgroundColor}]}>
                    <Image source={category.image} style={styles.categoryImage} />
                  </View>
                  <Text style={[styles.categoryName, {color: theme.header.text}]}>{category.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => navigation.navigate('CategoriesTab')} style={styles.category}>
                <View style={[styles.categoryImageContainer, {backgroundColor: theme.header.backgroundColor}]}>
                  <Ionicons name="ellipsis-horizontal-circle-outline" size={40} color="#fff" />
                </View>
                <Text style={[styles.categoryText, {color: theme.header.text}]}>Voir plus</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Produits populaires */}
          <View style={styles.section}>
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
            
            <Text style={[styles.sectionTitle, {color: theme.header.text}]}>Nos Sélections</Text>
            
            <View style={styles.popularProductsGrid}>
              {popularProducts.map((product) => (
                <View key={product.id} style={styles.popularProductWrapper}>
                  {renderPopularProductCard({ item: product })}
                </View>
              ))}
            </View>

            <TouchableOpacity 
              onPress={() => navigation.navigate('CatalogueScreen')}
              style={styles.seeMoreButton}
            >
              <Text style={[styles.seeMoreText, { color: theme.header.text }]}>
                Découvrir plus de bijoux
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#F58320" />
            </TouchableOpacity>
          </View>

          {/* Menu déroulant */}
          {menuVisible && (
              <View style={[styles.menuDropdown, {backgroundColor: theme.header.backgroundColor}]}>
                <TouchableWithoutFeedback  onPress={() => navigation.navigate('HomeStack')}>
                    <View style={[styles.menuItem]}>
                        <Ionicons name="home-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Accueil</Text>
                    </View>
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback  onPress={() => navigation.navigate('CategoriesTab')}>
                    <View style={styles.menuItem}>
                        <Ionicons name="grid-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Catégories</Text>
                    </View>
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback  onPress={() => navigation.navigate('NotificationsTab')}>
                    <View style={styles.menuItem}>
                        <Ionicons name="notifications-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Notifications</Text>
                    </View>
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback  onPress={() => navigation.navigate('ContactScreen')}>
                    <View style={styles.menuItem}>
                        <Ionicons name="call-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Contacts</Text>
                    </View>
                </TouchableWithoutFeedback>
                {/* <TouchableWithoutFeedback  onPress={() => navigation.navigate('SaleScreen')}>
                    <View style={styles.menuItem}>
                        <Ionicons name="pricetag-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Produits en solde</Text>
                    </View>
                </TouchableWithoutFeedback> */}
                {/* <TouchableOpacity onPress={() => navigation.navigate('Promote')}>
                    <View style={styles.menuItem}>
                        <Ionicons name="megaphone-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Promouvoir</Text>
                    </View>
                </TouchableOpacity> */}
                <TouchableWithoutFeedback  onPress={() => navigation.navigate('ProfileTab')}>
                    <View style={styles.menuItem}>
                        <Ionicons name="person-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Mon Profil</Text>
                    </View>
                </TouchableWithoutFeedback>
                
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                  <View style={styles.menuItem}>
                    <Ionicons
                      name="moon-outline"
                      size={20}
                      style={[styles.menuIcon, { color: theme.header.text }]}
                    />
                    <Text style={[styles.menuText, { color: theme.header.text }]}>Mode Sombre</Text>
                    <Switch value={isDarkMode} onValueChange={toggleTheme} />
                  </View>
                </View>

                <TouchableWithoutFeedback  onPress={() => setShowPrices(!showPrices)}>
                    <View style={styles.menuItem}>
                        <Ionicons 
                          name={showPrices ? 'eye-off' : 'eye'} 
                          size={24} 
                          color="#F58320" 
                        /><Text style={[styles.menuText, {color: theme.header.text}]}>{hidePrices ? "Afficher les prix" : "Masquer les prix"}</Text>
                    </View>
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback  onPress={() => navigation.navigate('ProductListScreen')}>
                    <View style={styles.menuItem}>
                        <Ionicons name="list-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Liste des produits</Text>
                    </View>
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback  onPress={() => navigation.navigate('BulkUploadScreen')}>
                    <View style={styles.menuItem}>
                        <Ionicons name="cloud-upload-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Envoyer plusieurs produits</Text>
                    </View>
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback  onPress={() => navigation.navigate('CatalogueScreen')}>
                    <View style={styles.menuItem}>
                        <Ionicons name="book-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Catalogue</Text>
                    </View>
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback  onPress={() => navigation.navigate('OrderStatusScreen')}>
                    <View style={styles.menuItem}>
                        <Ionicons name="book-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Status des commandes</Text>
                    </View>
                </TouchableWithoutFeedback>
                {/* <TouchableOpacity onPress={() => navigation.navigate('NewArrivals')}>
                    <View style={styles.menuItem}>
                        <Ionicons name="newspaper-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Nouveautés</Text>
                    </View>
                </TouchableOpacity> */}
                {/* <TouchableWithoutFeedback  onPress={() => navigation.navigate('VideoScreen')}>
                    <View style={styles.menuItem}>
                        <Ionicons name="videocam-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Vidéos</Text>
                    </View>
                </TouchableWithoutFeedback> */}
                <TouchableWithoutFeedback onPress={() => navigation.navigate('AppUsageGuideScreen')}>
                    <View style={styles.menuItem}>
                        <Ionicons name="help-circle-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Guide d'utilisation</Text>
                    </View>
                </TouchableWithoutFeedback>
                {/* <TouchableWithoutFeedback onPress={() => navigation.navigate('AdminDashboard')}>
                    <View style={styles.menuItem}>
                        <Ionicons name="help-circle-outline" size={20} color="#000" style={[styles.menuIcon, {color: theme.header.text}]} />
                        <Text style={[styles.menuText, {color: theme.header.text}]}>Dashboard</Text>
                    </View>
                </TouchableWithoutFeedback> */}
              </View>
          
          )}
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const AutoScrollingCarousel = () => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Données pour le carrousel
  const carouselData = [
    {
      id: '1',
      type: 'promo',
      title: 'Promotion spéciale',
      subtitle: 'Jusqu\'à -50% sur les smartphones',
      image: require('../../assets/images/bijoux.jpg'),
      backgroundColor: '#FFE8D6',
      textColor: '#D4A373'
    },
    {
      id: '2',
      type: 'soldes',
      title: 'Soldes d\'été',
      subtitle: 'Profitez des offres exclusives',
      image: require('../../assets/images/bijoux.jpg'),
      backgroundColor: '#F0E6EF',
      textColor: '#7F5A83'
    },
    {
      id: '3',
      type: 'nouveauté',
      title: 'Nouveaux produits',
      subtitle: 'Découvrez les dernières nouveautés',
      image: require('../../assets/images/bijoux.jpg'),
      backgroundColor: '#E6F9FF',
      textColor: '#00A8E8'
    },
  ];

  // Défilement automatique
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % carouselData.length;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true
      });
    }, 5000); // Change toutes les 5 secondes

    return () => clearInterval(interval);
  }, [currentIndex]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.carouselItem, 
        { 
          backgroundColor: theme.header.backgroundColor,
          shadowColor: theme.header.text
        }
      ]}
      onPress={() => Alert.alert(item.title, item.subtitle)}
    >
      <View style={styles.carouselTextContainer}>
        <Text style={[styles.carouselBadge, { backgroundColor: item.textColor }]}>
          {item.type.toUpperCase()}
        </Text>
        <Text style={[styles.carouselTitle, { color: item.textColor }]}>
          {item.title}
        </Text>
        <Text style={[styles.carouselSubtitle, { color: item.textColor }]}>
          {item.subtitle}
        </Text>
      </View>
      <Image source={item.image} style={styles.carouselImage} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={flatListRef}
        data={carouselData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / (width - 40)
          );
          setCurrentIndex(index);
        }}
      />
      <View style={styles.carouselPagination}>
        {carouselData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.carouselDot,
              {
                backgroundColor: 
                  index === currentIndex ? '#F58320' : '#D8D8D8',
                width: index === currentIndex ? 20 : 8,
              }
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const NotificationBanner = () => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);

  // Données de notifications par défaut
  const notifications = [
    {
      id: '1',
      message: '🎉 Nouvelle collection disponible - Découvrez nos bijoux printemps 2024 !',
      type: 'info',
      icon: 'notifications-outline'
    },
    {
      id: '2',
      message: '🚚 Livraison gratuite à partir de 100.000 FCFA sur toutes vos commandes',
      type: 'promo',
      icon: 'car-outline'
    },
    {
      id: '3',
      message: '⚠️ Maintenance prévue ce soir de 22h à 23h - Le site sera temporairement indisponible',
      type: 'alert',
      icon: 'warning-outline'
    },
    {
      id: '4',
      message: '💎 Nouveaux produits ajoutés dans la catégorie "Colliers en argent"',
      type: 'info',
      icon: 'diamond-outline'
    }
  ];

  // Défilement automatique des notifications
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentNotificationIndex(prev => 
        (prev + 1) % notifications.length
      );
    }, 4000); // Change toutes les 4 secondes

    return () => clearInterval(interval);
  }, []);

  return (
    <TouchableOpacity 
      style={[
        styles.notificationBanner, 
        { 
          backgroundColor: theme.notificationBannerBg,
          borderColor: theme.notificationBannerBorder
        }
      ]}
      onPress={() => Alert.alert(
        'Notification', 
        notifications[currentNotificationIndex].message
      )}
    >
      <Ionicons 
        name={notifications[currentNotificationIndex].icon as any} 
        size={20} 
        color={theme.notificationIcon} 
        style={styles.notificationIcon}
      />
      <Text 
        style={[
          styles.notificationText, 
          { color: theme.notificationText }
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {notifications[currentNotificationIndex].message}
      </Text>
      <View style={styles.notificationPagination}>
        {notifications.map((_, index) => (
          <View
            key={index}
            style={[
              styles.notificationDot,
              {
                backgroundColor: index === currentNotificationIndex 
                  ? theme.notificationActiveDot 
                  : theme.notificationInactiveDot,
              }
            ]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingVertical: 50,
  },

  
  shareButton: {
    padding: 5,
  },

  popularProductContainer: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden', // Pour garder les bords arrondis
  },

  popularProductsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  popularProductWrapper: {
    width: '48%', // Pour 2 colonnes avec espace entre
    marginBottom: 15,
  },
  popularProductCard: {
    borderRadius: 12,
    padding: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  popularProductImageContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  popularProductImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  popularProductInfo: {
    marginBottom: 10,
  },
  popularProductName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  popularProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F58320',
  },
  popularProductActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  popularProductActionButton: {
    padding: 5,
  },
  popularProductQuantity: {
    fontSize: 16,
    fontWeight: '600',
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    padding: 10,
  },
  seeMoreText: {
    marginRight: 5,
    fontWeight: '500',
  },

  togglePricesButton: {
    marginLeft: 'auto',
    padding: 8,
  },

  // CAROUSEL automatique
  carouselContainer: {
    marginHorizontal: 20,
    marginBottom: 25,
    borderRadius: 15,
    overflow: 'hidden',
  },
  carouselItem: {
    width: width - 40,
    height: 180,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  carouselTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  carouselBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  carouselTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  carouselSubtitle: {
    fontSize: 16,
  },
  carouselImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  carouselPagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  carouselDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },

  // BANNIERE notification
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 30,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notificationIcon: {
    marginRight: 10,
  },
  notificationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  notificationPagination: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  notificationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  
  profileContainer: { 
    // borderRadius: 50,
    // backgroundColor: '#F58320',
    // width: 100,
    // height: 40, // Ajouté pour que le cercle soit bien défini
    // borderWidth: 2, // Ajouté pour augmenter la bordure
    // borderColor: "#FFFFFF", // Couleur de la bordure
    justifyContent: "center", // Centre verticalement
    alignItems: "center", // Centre horizontalement
  },
  profileText: {
    color: '#000000', // Texte blanc
    fontSize: 16, // Taille du texte ajustée
    fontWeight: "bold", // Texte en gras pour meilleure visibilité
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  banner: {
    borderRadius: 12,
    margin: 15,
    padding: 20,
    backgroundColor: '#f8f0e6', // Beige clair
    elevation: 3,
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: '#a0522d', // Marron
  },
  bannerImage: {
    width: 120,
    height: 120,
  },
  jewelryCard: {
    width: 160,
    marginRight: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jewelryImage: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  jewelryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  jewelryPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8b4513', // Marron cuir
  },
  jewelryContainer: {
    paddingLeft: 15,
    paddingBottom: 10,
  },
  
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 15,
    color: '#333',
  },
  newArrivalsContainer: {
    paddingLeft: 20,
  },
  productList: {
    paddingBottom: 16,
  },
  newArrivalCard: {
    width: 250,
    backgroundColor: '#FFF5EC',
    borderRadius: 15,
    marginRight: 15,
    overflow: 'hidden',
  },
  newArrivalImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  newArrivalTextContainer: {
    padding: 15,
  },
  newArrivalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F58320',
    marginBottom: 5,
  },
  newArrivalSubtitle: {
    fontSize: 14,
    color: '#666',
  },

// MENU

menuIcon: {
    marginRight: 10, // Ajouter un espacement entre l'icône et le texte
},switchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: 20,
},
label: {
  fontSize: 16,
},
menuDropdown: {
    position: 'absolute',
    top: 60, // Ajustez selon votre header
    left: 10,
    width: 300,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 1000
},
menuItem: {
    paddingVertical: 14,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: "row", // Alignement horizontal
    alignItems: "center", 
},
menuText: {
    fontSize: 16,
    color: "#000",
},
time: {
    fontSize: 16,
    fontWeight: "bold",
},
icons: {
    flexDirection: "row",
},
iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
},
icon: {
    height: 27,
    width: 27,
    // marginHorizontal: 10, // Espacement entre les icônes
},
  category: {
  alignItems: "center",
  justifyContent: "center",
  marginRight: 15,
  },
  categoryText: {
      fontSize: 14,
      textAlign: "center",
      width: 80,
      marginTop: 5, // Espacement avec l’image
    },
    moreproducts: {
      fontSize: 14,
      textAlign: "center", // Centrage du texte
      width: 100, // Assurez-vous que la largeur est suffisante
      marginTop: 5,
      paddingHorizontal: 10,
    },
  categoriesScroll: {
    paddingLeft: 20,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 15,
  },
  categoryImageContainer: {
    width: 70,
    height: 70,
    backgroundColor: '#FFF5EC',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  categoryName: {
    fontSize: 14,
    color: '#333',
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImageContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  productImage: {
    width: CARD_WIDTH - 40,
    height: CARD_WIDTH - 40,
    resizeMode: 'contain',
  },
  productInfo: {
    marginBottom: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 15,
    color: '#F58320',
    fontWeight: '600',
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
  promoBanner: {
    backgroundColor: '#F58320',
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  promoContent: {
    alignItems: 'center',
  },
  promoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  promoSubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
});

export default HomeScreen;


