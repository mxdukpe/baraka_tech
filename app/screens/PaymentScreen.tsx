import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PaymentScreen = ({ route, navigation }) => {
  const { total } = route.params;
  const [paymentMethod, setPaymentMethod] = useState(null);

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
        style={[styles.confirmButton]}
        onPress={() => navigation.navigate('OrderConfirmationScreen')}
        // disabled={!paymentMethod}
      >
        <Text style={styles.confirmButtonText}>Confirmer la commande</Text>
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
});

export default PaymentScreen;