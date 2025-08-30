import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, ScrollView,
  Alert, Share, Modal, 
  Platform, AppState,
  Dimensions, TouchableWithoutFeedback, Switch,
 } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';

import { getProducts } from '../../services/apiService';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Icon, Badge } from 'react-native-elements';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import { Product } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from './useCart';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';

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
    productColumns: isLargeScreen ? 4 : isTablet ? 3 : 2,
    categoryColumns: isLargeScreen ? 6 : isTablet ? 5 : 4,
    horizontalPadding: isTablet ? 30 : 20,
    verticalPadding: isTablet ? 25 : 15,
    cardWidth: isLargeScreen ? (width - 80) / 4 : isTablet ? (width - 70) / 3 : (width - 50) / 2,
    headerHeight: isTablet ? 80 : 60,
    bannerHeight: isTablet ? 200 : 180,
    productImageHeight: isTablet ? 150 : 120,
    categoryImageSize: isTablet ? 80 : 60,
    titleFontSize: isTablet ? 22 : 18,
    subtitleFontSize: isTablet ? 18 : 16,
    bodyFontSize: isTablet ? 16 : 14,
    captionFontSize: isTablet ? 14 : 12,
    sectionSpacing: isTablet ? 35 : 25,
    itemSpacing: isTablet ? 20 : 15,
  };
};

type ProductImage ={
  id: number;
  image: string;
  order: number;
};

