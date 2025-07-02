import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { activateMerchant } from '../../services/authService'; // Assurez-vous que cette fonction est définie

type OtpVerificationProps = {
  route: any;
  navigation: any;
};

const OtpVerification: React.FC<OtpVerificationProps> = ({ route, navigation }) => {
  const { phone_number, device_id, otp } = route.params; // Récupérez les paramètres de route
  const [enteredOtp, setEnteredOtp] = useState('');

  const handleVerifyOtp = async () => {
    if (!enteredOtp) {
      Alert.alert('Erreur', 'Veuillez entrer le code OTP.');
      return;
    }
  
    try {
      console.log('Données envoyées à l\'API:', {
        phone_number,
        activation_code: enteredOtp,
        device_id,
      });
  
      const response = await activateMerchant({
        phone_number,
        activation_code: enteredOtp,
        device_id,
      });
  
      console.log('Réponse de l\'API:', response);
  
      console.log('Réponse brute:', response);
      console.log('Structure de la réponse:', Object.keys(response));
      // Remplace cette partie dans handleVerifyOtp
      if (response && response.message === "Compte activé avec succès.") {
        Alert.alert('Succès', 'Votre compte a été activé avec succès !');
        navigation.navigate('RegisterStep2Screen', {
          phone_number: phone_number,
          device_id: device_id
        });
      } else {
        Alert.alert('Erreur', response.message || 'Erreur lors de l\'activation du compte.');
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation du compte:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'activation du compte.';
      Alert.alert('Erreur', errorMessage);
    }
  };

  return (
    <SafeAreaView style={[styles.container]}>
      <View style={styles.content}>
        <Text style={styles.title}>Vérification OTP</Text>
        <Text style={styles.subtitle}>
          Un code OTP a été envoyé à {phone_number}. Veuillez l'entrer ci-dessous.
        </Text>

        <TextInput
          style={styles.otpInput}
          placeholder="Entrez le code OTP"
          value={enteredOtp}
          onChangeText={setEnteredOtp}
          keyboardType="numeric"
          maxLength={6}
          placeholderTextColor="#999"
        /> 

        <TouchableOpacity
          style={styles.verifyButton}
          onPress={handleVerifyOtp}
          activeOpacity={0.8}
        >
          <Text style={styles.verifyButtonText}>Vérifier</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Retour</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F58320',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
    width: '100%',
    marginBottom: 20,
  },
  verifyButton: {
    backgroundColor: '#F58320',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#F58320',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backLink: {
    color: '#F58320',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
  },
});

export default OtpVerification;