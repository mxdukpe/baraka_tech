import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OrderValidationScreen = ({ route, navigation }) => {
// Add safe default value
  const { selectedItems = [] } = route.params || {};
  
  // Calculate total safely
  const total = selectedItems.reduce((sum, item) => {
    const price = parseFloat(item.total_price) || 0;
    return sum + price;
  }, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Validation</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={selectedItems}
        renderItem={({ item }) => {
          // Use the first item's product details if items array exists
          const firstProduct = item.items?.[0]?.product || {};
          const quantity = item.items?.[0]?.quantity || 1;
          const price = parseFloat(item.total_price) || 0;

          return (
            <View style={styles.itemContainer}>
              <Image 
                source={{ uri: firstProduct.image || 'https://via.placeholder.com/50' }} 
                style={styles.itemImage} 
              />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{firstProduct.name || 'Produit sans nom'}</Text>
                <Text style={styles.itemPrice}>{price} FCFA x {quantity}</Text>
              </View>
              <Text style={styles.itemTotal}>{price * quantity} FCFA</Text>
            </View>
          );
        }}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total à payer:</Text>
          <Text style={styles.totalAmount}>{total} FCFA</Text>
        </View>
        <TouchableOpacity 
          style={styles.paymentButton}
          onPress={() => navigation.navigate('PaymentScreen', { selectedItems, total })}
        >
          <Text style={styles.paymentButtonText}>Procéder au paiement</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F58320',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F58320',
  },
  paymentButton: {
    backgroundColor: '#F58320',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  paymentButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default OrderValidationScreen;