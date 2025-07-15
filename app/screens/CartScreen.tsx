import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Image, RefreshControl, Alert } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProducts, getProductsPage } from '../../services/apiService';

import { Product, Order, OrderItem } from '../../services/types';

const CartScreen: React.FC<{ navigation: any, route: any }> = ({ navigation, route }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { addedProduct } = route.params || {};
  const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  const allCartItems = [...localCartItems, ...orders];

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

  // if (loading && !refreshing) {
  //   return (
  //     <View style={[styles.container, { backgroundColor: theme.background }]}>
  //       <View style={styles.header}>
  //         <TouchableOpacity onPress={() => navigation.goBack()}>
  //           <Ionicons name="arrow-back" size={24} color="white" />
  //         </TouchableOpacity>
  //         <Text style={styles.headerTitle}>Votre Panier</Text>
  //         <View style={{ width: 24 }} />
  //       </View>
  //       <ActivityIndicator size="large" color="#F58320" style={styles.loadingIndicator} />
  //     </View>
  //   );
  // }

  // if (error && allCartItems.length === 0) {
  //   return (
  //     <View style={[styles.container, { backgroundColor: theme.background }]}>
  //       <View style={styles.header}>
  //         <TouchableOpacity onPress={() => navigation.goBack()}>
  //           <Ionicons name="arrow-back" size={24} color="white" />
  //         </TouchableOpacity>
  //         <Text style={styles.headerTitle}>Votre Panier</Text>
  //         <View style={{ width: 24 }} />
  //       </View>
  //       <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
  //         <Ionicons name="warning" size={48} color="#F58320" />
  //         <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          
  //         <TouchableOpacity 
  //           style={[styles.primaryButton, { backgroundColor: '#F58320' }]}
  //           onPress={error.includes('Authentification') || error.includes('Session') 
  //             ? () => navigation.navigate('Login') 
  //             : fetchOrders}
  //         >
  //           <Text style={styles.text}>
  //             {error.includes('Authentification') || error.includes('Session') 
  //               ? 'Se connecter' 
  //               : 'Réessayer'}
  //           </Text>
  //         </TouchableOpacity>
  //       </View>
  //     </View>
  //   );
  // }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: '#F58320' }]}>
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

      {allCartItems.length === 0 ? (
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
      ) : (
        <FlatList
          data={allCartItems}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#F58320']}
              tintColor="#F58320"
            />
          }
          ListFooterComponent={<View style={{ height: 20 }} />}
        />
      )}

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

      {!selectMode && allCartItems.length > 0 && (
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
              : 'Payer toutes les commandes'}
          </Text>
          <Text style={styles.checkoutSubText}>
            Total: {allCartItems
              .filter(order => selectedOrders.length === 0 || selectedOrders.includes(order.id))
              .reduce((sum, order) => sum + parseFloat(order.total_price), 0)
              .toFixed(2)} FCFA
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    paddingBottom: 100,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
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
  checkoutButton: {
    backgroundColor: '#F58320',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
    marginBottom: 32,
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
});

export default CartScreen;