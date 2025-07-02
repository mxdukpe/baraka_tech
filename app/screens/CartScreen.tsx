import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

type OrderItem = {
  product: {
    name: string;
    image?: string;
  };
  quantity: number;
  unit_price: string;
};

type Order = {
  id: string;
  total_price: string;
  status: string;
  created_at: string;
  items: OrderItem[];
};

const CartScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]); // Stocke les IDs des commandes sélectionnées
  const [selectMode, setSelectMode] = useState(false); // Mode sélection activé/désactivé

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        throw new Error('Authentification requise');
      }

      const response = await fetch('https://backend.barakasn.com/api/v0/orders/orders/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        throw new Error('Session expirée - Veuillez vous reconnecter');
      }
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setOrders(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur inconnue est survenue');
      
      if (err instanceof Error && (err.message.includes('Authentification') || err.message.includes('Session'))) {
        navigation.navigate('Login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token]);

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  const selectAllOrders = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  const deleteSelectedOrders = async (idsToDelete?: string[]) => {
  try {
    if (!token) return;
    
    const ids = idsToDelete || selectedOrders; // Utilise le paramètre ou l'état
    
    const response = await fetch('https://backend.barakasn.com/api/v0/orders/orders/', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order_ids: ids })
    });

    if (response.ok) {
      fetchOrders(); // Recharger les commandes
      setSelectedOrders([]);
      setSelectMode(false);
    }
  } catch (error) {
    setError('Erreur lors de la suppression');
  }
};



  const renderOrderItem = ({ item }: { item: Order }) => (
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
      {/* Checkbox de sélection */}
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
        <View style={styles.orderIdContainer}>
          <Ionicons name="receipt" size={20} color="#F58320" />
          <Text style={[styles.orderId, { color: theme.text }]}> Commande #{item.id}</Text>
        </View>
        
        {/* Bouton de suppression en mode sélection */}
        {selectMode ? (
          <TouchableOpacity 
            onPress={() => deleteSelectedOrders([item.id])}
            style={styles.deleteButton}
          >
            <Ionicons name="trash" size={20} color="#ff4444" />
          </TouchableOpacity>
        ) : (
          <View style={[
            styles.statusBadge,
            item.status === 'completed' ? styles.completedStatus : styles.pendingStatus
          ]}>
            <MaterialIcons 
              name={item.status === 'completed' ? 'check-circle' : 'pending'} 
              size={16} 
              color={item.status === 'completed' ? '#155724' : '#856404'} 
            />
            <Text style={styles.statusText}>
              {item.status === 'completed' ? 'Terminée' : 'En cours'}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.orderInfo}>
        <Ionicons name="calendar" size={16} color="#F58320" />
        <Text style={[styles.orderDate, { color: theme.text }]}>
          {new Date(item.created_at).toLocaleDateString('fr-FR')}
        </Text>
      </View>
      
      <View style={styles.orderInfo}>
        <FontAwesome name="money" size={16} color="#F58320" />
        <Text style={[styles.orderTotal, { color: theme.text }]}>
          {parseFloat(item.total_price).toFixed(2)} FCFA
        </Text>
      </View>
      
      <View style={styles.itemsContainer}>
        {item.items.map((orderItem, index) => (
          <View key={index} style={styles.itemRow}>
            <View style={styles.productInfo}>
              {orderItem.product.image ? (
                <Image 
                  source={{ uri: orderItem.product.image }} 
                  style={styles.productImage} 
                />
              ) : (
                <Ionicons name="fast-food" size={24} color="#F58320" />
              )}
              <Text style={[styles.itemName, { color: theme.text }]}>
                {orderItem.product.name}
              </Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={[styles.itemQuantity, { color: theme.text }]}>
                {orderItem.quantity} × {parseFloat(orderItem.unit_price).toFixed(2)} FCFA
              </Text>
            </View>
          </View>
        ))}
      </View>
      
      {!selectMode && (
        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
        >
          <Text style={styles.detailsButtonText}>Voir détails</Text>
          <Ionicons name="chevron-forward" size={16} color="#F58320" />
        </TouchableOpacity>
      )}
    </View>
  </TouchableOpacity>
);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F58320" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="warning" size={48} color="#F58320" />
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
        
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={error.includes('Authentification') || error.includes('Session') 
            ? () => navigation.navigate('Login') 
            : fetchOrders}
        >
          <Text style={styles.buttonText}>
            {error.includes('Authentification') || error.includes('Session') 
              ? 'Se connecter' 
              : 'Réessayer'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        
        {orders.length > 0 && (
          <TouchableOpacity onPress={() => setSelectMode(!selectMode)}>
            <Ionicons 
              name={selectMode ? 'checkmark-done' : 'checkbox-outline'} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        )}
      </View>

      {orders.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
          <Ionicons name="cart-outline" size={64} color="#F58320" />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Panier vide</Text>
          <Text style={[styles.emptyText, { color: theme.text }]}>
            Vous n'avez pas encore de commandes
          </Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.buttonText}>Explorer nos produits</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}

      {selectMode && (
        <View style={styles.actionBar}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={selectAllOrders}
          >
            <Text style={styles.actionText}>
              {selectedOrders.length === orders.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#ff4444' }]}
            // onPress={deleteSelectedOrders}
            disabled={selectedOrders.length === 0}
          >
            <Text style={styles.actionText}>
              Supprimer ({selectedOrders.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!selectMode && orders.length > 0 && (
        <TouchableOpacity 
          style={styles.checkoutButton}
          onPress={() => navigation.navigate('OrderValidationScreen', { 
            selectedItems: selectedOrders.length > 0 
              ? orders.filter(order => selectedOrders.includes(order.id))
              : orders 
          })}
        >
          <Text style={styles.checkoutButtonText}>
            {selectedOrders.length > 0 
              ? `Payer ${selectedOrders.length} commande(s)` 
              : 'Payer toutes les commandes'}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={styles.checkoutButton}
        onPress={() => navigation.navigate('OrderValidationScreen', {
          selectedItems: selectedOrders.length > 0 
            ? orders.filter(order => selectedOrders.includes(order.id))
            : orders
        })}
      >
        <Text style={styles.checkoutButtonText}>Valider la commande</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 50,
  },
  checkoutButton: {
    backgroundColor: '#F58320',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
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

  // checkboxContainer: {
  //   position: 'absolute',
  //   left: 10,
  //   top: 10,
  //   zIndex: 1,
  // },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F58320',
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
  },

  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 16,
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
  completedStatus: {
    backgroundColor: '#E8F5E9',
  },
  pendingStatus: {
    backgroundColor: '#FFF8E1',
  },
  itemsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    flexShrink: 1,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 14,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailsButtonText: {
    color: '#F58320',
    fontWeight: 'bold',
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  primaryButton: {
    backgroundColor: '#F58320',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    flexDirection: 'row',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CartScreen;