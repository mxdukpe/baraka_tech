import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OrderConfirmationScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        <Text style={styles.title}>Commande confirmée!</Text>
        <Text style={styles.subtitle}>Votre commande a été passée avec succès</Text>
        <Text style={styles.orderText}>N° de commande: #123456</Text>
        
        <TouchableOpacity 
          style={styles.trackButton}
          onPress={() => navigation.navigate('OrderStatusScreen')}
        >
          <Text style={styles.trackButtonText}>Suivre ma commande</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.homeButton}
        onPress={() => navigation.navigate('HomeStack')}
      >
        <Text style={styles.homeButtonText}>Retour à l'accueil</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    paddingVertical: 50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  orderText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 32,
  },
  trackButton: {
    borderWidth: 1,
    borderColor: '#F58320',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackButtonText: {
    color: '#F58320',
    fontWeight: 'bold',
    fontSize: 16,
  },
  homeButton: {
    backgroundColor: '#F58320',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  homeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default OrderConfirmationScreen;