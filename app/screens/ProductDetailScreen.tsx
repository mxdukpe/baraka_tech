import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  Modal,
  TextInput,
  Linking,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { Product, ProductImage } from '../../services/types';

type ProductDetailScreenProps = {
  navigation: any;
  route: any;
};

interface OrderItem {
  product: {
    id: string;
    name: string;
    price?: string;
    image?: string;  // Single image (if that's what your type expects)
    images?: ProductImage[];  // Array of images (if you need multiple)
    description?: string;
    category?: any; // You might want to type this properly
    prices?: any[]; // You might want to type this properly
  };
  quantity: number;
  unit_price: string;
}
type Order = {
  id: string;
  total_price: string;
  status: string;
  created_at: string;
  items: OrderItem[];
};

const BASE_URL = 'https://backend.barakasn.com/api/v0';
const { width: screenWidth } = Dimensions.get('window');

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ navigation, route }) => {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  
  // États pour le carrousel d'images
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // État pour la modal de partage unifié
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [shareWithPrice, setShareWithPrice] = useState(true);
  const [shareWithDescription, setShareWithDescription] = useState(true);
  const [shareWithImage, setShareWithImage] = useState(true);
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMethod, setShareMethod] = useState<'whatsapp' | 'general'>('general');

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

  // Fonction pour gérer le scroll du carrousel
  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageIndex = Math.floor(contentOffset.x / viewSize.width);
    setCurrentImageIndex(pageIndex);
  };

  // Fonction pour naviguer vers une image spécifique
  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true
    });
  };

  // Fonction pour télécharger l'image localement
  const downloadImageForSharing = async (imageUrl: string): Promise<string | null> => {
    try {
      const filename = `${product?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'product'}_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      
      const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return uri;
    } catch (error) {
      console.warn("Impossible de télécharger l'image pour le partage:", error);
      return null;
    }
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

  // Fonction pour partager via WhatsApp
  const shareViaWhatsApp = async () => {
    if (!product) return;

    setIsSharing(true);
    
    try {
      const message = generateUnifiedShareMessage();
      
      if (shareWithImage && product.images && product.images.length > 0) {
        const imageUrl = getImageUri(product.images[currentImageIndex]?.image);
        
        if (imageUrl) {
          const localImageUri = await downloadImageForSharing(imageUrl);
          
          if (localImageUri) {
            // Partager l'image d'abord
            await Sharing.shareAsync(localImageUri, {
              mimeType: 'image/jpeg',
              dialogTitle: 'Partager via WhatsApp',
            });
            
            // Attendre un peu puis partager le texte
            setTimeout(() => {
              const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
              Linking.openURL(whatsappUrl).catch(() => {
                // Si WhatsApp n'est pas installé, utiliser le partage général
                Share.share({ message });
              });
            }, 1000);
          } else {
            // Partager seulement le texte via WhatsApp
            const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
            Linking.openURL(whatsappUrl).catch(() => {
              Share.share({ message });
            });
          }
        }
      } else {
        // Partager seulement le texte via WhatsApp
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
        Linking.openURL(whatsappUrl).catch(() => {
          Share.share({ message });
        });
      }
      
      setShareModalVisible(false);
    } catch (error) {
      console.error('Erreur lors du partage WhatsApp:', error);
      Alert.alert('Erreur', 'Impossible de partager via WhatsApp. Veuillez réessayer.');
    } finally {
      setIsSharing(false);
    }
  };

  // Fonction pour partage général
  const shareGeneral = async () => {
    if (!product) return;

    setIsSharing(true);
    
    try {
      const message = generateUnifiedShareMessage();
      
      if (shareWithImage && product.images && product.images.length > 0) {
        const imageUrl = getImageUri(product.images[currentImageIndex]?.image);
        
        if (imageUrl) {
          const localImageUri = await downloadImageForSharing(imageUrl);
          
          if (localImageUri) {
            if (Platform.OS === 'ios') {
              // Sur iOS, partager texte et image ensemble
              await Share.share({
                message: message,
                url: localImageUri,
                title: product.name,
              });
            } else {
              // Sur Android, partager l'image d'abord
              await Sharing.shareAsync(localImageUri, {
                mimeType: 'image/jpeg',
                dialogTitle: 'Partager le produit',
              });
              
              // Puis partager le texte
              setTimeout(async () => {
                await Share.share({
                  message: message,
                  title: product.name,
                });
              }, 1000);
            }
          } else {
            await Share.share({
              message: message,
              title: product.name,
            });
          }
        }
      } else {
        await Share.share({
          message: message,
          title: product.name,
        });
      }
      
      setShareModalVisible(false);
    } catch (error) {
      console.error('Erreur lors du partage général:', error);
      Alert.alert('Erreur', 'Impossible de partager le produit. Veuillez réessayer.');
    } finally {
      setIsSharing(false);
    }
  };

  // Fonction pour partage rapide (avec toutes les informations)
  const handleQuickShare = async () => {
    if (!product) return;

    try {
      const message = `🛍️ *${product.name}*\n\n💰 *Prix:* ${formatPrice(product.prices[0]?.price || '0')} FCFA\n\n${product.description ? `📝 *Description:* ${product.description}\n\n` : ''}📱 *Contactez-nous pour plus d'informations !*`;
      
      if (product.images && product.images.length > 0) {
        const imageUrl = getImageUri(product.images[currentImageIndex]?.image);
        if (imageUrl) {
          const localImageUri = await downloadImageForSharing(imageUrl);
          
          if (localImageUri) {
            if (Platform.OS === 'ios') {
              await Share.share({
                message: message,
                url: localImageUri,
                title: product.name,
              });
            } else {
              await Sharing.shareAsync(localImageUri, {
                mimeType: 'image/jpeg',
                dialogTitle: 'Partager le produit',
              });
              
              setTimeout(async () => {
                await Share.share({
                  message: message,
                  title: product.name,
                });
              }, 500);
            }
          } else {
            await Share.share({
              message: message,
              title: product.name,
            });
          }
        }
      } else {
        await Share.share({
          message: message,
          title: product.name,
        });
      }
    } catch (error) {
      console.error('Erreur lors du partage rapide:', error);
      Alert.alert('Erreur', 'Impossible de partager le produit.');
    }
  };

  const openShareModal = () => {
    setShareModalVisible(true);
  };

  // Composant du carrousel d'images
  const renderImageCarousel = () => {
    if (!product?.images || product.images.length === 0) {
      return (
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/images/baraka_icon.png')}
            style={styles.productImage}
            resizeMode="contain"
          />
        </View>
      );
    }

    return (
      <View style={styles.imageContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.imageScrollView}
        >
          {product.images.map((image, index) => (
            <Image
              key={index}
              source={{ 
                uri: getImageUri(image?.image),
                headers: {
                  'Authorization': `Bearer ${token}`,
                }
              }}
              style={styles.productImage}
              defaultSource={require('../../assets/images/baraka_icon.png')}
              onError={(error) => {
                console.log('Erreur de chargement image:', error.nativeEvent.error);
              }}
              resizeMode="contain"
            />
          ))}
        </ScrollView>
        
        {/* Indicateurs de page */}
        {product.images.length > 1 && (
          <View style={styles.pagination}>
            {product.images.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.paginationDot,
                  { backgroundColor: currentImageIndex === index ? '#F58320' : '#ccc' }
                ]}
                onPress={() => goToImage(index)}
              />
            ))}
          </View>
        )}
        
        {/* Compteur d'images */}
        {product.images.length > 1 && (
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentImageIndex + 1} / {product.images.length}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderShareModal = () => {
    if (!product) return null;
    
    const originalPrice = product.prices && product.prices.length > 0 
      ? product.prices[0].price 
      : '0';
    
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
              {/* Méthode de partage */}
              <View style={styles.shareMethodSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Méthode de partage
                </Text>
                
                <View style={styles.shareMethodButtons}>
                  <TouchableOpacity 
                    style={[
                      styles.shareMethodButton,
                      shareMethod === 'whatsapp' && styles.shareMethodButtonActive
                    ]}
                    onPress={() => setShareMethod('whatsapp')}
                  >
                    <Ionicons 
                      name="logo-whatsapp" 
                      size={20} 
                      color={shareMethod === 'whatsapp' ? 'white' : '#25D366'} 
                    />
                    <Text style={[
                      styles.shareMethodButtonText,
                      shareMethod === 'whatsapp' && styles.shareMethodButtonTextActive
                    ]}>
                      WhatsApp
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.shareMethodButton,
                      shareMethod === 'general' && styles.shareMethodButtonActive
                    ]}
                    onPress={() => setShareMethod('general')}
                  >
                    <Ionicons 
                      name="share-social" 
                      size={20} 
                      color={shareMethod === 'general' ? 'white' : '#F58320'} 
                    />
                    <Text style={[
                      styles.shareMethodButtonText,
                      shareMethod === 'general' && styles.shareMethodButtonTextActive
                    ]}>
                      Général
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Options de partage */}
              <View style={styles.shareOptions}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Éléments à inclure
                </Text>
                
                <TouchableOpacity 
                  style={styles.optionRow}
                  onPress={() => setShareWithImage(!shareWithImage)}
                >
                  <Ionicons 
                    name={shareWithImage ? "checkbox" : "square-outline"} 
                    size={20} 
                    color="#F58320" 
                  />
                  <Text style={[styles.optionText, { color: theme.text }]}>
                    Inclure l'image
                  </Text>
                </TouchableOpacity>

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
                    Image à partager (image {currentImageIndex + 1})
                  </Text>
                  <Image 
                    source={{ uri: getImageUri(product.images[currentImageIndex]?.image) }}
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
              
              <TouchableOpacity 
                style={[
                  styles.shareModalButton,
                  { 
                    backgroundColor: shareMethod === 'whatsapp' ? '#25D366' : '#F58320',
                    opacity: isSharing ? 0.7 : 1 
                  }
                ]}
                onPress={shareMethod === 'whatsapp' ? shareViaWhatsApp : shareGeneral}
                disabled={isSharing}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons 
                    name={shareMethod === 'whatsapp' ? "logo-whatsapp" : "share"} 
                    size={20} 
                    color="white" 
                  />
                )}
                <Text style={styles.shareModalButtonText}>
                  {isSharing ? 'Partage...' : 
                   shareMethod === 'whatsapp' ? 'Partager via WhatsApp' : 'Partager'
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const addToCart = async (product_id: string) => {
  if (!token) {
    Alert.alert('Connexion requise', 'Veuillez vous connecter');
    navigation.navigate('Login');
    return;
  }
  
  if (!product) {
    Alert.alert('Erreur', 'Produit non chargé');
    return;
  }

  // Vérification supplémentaire pour les prix
  if (!product.prices || product.prices.length === 0) {
    Alert.alert('Erreur', 'Prix du produit non disponible');
    return;
  }

  setIsAddingToCart(true);
  
  try {
    // Récupération sécurisée du prix
    const productPrice = product.prices[0]?.price || '0';
    
    // Créer l'objet Order complet avec toutes les informations nécessaires
    const cartItem: Order = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID unique local
      total_price: (parseFloat(productPrice) * quantity).toString(),
      status: 'pending',
      created_at: new Date().toISOString(),
      items: [{
        product: {
          id: product.id.toString(),
          name: product.name,
          price: productPrice,
          images: product.images || [],
          description: product.description || '',
          category: product.category || null,
          prices: product.prices || []
        },
        quantity: quantity, // Ici on utilise la quantité sélectionnée
        unit_price: productPrice
      }]
    };

    // Sauvegarder dans le stockage local
    try {
      const existingCart = await AsyncStorage.getItem('local_cart');
      const cartItems = existingCart ? JSON.parse(existingCart) : [];
      
      // Vérifier si le produit existe déjà dans le panier local
      const existingItemIndex = cartItems.findIndex((item: Order) => 
        item.items.some(orderItem => orderItem.product.id === product.id.toString())
      );
      
      if (existingItemIndex !== -1) {
        // Mettre à jour la quantité si le produit existe déjà
        cartItems[existingItemIndex].items[0].quantity += quantity;
        cartItems[existingItemIndex].total_price = (
          parseFloat(cartItems[existingItemIndex].items[0].unit_price) * 
          cartItems[existingItemIndex].items[0].quantity
        ).toString();
      } else {
        // Ajouter le nouveau produit
        cartItems.push(cartItem);
      }
      
      await AsyncStorage.setItem('local_cart', JSON.stringify(cartItems));
    } catch (storageError) {
      console.warn('Erreur de stockage local:', storageError);
    }

    // Naviguer vers le panier avec l'objet Order complet
    navigation.navigate('CartTab', { 
      screen: 'CartScreen',
      params: { addedProduct: cartItem }
    });
    
    Alert.alert('Succès', 'Produit ajouté au panier');
    
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
          onPress={openShareModal}
        >
          <Ionicons name="share-social" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        {/* Carrousel d'images */}
        {renderImageCarousel()}
        
        <Text style={[styles.productName, { color: theme.text }]}>{product?.name}</Text>
        
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>Description</Text>
          {product?.description && (
            <Text style={[styles.descriptionText, { color: theme.text }]}>
              {product.description}
            </Text>
          )}
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.productPrice}>{formatPrice(product?.prices[0]?.price || '0')} FCFA</Text>
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
          onPress={() => product && addToCart(product.id.toString())}
          disabled={isAddingToCart}
        >
          <Text style={styles.addToCartButtonText}>
            {isAddingToCart ? 'Ajout en cours...' : `Ajouter ${quantity} au panier`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.exportButton}
          onPress={openShareModal}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="settings-outline" size={20} color="white" />
              <Text style={styles.exportButtonText}>Options de partage avancées</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {renderShareModal()}
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
    backgroundColor: '#F58320',
    padding: 10,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    paddingHorizontal: 20,
    alignItems: 'center',
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
    marginBottom: 15,
    bottom: 20,
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  exportButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#34A853',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    bottom: 20,
  },
  exportButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 16,
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

  // Styles pour la modal
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
  productPreview: {
    marginBottom: 20,
  },
  productPreviewCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productPreviewInfo: {
    flex: 1,
  },
  previewProductName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewPrice: {
    fontSize: 14,
    fontWeight: 'bold',
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
  },
  shareModalButton: {
    flex: 1,
    backgroundColor: '#F58320',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    minHeight: 50,
  },
  shareModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },


  shareMethodSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'left',
  },
  
  shareMethodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  
  shareMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  
  shareMethodButtonActive: {
    backgroundColor: '#F58320',
    borderColor: '#F58320',
  },
  
  shareMethodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  
  shareMethodButtonTextActive: {
    color: '#FFFFFF',
  },
  
  
  imagePreviewSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  
  sharePreviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
    // backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },


  imageContainer: {
    width: screenWidth - 40, // Largeur de l'écran moins les paddings
    height: 300,
    // backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  
  imageScrollView: {
    width: '100%',
    height: '100%',
  },
  
  productImage: {
    width: screenWidth - 40, // Même largeur que le container
    height: '100%',
    resizeMode: 'contain',
  },
  // Conteneur des indicateurs de pagination
  pagination: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Style des points de pagination
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: '#ccc',
  },

  // Conteneur du compteur d'images
  imageCounter: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  // Texte du compteur d'images
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

});

export default ProductDetailScreen;