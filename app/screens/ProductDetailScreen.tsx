import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProductImage from '../../assets/images/bijoux.jpg';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

interface Product {
  id: number;
  name: string;
  description: string;
  image: string;
  prices: {
    id: number;
    price: string;
  }[];
}

type ProductDetailScreenProps = {
  navigation: any;
  route: any;
};

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ navigation, route }) => {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  const increaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };
  
  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };

//   const handleShareProduct = async () => {
//   try {
//     if (!product) return;

//     // Préparer le message avec les informations du produit
//     const message = `Découvrez ce produit : ${product.name}\nPrix : ${product.prices[0]?.price || '0.00'} FCFA\n${product.description || ''}`;
    
//     // Déterminer l'URL de l'image
//     let imageUri = product.image;
//     if (!imageUri) {
//       imageUri = Image.resolveAssetSource(ProductImage).uri;
//     }

//     // Télécharger l'image temporairement
//     const downloadResumable = FileSystem.createDownloadResumable(
//       imageUri,
//       FileSystem.cacheDirectory + 'product_share.jpg'
//     );

//     const downloadResult = await downloadResumable.downloadAsync();
//     if (!downloadResult) {
//       Alert.alert('Erreur', "Impossible de télécharger l'image pour le partage");
//       return;
//     }
//     const localUri = downloadResult.uri;

//     // Approche unifiée : déterminer la meilleure méthode selon la plateforme
//     if (Platform.OS === 'ios') {
//       // Sur iOS, utiliser Share qui permet de partager une URL avec un message
//       // La plupart des applications iOS comme Messages permettront 
//       // de voir à la fois l'image et le texte
//       await Share.share(
//         {
//           message: message,
//           url: localUri
//         }
//       );
//     } else {
//       // Sur Android, certaines applications peuvent gérer le partage combiné
//       try {
//         // D'abord essayer avec Share.share qui, sur certaines applications Android,
//         // permettra de partager à la fois l'image et le texte
//         await Share.share(
//           {
//             message: message,
//             title: product.name,
//             url: localUri // Certaines applications Android peuvent interpréter ceci
//           },
//           {
//             dialogTitle: `Partager ${product.name}`
//           }
//         );
//       } catch (shareError) {
//         // Si le partage avec Share échoue, on peut utiliser Sharing.shareAsync
//         // qui est plus fiable pour les images mais ne prend pas en charge le texte
//         if (await Sharing.isAvailableAsync()) {
//           // Créer un fichier texte temporaire pour le message
//           const textFilePath = `${FileSystem.cacheDirectory}product_info.txt`;
//           await FileSystem.writeAsStringAsync(textFilePath, message);
          
//           // Demander à l'utilisateur ce qu'il souhaite partager
//           Alert.alert(
//             "Que souhaitez-vous partager ?",
//             "Sélectionnez une option de partage",
//             [
//               {
//                 text: "Image uniquement",
//                 onPress: async () => {
//                   await Sharing.shareAsync(localUri, {
//                     mimeType: 'image/jpeg',
//                     dialogTitle: product.name,
//                     UTI: 'public.jpeg',
//                   });
//                 }
//               },
//               {
//                 text: "Texte uniquement",
//                 onPress: async () => {
//                   await Sharing.shareAsync(textFilePath, {
//                     mimeType: 'text/plain',
//                     dialogTitle: product.name,
//                     UTI: 'public.plain-text',
//                   });
//                 }
//               },
//               {
//                 text: "Annuler",
//                 style: "cancel"
//               }
//             ]
//           );
//         }
//       }
//     }
//   } catch (error) {
//     console.error('Erreur de partage:', error);
//     Alert.alert('Erreur', "Une erreur s'est produite lors du partage");
//   }
// };
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
  useEffect(() => {
    if (!token) return;

    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`https://backend.barakasn.com/api/v0/products/products/${productId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Erreur de chargement du produit');
        }

        const data = await response.json();
        setProduct(data);
        setError(null);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Une erreur inconnue est survenue');
        }
        if (err instanceof Error && err.message.includes('401')) {
          Alert.alert('Session expirée', 'Veuillez vous reconnecter');
          navigation.navigate('Login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId, token]);

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

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F58320" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => setError(null)}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={styles.errorText}>Produit non trouvé</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#F58320" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => handleShareProduct(product)}
        >
          <Ionicons name="share-social" size={24} color="#F58320" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        {/* {product.image && (
          <Image source={{ uri: product.image }} style={styles.productImage} />
        )} */}
        {product.image ? (
          <Image 
            source={{ uri: product.image }} 
            style={styles.productImage}
            defaultSource={ProductImage} // Image de repli pour Android
            // onError={() => setImageError(true)}
          />
        ) : (
          <Image 
            source={ProductImage} 
            style={styles.productImage}
          />
        )}
        
        <Text style={[styles.productName, { color: theme.text }]}>{product.name}</Text>
        
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>Description</Text>
          {product.description && (
            <Text style={[styles.descriptionText, { color: theme.text }]}>
              {product.description}
            </Text>
          )}
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.productPrice}>{product.prices[0]?.price || '0.00'} FCFA</Text>
        </View>
        
        {/* Quantity Selector */}
        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={styles.quantityButton} 
            onPress={decreaseQuantity}
            disabled={quantity <= 1}
          >
            <Ionicons name="remove" size={20} color="#F58320" />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{quantity}</Text>
          
          <TouchableOpacity 
            style={styles.quantityButton} 
            onPress={increaseQuantity}
          >
            <Ionicons name="add" size={20} color="#F58320" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={() => addToCart(product.id.toString())}
          disabled={isAddingToCart}
        >
          <Text style={styles.addToCartButtonText}>
            {isAddingToCart ? 'Ajout en cours...' : `Ajouter ${quantity} au panier`}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={() => handleShareProduct(product)}>
          <Text style={styles.addToCartButtonText}>
            Partager le produit
          </Text>
          <Ionicons style={styles.shareButton2} name="share-social" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingVertical: 50,
  },
  headerContainer: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareButton: {
    padding: 5,
  },
  shareButton2: {
    // padding: 10,
  },
  content: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  productImage: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  descriptionContainer: {
    width: '100%',
    marginBottom: 30,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  priceContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 15,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F58320',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  quantityButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  quantityText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  addToCartButton: {
    width: '100%',
    backgroundColor: '#F58320',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  retryButton: {
    backgroundColor: '#F58320',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ProductDetailScreen;