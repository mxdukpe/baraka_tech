// PaiementValidationScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';

type RouteParams = {
  orderId: string;
  onPaymentSuccess: () => void;
};

const PaiementValidationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId, onPaymentSuccess } = route.params as RouteParams;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { isDarkMode } = useTheme();
  
  const handlePayment = async () => {
    try {
      setLoading(true);
      // Simulation de paiement (2 secondes)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(true);
      setLoading(false);
      
      // Appel du callback pour mettre à jour le statut
      onPaymentSuccess();
      
      // Retour à l'écran précédent après 2 secondes
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error) {
      setLoading(false);
      Alert.alert('Erreur', 'Le paiement a échoué');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#fff' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#F58320" />
        </TouchableOpacity>
        <Text style={styles.title}>Validation du paiement</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#F58320" />
        ) : success ? (
          <>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            <Text style={styles.successText}>Paiement validé avec succès!</Text>
            <Text style={styles.orderText}>Commande #{orderId}</Text>
          </>
        ) : (
          <>
            <Text style={styles.orderText}>Commande #{orderId}</Text>
            <Text style={styles.amountText}>Montant à payer: 10,000 FCFA</Text>
            <Text style={styles.infoText}>Veuillez procéder au paiement</Text>
            
            <TouchableOpacity 
              style={styles.payButton}
              onPress={handlePayment}
              disabled={loading}
            >
              <Text style={styles.payButtonText}>Valider le paiement</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  orderText: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  amountText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  payButton: {
    backgroundColor: '#F58320',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  payButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default PaiementValidationScreen;