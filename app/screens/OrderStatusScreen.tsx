import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, ScrollView,
  Alert, Share
 } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getProducts } from '../../services/apiService';
import { Product } from '../../services/types';
import { captureRef } from 'react-native-view-shot';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
// import ViewShot from 'react-native-view-shot';

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
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  created_at: string;
  items: OrderItem[];
};

const OrderStatusScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'processing' | 'completed'>('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  // const viewShotRef = useRef<ViewShot>(null);
    const [isLoading, setIsLoading] = useState(true);
    

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  
    const viewRef = useRef(null);


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

  const filteredOrders = orders.filter(order => {
    if (selectedTab === 'all') return true;
    return order.status === selectedTab;
  });

  const getStatusDetails = (status: string): {
    text: string;
    icon: React.ComponentProps<typeof MaterialIcons>['name'];
    color: string;
    bgColor: string;
  } => {
    switch (status) {
      case 'pending':
        return {
          text: 'En attente',
          icon: 'hourglass-empty',
          color: '#FFC107',
          bgColor: '#FFF8E1'
        };
      case 'processing':
        return {
          text: 'En cours',
          icon: 'sync',
          color: '#2196F3',
          bgColor: '#E3F2FD'
        };
      case 'completed':
        return {
          text: 'Terminée',
          icon: 'check-circle',
          color: '#4CAF50',
          bgColor: '#E8F5E9'
        };
      case 'cancelled':
        return {
          text: 'Annulée',
          icon: 'cancel',
          color: '#F44336',
          bgColor: '#FFEBEE'
        };
      default:
        return {
          text: 'Inconnu',
          icon: 'help-outline',
          color: '#9E9E9E',
          bgColor: '#FAFAFA'
        };
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  
  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };

  const generatePDF = async () => {
  try {
    setIsLoading(true);
    
    // Vérifier s'il y a des commandes sélectionnées
    if (selectedOrders.length === 0) {
      Alert.alert('Aucune commande', 'Veuillez sélectionner au moins une commande à exporter');
      return;
    }

    // Récupérer les commandes sélectionnées
    const selectedOrdersData = orders.filter(order => 
      selectedOrders.includes(order.id)
    );

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial; margin: 20px; }
            h1 { color: #F58320; text-align: center; margin-bottom: 20px; }
            h2 { color: #333; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #F58320; color: white; padding: 12px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .order-header { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 15px; }
            .order-info { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
            .total { font-weight: bold; text-align: right; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h1>Récapitulatif des Commandes</h1>
          <div>Date d'export: ${new Date().toLocaleDateString('fr-FR')}</div>
          <div>Nombre de commandes: ${selectedOrders.length}</div>
          
          ${selectedOrdersData.map(order => {
            const statusDetails = getStatusDetails(order.status);
            return `
              <div style="margin-top: 40px;">
                <div class="order-header">
                  <h2>Commande #${order.id}</h2>
                  <div class="order-info">
                    <div>
                      <strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div>
                      <strong>Statut:</strong> ${statusDetails.text}
                    </div>
                  </div>
                </div>
                
                <table>
                  <tr>
                    <th>Produit</th>
                    <th>Quantité</th>
                    <th>Prix unitaire</th>
                    <th>Total</th>
                  </tr>
                  ${order.items.map(item => `
                    <tr>
                      <td>${item.product.name}</td>
                      <td>${item.quantity}</td>
                      <td>${formatPrice(item.unit_price)} FCFA</td>
                      <td>${formatPrice((parseFloat(item.unit_price) * item.quantity).toString())} FCFA</td>
                    </tr>
                  `).join('')}
                </table>
                
                <div class="total">
                  Total commande: ${formatPrice(order.total_price)} FCFA
                </div>
              </div>
            `;
          }).join('')}
          
          <div class="footer">
            Généré par MyApp - ${new Date().getFullYear()}
          </div>
        </body>
      </html>
    `;

    // Options d'impression
    const { uri } = await Print.printToFileAsync({ 
      html,
      width: 842,  // A4 width in pixels (72dpi)
      height: 595, // A4 height
      base64: false
    });

    // Option 1: Proposer le partage
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Exporter les commandes',
        UTI: 'com.adobe.pdf'
      });
    } 
    // Option 2: Sauvegarder localement si le partage n'est pas disponible
    else {
      const pdfName = `Commandes_${new Date().toISOString().slice(0,10)}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${pdfName}`;
      
      await FileSystem.copyAsync({ from: uri, to: newUri });
      Alert.alert(
        'PDF sauvegardé', 
        `Le fichier a été enregistré dans vos documents.`,
        [{ text: 'OK', onPress: () => console.log('OK Pressed') }]
      );
    }
    
  } catch (error) {
    console.error('Erreur PDF:', error);
    Alert.alert(
      'Erreur', 
      'Une erreur est survenue lors de la génération du PDF',
      [{ text: 'OK', onPress: () => console.log('OK Pressed') }]
    );
  } finally {
    setIsLoading(false);
  }
};
  

  // const shareOrdersAsImage = async () => {
  //   if (selectedOrders.length === 0) {
  //     Alert.alert('Aucune commande sélectionnée', 'Veuillez sélectionner au moins une commande à partager.');
  //     return;
  //   }

  //   try {
  //     if (!viewShotRef.current?.capture) {
  //       throw new Error('La fonction de capture est indisponible');
  //     }

  //     const uri = await viewShotRef.current.capture();
      
  //     await Share.share({
  //       title: 'Mes commandes',
  //       message: 'Voici mes commandes sélectionnées',
  //       url: uri,
  //     });
  //   } catch (error) {
  //     console.error('Erreur lors du partage:', error);
  //     Alert.alert('Erreur', 'Impossible de partager les commandes');
  //   }
  // };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const statusDetails = getStatusDetails(item.status);
    const isSelected = selectedOrders.includes(item.id);
        
    return (
      <TouchableOpacity 
        style={[
          styles.orderCard, 
          { 
            backgroundColor: theme.background,
            borderColor: isSelected ? '#F58320' : '#F0F0F0',
            borderWidth: isSelected ? 2 : 1,
          }
        ]}
        onPress={() => toggleOrderSelection(item.id)}
        onLongPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
      >
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark-circle" size={24} color="#F58320" />
          </View>
        )}
        
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Ionicons name="receipt" size={20} color="#F58320" />
            <Text style={[styles.orderId, { color: theme.text }]}> Commande #{item.id}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: statusDetails.bgColor }
          ]}>
            <MaterialIcons 
              name={statusDetails.icon} 
              size={16} 
              color={statusDetails.color} 
            />
            <Text style={[styles.statusText, { color: statusDetails.color }]}>
              {statusDetails.text}
            </Text>
          </View>
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
        
        <View style={styles.itemsPreview}>
          {item.items.slice(0, 2).map((orderItem, index) => (
            <View key={index} style={styles.itemPreviewRow}>
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
              <Text style={[styles.itemQuantity, { color: theme.text }]}>
                x{orderItem.quantity}
              </Text>
            </View>
          ))}
          {item.items.length > 2 && (
            <Text style={[styles.moreItemsText, { color: theme.text }]}>
              +{item.items.length - 2} autres articles...
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
        >
          <Text style={styles.detailsButtonText}>Voir les détails</Text>
          <Ionicons name="chevron-forward" size={16} color="#F58320" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderShareButton = () => {
    if (selectedOrders.length === 0) return null;
    
    return (
      <TouchableOpacity
        style={styles.shareButton}
        // onPress={shareOrdersAsImage}
      >
        <Ionicons name="share-social" size={24} color="white" />
        <TouchableOpacity onPress={generatePDF}  style={styles.shareButtonText}>
          {/* <Ionicons name="download-outline" size={24} color="#F58320" /> */}
          <Text style={styles.shareButtonText}>
            Partager ({selectedOrders.length})
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderTabButton = (
    tab: 'all' | 'pending' | 'processing' | 'completed',
    icon: React.ComponentProps<typeof Ionicons>['name'],
    label: string
  ) => {
    const isActive = selectedTab === tab;
    return (
      <TouchableOpacity
        style={[
          styles.tabButton,
          isActive && styles.activeTabButton,
          isActive && { backgroundColor: '#F58320' }
        ]}
        onPress={() => setSelectedTab(tab)}
      >
        <Ionicons 
          name={icon} 
          size={20} 
          color={isActive ? 'white' : '#F58320'} 
        />
        <Text style={[
          styles.tabButtonText,
          isActive && styles.activeTabButtonText,
          isActive && { color: 'white' }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suivi des Commandes</Text>
        <View style={{ width: 24 }} />
      </View>

        {/* <TouchableOpacity onPress={generatePDF}>
          <Ionicons name="download-outline" size={24} color="#F58320" />
        </TouchableOpacity> */}
      {renderShareButton()}

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {renderTabButton('all', 'list', 'Toutes')}
        {renderTabButton('pending', 'time', 'En attente')}
        {renderTabButton('processing', 'sync', 'En cours')}
        {renderTabButton('completed', 'checkmark-done', 'Terminées')}
      </ScrollView>

      {filteredOrders.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
          <Ionicons name="receipt-outline" size={64} color="#F58320" />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {selectedTab === 'all' ? 'Aucune commande' : `Aucune commande ${getStatusDetails(selectedTab).text.toLowerCase()}`}
          </Text>
          <Text style={[styles.emptyText, { color: theme.text }]}>
            {selectedTab === 'all' 
              ? 'Vous n\'avez pas encore passé de commande' 
              : `Vous n'avez pas de commandes ${getStatusDetails(selectedTab).text.toLowerCase()}`}
          </Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('CategoriesTab')}
          >
            <Text style={styles.buttonText}>Explorer nos produits</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Text style={[styles.ordersCount, { color: theme.text }]}>
              {filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''} {selectedTab !== 'all' ? getStatusDetails(selectedTab).text.toLowerCase() : ''}
            </Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 50,
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
  tabsContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#F58320',
  },
  activeTabButton: {
    borderWidth: 0,
  },
  tabButtonText: {
    marginLeft: 8,
    color: '#F58320',
    fontWeight: '500',
  },
  activeTabButtonText: {
    fontWeight: 'bold',
  },

  
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  shareButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#F58320',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },

  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  ordersCount: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.7,
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
  itemsPreview: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  itemPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  itemQuantity: {
    fontSize: 14,
    opacity: 0.8,
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
    opacity: 0.7,
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

export default OrderStatusScreen;