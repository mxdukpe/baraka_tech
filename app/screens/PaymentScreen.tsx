import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Image, Linking, Alert, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PaymentScreen = ({ route, navigation }) => {
  // const { total } = route.params;
  const [paymentMethod, setPaymentMethod] = useState(null);
  const { selectedItems = [], total = 0 } = route.params || {};
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('mobile_money');
  const [isProcessing, setIsProcessing] = useState(false);

  
  const clearCart = async () => {
    try {
      // Supprimer les items locaux du panier
      const localIds = selectedItems
        .filter(item => item.id.startsWith('local_'))
        .map(item => item.id);
      
      if (localIds.length > 0) {
        const localCart = await AsyncStorage.getItem('local_cart');
        if (localCart) {
          const cartItems = JSON.parse(localCart);
          const updatedCart = cartItems.filter(item => !localIds.includes(item.id));
          await AsyncStorage.setItem('local_cart', JSON.stringify(updatedCart));
        }
      }
    } catch (error) {
      console.warn('Error clearing cart:', error);
    }
  };

  const confirmOrder = async () => {
  setIsSubmitting(true);
  
  try {
    const token = await AsyncStorage.getItem('access_token');
    
    if (!token) {
      Alert.alert('Erreur', 'Vous devez être connecté pour passer commande');
      navigation.navigate('Login');
      return;
    }

    // Nouveau format avec price en entier (en centimes)
    const orderData = {
      products: selectedItems.flatMap(order => 
        order.items.map(item => ({
          product_id: parseInt(item.product.id, 10),
          quantity: parseInt(item.quantity, 10),
          price: Math.round(parseFloat(item.unit_price) * 100) // Convertir en centimes
        }))
      ),
      payment_method: paymentMethod || 'cash',
      total: Math.round(parseFloat(total) * 100), // Convertir en centimes
      status: 'pending'
    };

    console.log('Données finales corrigées:', JSON.stringify(orderData, null, 2));

    const response = await fetch('https://backend.barakasn.com/api/v0/orders/orders/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    setOrderConfirmed(true);
    setOrderNumber(data.id || data.order_number);
    await clearCart();
    navigation.navigate('OrderConfirmationScreen');
    
  } catch (error) {
    console.error('Erreur complète:', error);
    Alert.alert(
      'Erreur de validation',
      `Le serveur a rejeté la commande : ${error.message}`,
      [{ text: 'OK' }]
    );
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Méthode de paiement</Text>
        
        <TouchableOpacity 
          style={[styles.paymentOption, paymentMethod === 'wave' && styles.selectedOption]}
          onPress={() => Linking.openURL('https://pay.wave.com/m/M_UirpwF2GyxWf/c/sn/')}
        >
          <Text style={styles.paymentText}>Wave</Text>
          {paymentMethod === 'wave' && <Ionicons name="checkmark-circle" size={24} color="#F58320" />}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.paymentOption, paymentMethod === 'card' && styles.selectedOption]}
          // onPress={() => setPaymentMethod('card')}
        >
          {/* <Image source={require('../assets/credit-card.png')} style={styles.paymentIcon} /> */}
          <Text style={styles.paymentText}>Carte Bancaire</Text>
          {paymentMethod === 'card' && <Ionicons name="checkmark-circle" size={24} color="#F58320" />}
        </TouchableOpacity>

        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total à payer:</Text>
          <Text style={styles.totalAmount}>{total} FCFA</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.actionButton, { backgroundColor: '#F58320' }]}
        onPress={confirmOrder}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.actionButtonText}>Confirmer la commande</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedOption: {
    borderColor: '#F58320',
    backgroundColor: '#FFF3E0',
  },
  paymentIcon: {
    width: 30,
    height: 30,
    marginRight: 12,
  },
  paymentText: {
    fontSize: 16,
    flex: 1,
  },
  totalContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  confirmButton: {
    backgroundColor: '#F58320',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default PaymentScreen;