type OrderItem = {
  product: {
    id: number;
    name: string;
    images: ProductImage[];
    price?: string;
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

// Clé pour le stockage local des statuts mis à jour
const UPDATED_ORDERS_KEY = 'updated_orders';

const OrderStatusScreen: React.FC<{ navigation: any, route: any }> = ({ navigation, route }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'processing' | 'completed'>('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const responsive = getResponsiveDimensions();
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const viewRef = useRef(null);

  const { addedProduct } = route.params || {};
  const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const allCartItems = [...localCartItems, ...orders];
  const [token, setToken] = useState<string | null>(null);
  
  const { loadCart } = useCart();
  const { cartItems, totalCartItems, saveCart } = useCart();
  // État pour le flou de sécurité
  const [isAppInBackground, setIsAppInBackground] = useState(false);

  // Charger les statuts mis à jour depuis AsyncStorage
  const loadUpdatedOrdersStatus = async () => {
    try {
      const storedStatus = await AsyncStorage.getItem(UPDATED_ORDERS_KEY);
      return storedStatus ? JSON.parse(storedStatus) : {};
    } catch (error) {
      console.error('Erreur lors du chargement des statuts mis à jour:', error);
      return {};
    }
  };

  // Sauvegarder les statuts mis à jour dans AsyncStorage
  const saveUpdatedOrdersStatus = async (updatedStatus: Record<string, string>) => {
    try {
      await AsyncStorage.setItem(UPDATED_ORDERS_KEY, JSON.stringify(updatedStatus));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des statuts mis à jour:', error);
    }
  };

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

  // Fonction pour supprimer une commande en attente
  const deleteOrder = async (orderId: string) => {
    try {
      if (!token) {
        throw new Error('Authentification requise');
      }

      Alert.alert(
        'Confirmer la suppression',
        'Êtes-vous sûr de vouloir supprimer cette commande en attente ?',
        [
          {
            text: 'Annuler',
            style: 'cancel'
          },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await fetch(`https://backend.barakasn.com/api/v0/orders/orders/${orderId}/`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                  }
                });

                if (response.status === 204) {
                  // Successfully deleted
                  setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
                  setModalVisible(false);
                  
                  // Mettre à jour le stockage local pour supprimer le statut de cette commande
                  const updatedStatus = await loadUpdatedOrdersStatus();
                  delete updatedStatus[orderId];
                  await saveUpdatedOrdersStatus(updatedStatus);
                  
                  Alert.alert('Succès', 'La commande a été supprimée avec succès');
                } else if (response.status === 404) {
                  throw new Error('Commande non trouvée');
                } else {
                  throw new Error(`Erreur lors de la suppression: ${response.status}`);
                }
              } catch (err) {
                Alert.alert(
                  'Erreur',
                  err instanceof Error ? err.message : 'Une erreur est survenue lors de la suppression'
                );
              }
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert(
        'Erreur',
        err instanceof Error ? err.message : 'Une erreur est survenue'
      );
    }
  };

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
      
      // Charger les statuts mis à jour depuis le stockage local
      const updatedStatus = await loadUpdatedOrdersStatus();
      
      // Appliquer les statuts mis à jour aux commandes
      const ordersWithUpdatedStatus = (data.results || []).map((order: Order) => {
        if (updatedStatus[order.id]) {
          return { ...order, status: updatedStatus[order.id] as 'pending' | 'processing' | 'completed' | 'cancelled' };
        }
        return order;
      });
      
      setOrders(ordersWithUpdatedStatus);
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
          text: 'Confirmées',
          icon: 'check-circle',
          color: '#2196F3',
          bgColor: '#E3F2FD'
        };
      case 'completed':
        return {
          text: 'Livrées',
          icon: 'local-shipping',
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

  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      currencyDisplay: 'narrowSymbol'
    }).format(num).replace('CFA', 'FCFA');
  };

  const generatePDF = async () => {
    try {
      setIsLoading(true);
      
      if (selectedOrders.length === 0) {
        Alert.alert('Aucune commande', 'Veuillez sélectionner au moins une commande à exporter');
        return;
      }

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

      const { uri } = await Print.printToFileAsync({ 
        html,
        width: 842,
        height: 595,
        base64: false
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Exporter les commandes',
          UTI: 'com.adobe.pdf'
        });
      } else {
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

  const getFullImageUrl = (imagePath?: string) => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('/media/')) {
      return `https://backend.barakasn.com${imagePath}`;
    }
    
    return `https://backend.barakasn.com/media/${imagePath}`;
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'processing' | 'completed' | 'cancelled') => {
    // Mettre à jour le state local
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus } 
          : order
      )
    );
    
    // Sauvegarder le nouveau statut dans AsyncStorage
    const updatedStatus = await loadUpdatedOrdersStatus();
    updatedStatus[orderId] = newStatus;
    await saveUpdatedOrdersStatus(updatedStatus);
  };

  const handleNavigation = (screenName: string) => {
    closeMenu();
    navigation.navigate(screenName);
  };

  const closeMenu = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
  };

  const proceedToPayment = (orderId: string) => {
    navigation.navigate('PaiementValidation', { 
      orderId,
      onPaymentSuccess: async () => {
        // Après paiement réussi, mettre à jour le statut de la commande
        await updateOrderStatus(orderId, 'processing');
        
        // Optionnel: envoyer la mise à jour au serveur
        try {
          if (token) {
            await fetch(`https://backend.barakasn.com/api/v0/orders/orders/${orderId}/`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ status: 'processing' })
            });
          }
        } catch (error) {
          console.error('Erreur lors de la mise à jour du statut sur le serveur:', error);
        }
      }
    });
  };

  const getImageUri = (imagePath?: string) => {
    if (!imagePath) return undefined;

    if (imagePath.startsWith('http')) return imagePath;

    if (imagePath.startsWith('/')) return `https://backend.barakasn.com${imagePath}`;

    return `https://backend.barakasn.com/media/${imagePath}`;
  };

  const renderShareButton = () => {
    if (selectedOrders.length === 0) return null;
    
    return (
      <TouchableOpacity
        style={styles.shareButton}
        onPress={generatePDF}
      >
        <Ionicons name="share-social" size={24} color="white" />
        <Text style={styles.shareButtonText}>
          Partager ({selectedOrders.length})
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTabButton = (
    tab: 'all' | 'pending' | 'processing' | 'completed',
    icon: React.ComponentProps<typeof Ionicons>['name'],
    label: string
  ) => {
    const labels = {
      'all': 'Toutes',
      'pending': 'En attente',
      'processing': 'Confirmées',
      'completed': 'Livrées'
    };
    
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
          {labels[tab]}
        </Text>
      </TouchableOpacity>
    );
  };

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
        onLongPress={() => {
          setSelectedOrder(item);
          setModalVisible(true);
        }}
      >
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark-circle" size={24} color="#F58320" />
          </View>
        )}
        
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Ionicons name="receipt" size={20} color="#F58320" />
            <Text style={[styles.orderId, { color: theme.text }]}>
              Commande N.{item.id}
            </Text>
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
            <Text style={[
              styles.statusText, 
              { color: statusDetails.color }
            ]}>
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
            {formatPrice(item.total_price)}
          </Text>
        </View>

        <View style={styles.itemsContainer}>
          <Text style={[styles.itemsTitle, { color: theme.text }]}>
            Produits {item.items?.length || 0}:
          </Text>
          
          {item.items && item.items.length > 0 ? (
            <>
              {item.items.slice(0, 2).map((orderItem, index) => {
                const firstImagePath = orderItem.product?.images?.[0]?.image;
                const imageUri = firstImagePath ? getImageUri(firstImagePath) : null;
                
                return (
                  <View key={index} style={styles.productPreviewRow}>
                    <View style={styles.productImageContainer}>
                      {imageUri ? (
                        <Image 
                          source={{ uri: imageUri }} 
                          style={styles.productPreviewImage} 
                          resizeMode="cover"
                          onError={() => console.log('Erreur de chargement image:', imageUri)}
                        />
                      ) : (
                        <View style={styles.productImagePlaceholder}>
                          <Ionicons name="image-outline" size={20} color="#CCC" />
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.productPreviewInfo}>
                      <Text 
                        style={[styles.productPreviewName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {orderItem.product?.name || 'Produit inconnu'}
                      </Text>
                      <Text style={[styles.productPreviewDetails, { color: theme.text }]}>
                        {formatPrice(orderItem.unit_price)} × {orderItem.quantity}
                      </Text>
                    </View>
                    
                    <Text style={[styles.productPreviewTotal, { color: theme.text }]}>
                      {formatPrice((parseFloat(orderItem.unit_price) * orderItem.quantity).toString())}
                    </Text>
                  </View>
                );
              })}
              
              {item.items.length > 2 && (
                <Text style={[styles.moreItemsText, { color: theme.text }]}>
                  et {item.items.length - 2} autre{item.items.length - 2 > 1 ? 's' : ''} produit{item.items.length - 2 > 1 ? 's' : ''}
                </Text>
              )}
            </>
          ) : (
            <Text style={[styles.noItems, { color: theme.text }]}>
              Aucun produit trouvé
            </Text>
          )}
        </View>

        {item.status === 'pending' && (
          <TouchableOpacity 
            style={styles.paymentButton}
            onPress={() => proceedToPayment(item.id)}
          >
            <Ionicons name="card-outline" size={20} color="white" />
            <Text style={styles.paymentButtonText}>Procéder au paiement</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderOrderDetailsModal = () => {
    if (!selectedOrder) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Commande N.{selectedOrder.id}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.orderInfoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={16} color="#F58320" />
                <Text style={[styles.infoText, { color: theme.text }]}>
                  {new Date(selectedOrder.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <FontAwesome name="money" size={16} color="#F58320" />
                <Text style={[styles.infoText, { color: theme.text }]}>
                  Total: {formatPrice(selectedOrder.total_price)}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name={getStatusDetails(selectedOrder.status).icon} size={16} color="#F58320" />
                <Text style={[styles.infoText, { color: theme.text }]}>
                  Statut: {getStatusDetails(selectedOrder.status).text}
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Articles ({selectedOrder.items?.length || 0})
            </Text>
            
            {selectedOrder.items && selectedOrder.items.length > 0 ? (
              selectedOrder.items.map((item, index) => {
                const firstImagePath = item.product?.images?.[0]?.image;
                const firstImageUri = firstImagePath ? getImageUri(firstImagePath) : null;

                return (
                  <View key={index} style={styles.productItem}>
                    <View style={styles.productImageContainer}>
                      {firstImageUri ? (
                        <Image 
                          source={{ uri: firstImageUri }} 
                          style={styles.productImage} 
                          resizeMode="cover"
                          onError={() => console.log('Erreur image:', firstImageUri)}
                        />
                      ) : (
                        <View style={[styles.productImage, styles.productImagePlaceholder]}>
                          <Ionicons name="image-outline" size={24} color="#CCC" />
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.productDetails}>
                      <Text style={[styles.productName, { color: theme.text }]}>
                        {item.product?.name || 'Produit inconnu'}
                      </Text>
                      <Text style={[styles.productPrice, { color: theme.text }]}>
                        {formatPrice(item.unit_price)} × {item.quantity}
                      </Text>
                    </View>
                    
                    <View style={styles.productPricing}>
                      <Text style={[styles.productTotal, { color: theme.text }]}>
                        {formatPrice((parseFloat(item.unit_price) * item.quantity).toString())}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyProductsContainer}>
                <Ionicons name="cube-outline" size={48} color="#CCC" />
                <Text style={[styles.emptyProductsText, { color: theme.text }]}>
                  Aucun produit trouvé dans cette commande
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              {selectedOrder.status === 'pending' && (
                <>
                  <TouchableOpacity 
                    style={styles.paymentButton}
                    onPress={() => {
                      setModalVisible(false);
                      proceedToPayment(selectedOrder.id);
                    }}
                  >
                    <Ionicons name="card-outline" size={20} color="white" />
                    <Text style={styles.paymentButtonText}>Procéder au paiement</Text>
                  </TouchableOpacity>
                  
                  {/* Bouton de suppression pour les commandes en attente */}
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => deleteOrder(selectedOrder.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="white" />
                    <Text style={styles.deleteButtonText}>Supprimer la commande</Text>
                  </TouchableOpacity>
                </>
              )}
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F58320" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header fixe même en cas d'erreur */}
        <View style={[styles.fixedHeader, { backgroundColor: theme.background }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#F58320" />
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Suivi des Commandes
            </Text>
            
            <View style={styles.headerRight} />
          </View>
        </View>

        <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
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
      </View>
    );
  }

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
      {/* HEADER FIXE - TOUJOURS VISIBLE */}
      <View style={[styles.fixedHeader, { backgroundColor: theme.background }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#F58320" />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Suivi des Commandes
          </Text>
          
          <View style={styles.headerRight} />
        </View>
      </View>

      {/* CONTENU SCROLLABLE */}
      <ScrollView 
        style={styles.scrollableContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Bouton de partage */}
        {renderShareButton()}

        {/* Onglets de filtrage */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {renderTabButton('all', 'list', 'Toutes')}
          {renderTabButton('pending', 'time', 'En attente')}
          {renderTabButton('processing', 'checkmark-circle', 'Confirmées')}
          {renderTabButton('completed', 'checkmark-done', 'Livrées')}
        </ScrollView>

        {/* Contenu principal */}
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
          <View style={styles.ordersListContainer}>
            <Text style={[styles.ordersCount, { color: theme.text }]}>
              {filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''} {selectedTab !== 'all' ? getStatusDetails(selectedTab).text.toLowerCase() : ''}
            </Text>
            
            {filteredOrders.map((item) => (
              <View key={item.id}>
                {renderOrderItem({ item })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de détails des commandes */}
      {renderOrderDetailsModal()}
    </View>
  );
};

// Les styles restent inchangés...
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // STYLES POUR HEADER FIXE
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 44,
  },
  
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 131, 32, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 131, 32, 0.2)',
  },
  
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 20,
  },
  
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },

  // STYLES POUR CONTENU SCROLLABLE
  scrollableContent: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 109 : 89, // Espace pour le header fixe
  },
  
  scrollContentContainer: {
    paddingBottom: 100, // Espace pour le bouton flottant
  },

  // STYLES POUR LOADING
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // STYLES POUR ERREUR
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: Platform.OS === 'ios' ? 109 : 89,
  },

  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // STYLES POUR LISTE DES COMMANDES
  ordersListContainer: {
    padding: 16,
  },

  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  
  selectedBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
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
  },
  
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  orderDate: {
    fontSize: 13,
    marginLeft: 8,
  },
  
  orderTotal: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  itemsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  
  itemsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  
  productPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  productImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  
  productPreviewImage: {
    width: '100%',
    height: '100%',
  },
  
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  productPreviewInfo: {
    flex: 1,
  },
  
  productPreviewName: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  productPreviewDetails: {
    fontSize: 12,
    color: '#888',
  },
  
  productPreviewTotal: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  moreItemsText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  
  noItems: {
    fontSize: 12,
    color: '#888',
  },
  
  paymentButton: {
    flexDirection: 'row',
    backgroundColor: '#F58320',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  
  paymentButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },

  // STYLES POUR ONGLETS
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

  // STYLES POUR BOUTON DE PARTAGE
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

  // STYLES POUR ÉTAT VIDE
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
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

  ordersCount: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.7,
  },

  // STYLES POUR MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '85%',
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  
  modalContent: {
    flex: 1,
  },
  
  orderInfoSection: {
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
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  
  productItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  
  productDetails: {
    flex: 1,
    marginLeft: 12,
  },
  
  productName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  
  productPrice: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  
  productPricing: {
    justifyContent: 'center',
  },
  
  productTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  emptyProductsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  
  emptyProductsText: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
  },
  
  modalActions: {
    marginTop: 16,
  },
  
  closeButton: {
    borderWidth: 1,
    borderColor: '#F58320',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  
  closeButtonText: {
    color: '#F58320',
    fontWeight: '600',
  },
  
  // STYLES POUR BOUTON DE SUPPRESSION
  deleteButton: {
    flexDirection: 'row',
    backgroundColor: '#F44336',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },

  // STYLES POUR MENU DROPDOWN
  menuDropdown: {
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 3,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
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

export default OrderStatusScreen;