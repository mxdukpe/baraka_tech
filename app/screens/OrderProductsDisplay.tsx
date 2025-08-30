import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, 
  Platform, AppState,FlatList,TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';

// Composant pour afficher un produit individuel
const ProductItem = ({ orderItem, theme }) => {
  const [imageLoading, setImageLoading] = useState(true);
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
  
  // Fonction pour construire l'URL complète de l'image
  const getImageUri = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/')) return `https://backend.barakasn.com${imagePath}`;
    return `https://backend.barakasn.com/media/${imagePath}`;
  };

  // Formatage du prix
  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      currencyDisplay: 'narrowSymbol'
    }).format(num).replace('CFA', 'FCFA');
  };

  const product = orderItem.product;
  const firstImage = product.images?.[0]?.image;
  const imageUri = firstImage ? getImageUri(firstImage) : null;
  const totalPrice = parseFloat(orderItem.unit_price) * orderItem.quantity;

  return (
    <View style={[styles.productItem, { borderBottomColor: theme.borderColor }]}>
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
      {/* Image du produit */}
      <View style={styles.productImageContainer}>
        {imageUri ? (
          <>
            {imageLoading && (
              <View style={styles.imageLoadingContainer}>
                <ActivityIndicator size="small" color="#F58320" />
              </View>
            )}
            <Image
              source={{ uri: imageUri }}
              style={[styles.productImage, imageLoading && { opacity: 0 }]}
              resizeMode="cover"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                console.warn(`Erreur de chargement d'image: ${imageUri}`);
              }}
            />
          </>
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={24} color="#ccc" />
          </View>
        )}
      </View>

      {/* Détails du produit */}
      <View style={styles.productDetails}>
        <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
          {product.name || 'Produit sans nom'}
        </Text>
        
        <View style={styles.priceRow}>
          <Text style={[styles.unitPrice, { color: theme.text }]}>
            {formatPrice(orderItem.unit_price)}
          </Text>
          <Text style={[styles.quantity, { color: theme.text }]}>
            × {orderItem.quantity}
          </Text>
        </View>
        
        <Text style={[styles.totalPrice, { color: theme.accent }]}>
          Total: {formatPrice(totalPrice)}
        </Text>
      </View>
    </View>
  );
};

// Composant pour afficher tous les produits d'une commande
const OrderProductsList = ({ order, theme, showAllProducts = false }) => {
  const [expanded, setExpanded] = useState(showAllProducts);
  const [productDetails, setProductDetails] = useState({});
  const [loading, setLoading] = useState(false);

  // Fonction pour récupérer les détails complets d'un produit
  const fetchProductDetails = async (productId, token) => {
    if (productDetails[productId]) return productDetails[productId];

    try {
      const response = await fetch(
        `https://backend.barakasn.com/api/v0/products/products/${productId}/`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Accept': 'application/json'
          }
        }
      );

      if (response.ok) {
        const product = await response.json();
        setProductDetails(prev => ({ ...prev, [productId]: product }));
        return product;
      }
    } catch (error) {
      console.error(`Erreur lors de la récupération du produit ${productId}:`, error);
    }
    return null;
  };

  // Enrichir les données des produits avec les détails complets
  const getEnrichedOrderItems = () => {
    return order.items.map(item => {
      const completeProduct = productDetails[item.product.id] || item.product;
      return {
        ...item,
        product: {
          ...item.product,
          images: completeProduct.images || item.product.images || [],
          description: completeProduct.description || '',
          category: completeProduct.category || null,
        }
      };
    });
  };

  const enrichedItems = getEnrichedOrderItems();
  const displayItems = expanded ? enrichedItems : enrichedItems.slice(0, 3);
  const hasMoreItems = enrichedItems.length > 3;

  return (
    <View style={styles.productsContainer}>
      <View style={styles.productsHeader}>
        <Text style={[styles.productsTitle, { color: theme.text }]}>
          Produits ({order.items.length})
        </Text>
        {loading && <ActivityIndicator size="small" color="#F58320" />}
      </View>

      {displayItems.map((item, index) => (
        <ProductItem
          key={`${order.id}-${item.product.id}-${index}`}
          orderItem={item}
          theme={theme}
        />
      ))}

      {hasMoreItems && !expanded && (
        <TouchableOpacity
          style={styles.showMoreButton}
          onPress={() => setExpanded(true)}
        >
          <Text style={styles.showMoreText}>
            Voir {enrichedItems.length - 3} produit{enrichedItems.length - 3 > 1 ? 's' : ''} de plus
          </Text>
          <Ionicons name="chevron-down" size={16} color="#F58320" />
        </TouchableOpacity>
      )}

      {expanded && hasMoreItems && (
        <TouchableOpacity
          style={styles.showMoreButton}
          onPress={() => setExpanded(false)}
        >
          <Text style={styles.showMoreText}>Voir moins</Text>
          <Ionicons name="chevron-up" size={16} color="#F58320" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Composant principal pour afficher une commande complète
const OrderWithProducts = ({ order, theme, token }) => {
  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      currencyDisplay: 'narrowSymbol'
    }).format(num).replace('CFA', 'FCFA');
  };

  const getStatusDetails = (status) => {
    const statusConfig = {
      pending: { text: 'En attente', color: '#FFC107', bgColor: '#FFF8E1', icon: 'hourglass-empty' },
      paid: { text: 'Payé', color: '#2196F3', bgColor: '#E3F2FD', icon: 'payment' },
      shipped: { text: 'Expédié', color: '#FF9800', bgColor: '#FFF3E0', icon: 'local-shipping' },
      delivered: { text: 'Livré', color: '#4CAF50', bgColor: '#E8F5E9', icon: 'check-circle' },
      cancelled: { text: 'Annulé', color: '#F44336', bgColor: '#FFEBEE', icon: 'cancel' }
    };
    return statusConfig[status] || statusConfig.pending;
  };

  const statusDetails = getStatusDetails(order.status);

  return (
    <View style={[styles.orderCard, { backgroundColor: theme.background, borderColor: theme.borderColor }]}>
      {/* En-tête de la commande */}
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Ionicons name="receipt" size={20} color="#F58320" />
          <Text style={[styles.orderId, { color: theme.text }]}>
            Commande #{order.id}
          </Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: statusDetails.bgColor }]}>
          <Text style={[styles.statusText, { color: statusDetails.color }]}>
            {statusDetails.text}
          </Text>
        </View>
      </View>

      {/* Informations de la commande */}
      <View style={styles.orderInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={16} color="#F58320" />
          <Text style={[styles.infoText, { color: theme.text }]}>
            {new Date(order.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="card" size={16} color="#F58320" />
          <Text style={[styles.totalAmount, { color: theme.text }]}>
            {formatPrice(order.total_price)}
          </Text>
        </View>
      </View>

      {/* Liste des produits */}
      <OrderProductsList 
        order={order} 
        theme={theme}
        showAllProducts={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  productsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  productImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    zIndex: 1,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  unitPrice: {
    fontSize: 14,
    fontWeight: '500',
  },
  quantity: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.7,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  showMoreText: {
    color: '#F58320',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
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

export { OrderWithProducts, OrderProductsList, ProductItem };