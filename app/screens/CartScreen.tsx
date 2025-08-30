import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator,
  Platform, AppState,
  Dimensions, Image, RefreshControl, Alert, ScrollView, TouchableWithoutFeedback, Switch  } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProducts, getProductsPage } from '../../services/apiService';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';

import { Icon, Badge } from 'react-native-elements';
import { Product, Order, OrderItem } from '../../services/types';


// Fonction pour obtenir les dimensions responsives
const getResponsiveDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isLargeScreen = width >= 1024;
  
  return {
    width,
    height,
    isTablet,
    isLargeScreen,
    isSmallScreen: width < 375,
    // Colonnes adaptatives - ajustez en fonction de la largeurproductColumns: 2,
    categoryColumns: width > 600 ? (width > 900 ? 6 : 5) : 4,
    // Padding adaptatif
    horizontalPadding: isTablet ? 30 : 20,
    verticalPadding: isTablet ? 25 : 15,
    // Tailles d'éléments
    cardWidth: isLargeScreen ? (width - 80) / 4 : isTablet ? (width - 70) / 3 : (width - 50) / 2,
    headerHeight: isTablet ? 80 : 60,
    bannerHeight: isTablet ? 200 : 180,
    productImageHeight: isTablet ? 150 : 120,
    categoryImageSize: isTablet ? 80 : 60,
    // Tailles de police
    titleFontSize: isTablet ? 22 : 18,
    subtitleFontSize: isTablet ? 18 : 16,
    bodyFontSize: isTablet ? 16 : 14,
    captionFontSize: isTablet ? 14 : 12,
    // Espacements
    sectionSpacing: isTablet ? 35 : 25,
    itemSpacing: isTablet ? 20 : 15,
  };
};
const CartScreen: React.FC<{ navigation: any, route: any }> = ({ navigation, route }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { addedProduct } = route.params || {};
  const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  const allCartItems = [...localCartItems, ...orders];

  const responsive = getResponsiveDimensions();
  const [menuVisible, setMenuVisible] = useState(false);
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
  

  // Calculer le nombre total de produits dans le panier
  const getTotalCartItemsCount = () => {
    return allCartItems.reduce((total, order) => {
      return total + order.items.reduce((orderTotal, item) => orderTotal + item.quantity, 0);
    }, 0);
  };

  // Nombre total d'articles dans le panier
  const cartItemsCount = getTotalCartItemsCount();

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  // Charger le panier local depuis AsyncStorage
  const loadLocalCart = async () => {
    try {
      const localCart = await AsyncStorage.getItem('local_cart');
      if (localCart) {
        const cartItems = JSON.parse(localCart);
        setLocalCartItems(cartItems);
      }
    } catch (error) {
      console.warn('Erreur lors du chargement du panier local:', error);
    }
  };

  useEffect(() => {
    // Charger le panier local au démarrage
    loadLocalCart();
    
    // Gestion du produit ajouté depuis d'autres écrans
    if (addedProduct) {
      // Vérifier si c'est un produit local (ID commence par "local_")
      if (addedProduct.id.startsWith('local_')) {
        // Mettre à jour directement le state local
        setLocalCartItems(prev => {
          const existingIndex = prev.findIndex(item => 
            item.items.some(orderItem => 
              orderItem.product.id === addedProduct.items[0].product.id
            )
          );
          
          if (existingIndex !== -1) {
            // Mettre à jour la quantité
            const updatedItems = [...prev];
            updatedItems[existingIndex].items[0].quantity += addedProduct.items[0].quantity;
            updatedItems[existingIndex].total_price = (
              parseFloat(updatedItems[existingIndex].items[0].unit_price) * 
              updatedItems[existingIndex].items[0].quantity
            ).toString();
            return updatedItems;
          } else {
            // Ajouter le nouveau produit
            return [...prev, addedProduct];
          }
        });
      } else {
        // Produit provenant de l'API
        setOrders(prev => [...prev, addedProduct]);
      }
    }
    
  }, [token, addedProduct]);

  const onRefresh = () => {
    setRefreshing(true);
    // fetchOrders();
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  const selectAllOrders = () => {
    if (selectedOrders.length === allCartItems.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(allCartItems.map(order => order.id));
    }
  };

  const confirmDeleteOrders = (idsToDelete?: string[]) => {
    const ids = idsToDelete || selectedOrders;
    const count = ids.length;
    
    Alert.alert(
      "Confirmer la suppression",
      `Êtes-vous sûr de vouloir supprimer ${count} commande${count > 1 ? 's' : ''} ?`,
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => deleteSelectedOrders(ids)
        }
      ]
    );
  };

  const deleteSelectedOrders = async (idsToDelete?: string[]) => {
    try {
      setDeleting(true);
      const ids = idsToDelete || selectedOrders;
      
      // Séparer les IDs locaux et serveur
      const localIds = ids.filter(id => id.startsWith('local_'));
      const serverIds = ids.filter(id => !id.startsWith('local_'));
      
      // Supprimer les commandes locales
      if (localIds.length > 0) {
        const updatedLocalItems = localCartItems.filter(order => !localIds.includes(order.id));
        setLocalCartItems(updatedLocalItems);
        
        // Sauvegarder dans AsyncStorage
        await AsyncStorage.setItem('local_cart', JSON.stringify(updatedLocalItems));
      }
      
      // Supprimer les commandes serveur
      if (serverIds.length > 0) {
        setOrders(prev => prev.filter(order => !serverIds.includes(order.id)));
        
        // Optionnel : appeler l'API pour supprimer sur le serveur
        // for (const id of serverIds) {
        //   await deleteOrderFromServer(id);
        // }
      }
      
      setSelectedOrders([]);
      setSelectMode(false);
      
    } catch (error) {
      setError('Erreur lors de la suppression des commandes');
      console.error('Erreur suppression:', error);
    } finally {
      setDeleting(false);
    }
  };

  const getImageUri = (imagePath?: string) => {
    if (!imagePath) return undefined;

    // Chemin déjà complet (http / https)
    if (imagePath.startsWith('http')) return imagePath;

    // Chemin commençant par /media/… → on préfixe simplement le domaine
    if (imagePath.startsWith('/')) return `https://backend.barakasn.com${imagePath}`;

    // Chemin sans slash : on ajouter /media/
    return `https://backend.barakasn.com/media/${imagePath}`;
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const orderTitle = item.items.length > 0 ? item.items[0].product.name : `Commande #${item.id}`;
    const productCount = item.items.length > 1 ? ` + ${item.items.length - 1} autre(s)` : '';
    const isLocalOrder = item?.id?.toString()?.startsWith('local_');
    
    return (
      <TouchableOpacity
        onPress={() => selectMode ? toggleOrderSelection(item.id) : null}
        onLongPress={() => {
          setSelectMode(true);
          toggleOrderSelection(item.id);
        }}
        activeOpacity={0.8}
      >
        <View style={[
          styles.orderCard, 
          { 
            backgroundColor: theme.background,
            borderColor: selectedOrders.includes(item.id) ? '#F58320' : theme.background,
            borderWidth: selectedOrders.includes(item.id) ? 2 : 1,
            opacity: selectMode && !selectedOrders.includes(item.id) ? 0.6 : 1
          }
        ]}>
          {selectMode && (
            <View style={styles.checkboxContainer}>
              <Ionicons 
                name={selectedOrders.includes(item.id) ? 'checkbox' : 'square-outline'} 
                size={24} 
                color="#F58320" 
              />
            </View>
          )}

          <View style={styles.orderHeader}>
            <View style={styles.orderTitleContainer}>
              <Ionicons name="receipt" size={20} color="#F58320" />
              <Text style={[styles.orderTitle, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
                {orderTitle}{productCount}
              </Text>
              {isLocalOrder && (
                <View style={styles.localBadge}>
                  <Text style={styles.localBadgeText}>LOCAL</Text>
                </View>
              )}
            </View>
            
            {selectMode ? (
              <TouchableOpacity 
                onPress={() => confirmDeleteOrders([item.id])}
                style={styles.deleteButton}
              >
                <Ionicons name="trash" size={20} color="#ff4444" />
              </TouchableOpacity>
            ) : (
              <View style={[
                styles.statusBadge,
                item.status === 'completed' ? styles.completedStatus : styles.pendingStatus,
                { backgroundColor: item.status === 'completed' ? theme.background : theme.background }
              ]}>
                <MaterialIcons 
                  name={item.status === 'completed' ? 'check-circle' : 'pending'} 
                  size={16} 
                  color={item.status === 'completed' ? theme.text : theme.text} 
                />
                <Text style={[styles.statusText, { color: item.status === 'completed' ? theme.text : theme.text }]}>
                  {item.status === 'completed' ? 'Terminée' : 'En attente'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.orderInfo}>
            <Ionicons name="calendar" size={16} color="#F58320" />
            <Text style={[styles.orderDate, { color: theme.text }]}>
              {new Date(item.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          
          <View style={styles.orderInfo}>
            <FontAwesome name="money" size={16} color="#F58320" />
            <Text style={[styles.orderTotal, { color: theme.text }]}>
              {parseFloat(item.total_price).toFixed(2)} FCFA
            </Text>
          </View>
          
          <View style={styles.itemsContainer}>
            {item.items.slice(0, 2).map((orderItem, index) => {
              const firstImagePath = orderItem.product.images?.[0]?.image;
              const firstImageUri = firstImagePath ? getImageUri(firstImagePath) : undefined;

              return (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.productInfo}>
                    {firstImageUri ? (
                      <Image 
                        source={{ uri: firstImageUri.startsWith('http') ? firstImageUri : `https://backend.barakasn.com${firstImageUri}` }} 
                        style={styles.productImage} 
                        resizeMode="cover"
                      />
                    ) : (
                      <Image
                        source={require('../../assets/images/baraka_icon.png')}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    )}
                    <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                      {orderItem.product.name}
                    </Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={[styles.itemQuantity, { color: theme.text }]}>
                      {orderItem.quantity} x {parseFloat(orderItem.unit_price).toFixed(2)} FCFA
                    </Text>
                    <Text style={[styles.itemTotal, { color: theme.text }]}>
                      {(orderItem.quantity * parseFloat(orderItem.unit_price)).toFixed(2)} FCFA
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
      <View style={[styles.emptyIllustration, { backgroundColor: theme.background }]}>
        <Ionicons name="cart-outline" size={64} color="#F58320" />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>Panier vide</Text>
      <Text style={[styles.emptyText, { color: theme.text }]}>
        Vous n'avez pas encore de commandes dans votre panier
      </Text>
      <TouchableOpacity 
        style={[styles.primaryButton, { backgroundColor: '#F58320' }]}
        onPress={() => navigation.navigate('CatalogueScreen')}
      >
        <Text style={styles.text}>Explorer nos produits</Text>
      </TouchableOpacity>
    </View>
  );

  // Fonction pour gérer la navigation avec fermeture du menu
  const handleNavigation = (screenName: string) => {
    closeMenu();
    navigation.navigate(screenName);
  };

  const closeMenu = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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

      {/* Header fixe */}
      <View style={[styles.headerText, { backgroundColor: '#F58320' }]}>
        {selectMode ? (
          <TouchableOpacity onPress={() => {
            setSelectMode(false);
            setSelectedOrders([]);
          }}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        )}
        
        <Text style={styles.headerTitle}>
          {selectMode ? `${selectedOrders.length} sélectionné(s)` : 'Votre Panier'}
        </Text>
        
        {allCartItems.length > 0 ? (
          <TouchableOpacity onPress={() => setSelectMode(!selectMode)}>
            <Ionicons 
              name={selectMode ? 'checkmark-done' : 'checkbox-outline'} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {/* Contenu scrollable */}
      {allCartItems.length === 0 ? (
        <ScrollView 
          contentContainerStyle={styles.scrollContentEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#F58320']}
              tintColor="#F58320"
            />
          }
        >
          {renderEmptyState()}
        </ScrollView>
      ) : (
        <FlatList
          data={allCartItems}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: selectMode ? 80 : 120 } // Espace pour les boutons
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#F58320']}
              tintColor="#F58320"
            />
          }
          showsVerticalScrollIndicator={true}
          bounces={true}
        />
      )}

      {/* Barre d'actions en mode sélection */}
      {selectMode && (
        <View style={[styles.actionBar, { backgroundColor: theme.background }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.background }]}
            onPress={selectAllOrders}
          >
            <Text style={[styles.actionText, { color: theme.text }]}>
              {selectedOrders.length === allCartItems.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { 
              backgroundColor: selectedOrders.length > 0 ? '#ff4444' : theme.background,
              opacity: selectedOrders.length > 0 ? 1 : 0.7
            }]}
            onPress={() => deleteSelectedOrders()}
            disabled={selectedOrders.length === 0}
          >
            <Text style={[styles.actionText, { color: 'white' }]}>
              Supprimer ({selectedOrders.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bouton de validation */}
      {!selectMode && allCartItems.length > 0 && (
        <View style={[styles.checkoutContainer, { backgroundColor: theme.background }]}>
          <TouchableOpacity 
            style={[styles.checkoutButton, { backgroundColor: '#F58320' }]}
            onPress={() => navigation.navigate('OrderValidationScreen', { 
              selectedItems: selectedOrders.length > 0 
                ? allCartItems.filter(order => selectedOrders.includes(order.id))
                : allCartItems 
            })}
          >
            <Text style={styles.checkoutButtonText}>
              {selectedOrders.length > 0 
                ? `Payer ${selectedOrders.length} commande(s)` 
                : 'Procéder au paiement'}
            </Text>
            <Text style={styles.checkoutSubText}>
              ({allCartItems
                .filter(order => selectedOrders.length === 0 || selectedOrders.includes(order.id))
                .reduce((sum, order) => sum + parseFloat(order.total_price), 0)
                .toFixed(2)})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 15,
    // borderBottomLeftRadius: 20,
    // borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  profileContainer: { 
    justifyContent: "center",
    alignItems: "center",
  },
  profileText: {
    fontWeight: "bold",
  },
  
  // Nouveau container pour les icônes avec espacement adaptatif
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  icon1Container: {
    position: 'relative',
  },

  headerText: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
    padding: 16,
    paddingTop: 40,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemName: {
    flexShrink: 1,
    marginLeft: 10,
  },
  itemPrice: {
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flexShrink: 1,
  },
  localBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  localBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderDate: {
    fontSize: 14,
    marginLeft: 8,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  itemsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  itemQuantity: {
    fontSize: 12,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  moreItemsText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailsButtonText: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 24,
    maxWidth: '80%',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 24,
    maxWidth: '80%',
  },
  primaryButton: {
    backgroundColor: '#F58320',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    flexDirection: 'row',
    elevation: 2,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkboxContainer: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  checkoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  checkoutButton: {
    backgroundColor: '#F58320',
    padding: 16,
    marginBottom: 50,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  checkoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkoutSubText: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  completedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  pendingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF8E1',
  },
  
  // Menu avec image de fond
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },

  menuDropdown: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: Dimensions.get('window').height,
    width: 550,
    zIndex: 1000,
  },

  menuHeader: {
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },

  menuHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },

  menuHeaderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 3,
  },

  menuScrollContainer: {
    paddingBottom: 30,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    // borderBottomWidth: 1,
    // borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    // width: 50,
  },

  menuIcon: {
    marginRight: 15,
    width: 24,
  },

  menuItemText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
    fontWeight: '500',
  },

  menuSwitch: {
    position: 'relative',
    right: 300,
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }]
  },

  messageBadge: {
    position: 'relative',
    right: 300,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  messageBadgeText: {
    color: '#000000',
    fontSize: 10,
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

export default CartScreen;