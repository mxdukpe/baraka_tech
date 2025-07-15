// OrderConfirmationScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OrderConfirmationScreen = ({ navigation, route }) => {
  const { selectedItems = [], total = 0, paymentMethod, paymentStatus } = route.params || {};
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);

  // useEffect(() => {
  //   // Confirmer automatiquement la commande après le paiement réussi
  //   if (paymentStatus === 'success') {
  //     confirmOrder();
  //   }
  // }, [paymentStatus]);

  
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

  const navigateToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeStack' }],
    });
  };

  const navigateToOrders = () => {
    navigation.navigate('OrderStatusScreen');
  };

  if (isSubmitting) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F58320" />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Confirmation de votre commande...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: '#F58320' }]}>
        <TouchableOpacity onPress={navigateToHome}>
          <Ionicons name="home" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmation</Text>
        <TouchableOpacity onPress={navigateToOrders}>
          <Ionicons name="list" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <MaterialIcons name="check-circle" size={80} color="#4CAF50" />
          </View>
          
          <Text style={[styles.successTitle, { color: theme.text }]}>
            Commande confirmée !
          </Text>
          
          {orderNumber && (
            <Text style={[styles.orderNumber, { color: '#F58320' }]}>
              Commande #{orderNumber}
            </Text>
          )}
          
          <Text style={[styles.successMessage, { color: theme.text }]}>
            Votre commande a été enregistrée avec succès. Vous recevrez une confirmation par email.
          </Text>
        </View>

        <View style={[styles.orderSummary, { backgroundColor: theme.background }]}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>Résumé de la commande</Text>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryText, { color: theme.text }]}>Articles:</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{selectedItems.length}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryText, { color: theme.text }]}>Mode de paiement:</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {paymentMethod === 'mobile_money' ? 'Mobile Money' : 
               paymentMethod === 'cash' ? 'Paiement à la livraison' : 'Carte bancaire'}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalText, { color: theme.text }]}>Total payé:</Text>
            <Text style={[styles.totalAmount, { color: '#F58320' }]}>{total.toFixed(2)} FCFA</Text>
          </View>
        </View>

        <View style={styles.nextSteps}>
          <Text style={[styles.nextStepsTitle, { color: theme.text }]}>Prochaines étapes</Text>
          
          {/* <View style={styles.stepItem}>
            <MaterialIcons name="email" size={20} color="#F58320" />
            <Text style={[styles.stepText, { color: theme.text }]}>
              Vous recevrez un email de confirmation
            </Text>
          </View> */}
          
          <View style={styles.stepItem}>
            <MaterialIcons name="inventory" size={20} color="#F58320" />
            <Text style={[styles.stepText, { color: theme.text }]}>
              Préparation de votre commande
            </Text>
          </View>
          
          <View style={styles.stepItem}>
            <MaterialIcons name="local-shipping" size={20} color="#F58320" />
            <Text style={[styles.stepText, { color: theme.text }]}>
              Livraison à votre adresse
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.background }]}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#F58320' }]}
          onPress={navigateToOrders}
        >
          <Text style={styles.actionButtonText}>Voir mes commandes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#F58320' }]}
          onPress={navigateToHome}
        >
          <Text style={[styles.actionButtonText, { color: '#F58320' }]}>Continuer mes achats</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#F58320',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
    marginTop: 8,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#F58320',
  },
  paymentOption: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F58320',
  },
  paymentOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  paymentOptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentOptionDescription: {
    fontSize: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  payButton: {
    backgroundColor: '#F58320',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 4,
  },
  payButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  payButtonSubtext: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  orderSummary: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nextSteps: {
    marginBottom: 24,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#F58320',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
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

export default OrderConfirmationScreen;