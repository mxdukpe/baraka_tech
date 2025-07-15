import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, Alert } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';

const OrderValidationScreen = ({ navigation, route }) => {
  const { selectedItems = [] } = route.params || {};
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  // Calculer le total
  const total = selectedItems.reduce((sum, order) => sum + parseFloat(order.total_price), 0);

  const getImageUri = (imagePath) => {
    if (!imagePath) return undefined;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/')) return `https://backend.barakasn.com${imagePath}`;
    return `https://backend.barakasn.com/media/${imagePath}`;
  };

  const renderOrderItem = ({ item }) => {
    const orderTitle = item.items.length > 0 ? item.items[0].product.name : `Commande #${item.id}`;
    const productCount = item.items.length > 1 ? ` + ${item.items.length - 1} autre(s)` : '';
    const isLocalOrder = item?.id?.toString()?.startsWith('local_');
    
    return (
      <View style={[styles.orderCard, { backgroundColor: theme.background }]}>
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
          
          {item.items.length > 2 && (
            <Text style={[styles.moreItemsText, { color: theme.text }]}>
              ... et {item.items.length - 2} autre(s) produit(s)
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: '#F58320' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Validation de commande</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.contentContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Votre sélection</Text>
        
        {selectedItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={64} color="#F58320" />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Aucun article sélectionné</Text>
            <Text style={[styles.emptyText, { color: theme.text }]}>
              Retournez au panier pour sélectionner des articles
            </Text>
          </View>
        ) : (
          <FlatList
            data={selectedItems}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {selectedItems.length > 0 && (
        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryText, { color: theme.text }]}>
                Total articles: {selectedItems.length}
              </Text>
              <Text style={[styles.summaryText, { color: theme.text }]}>
                Total produits: {selectedItems.reduce((sum, order) => sum + order.items.length, 0)}
              </Text>
            </View>
            <View style={styles.totalContainer}>
              <Text style={[styles.totalText, { color: theme.text }]}>Total à payer:</Text>
              <Text style={[styles.totalAmount, { color: '#F58320' }]}>{total.toFixed(2)} FCFA</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.paymentButton}
            onPress={() => navigation.navigate('PaymentScreen', { selectedItems, total })}
          >
            <Text style={styles.paymentButtonText}>Procéder au paiement</Text>
            <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
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
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#F58320',
  },
  listContent: {
    paddingBottom: 20,
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
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemName: {
    flexShrink: 1,
    marginLeft: 10,
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
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentButton: {
    backgroundColor: '#F58320',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  paymentButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  completedStatus: {
    backgroundColor: '#E8F5E9',
  },
  pendingStatus: {
    backgroundColor: '#FFF8E1',
  },
});

export default OrderValidationScreen;