import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

type RegisterStep1ScreenProps = {
  navigation: any;
};

const RegisterStep1Screen: React.FC<RegisterStep1ScreenProps> = ({ navigation }) => {
  const [phone_number, setPhoneNumber] = useState<string>('');
  const [device_id, setDeviceId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDeviceId = async () => {
      try {
        const id = await DeviceInfo.getUniqueId();
        setDeviceId(id);
      } catch (error) {
        console.error('Erreur device_id:', error);
        Alert.alert('Erreur', 'Impossible de récupérer l\'ID de l\'appareil');
      }
    };
    fetchDeviceId();
  }, []);

  const handleSendPhoneNumber = async () => {
  if (!phone_number || !/^\d{8}$/.test(phone_number)) {
    Alert.alert('Erreur', 'Veuillez entrer un numéro valide (8 chiffres)');
    return;
  }

  setIsLoading(true);

  try {
    const payload = {
      phone_number: `${phone_number}`,
      device_id,
    };

    const response = await fetch('https://backend.barakasn.com/api/v0/merchants/register/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Extraction détaillée des messages d'erreur
      let errorMessage = 'Erreur lors de l\'enregistrement';
      
      if (responseData.detail) {
        errorMessage = responseData.detail;
      } else if (responseData.phone_number) {
        errorMessage = responseData.phone_number.join('\n');
      } else if (responseData.non_field_errors) {
        errorMessage = responseData.non_field_errors.join('\n');
      } else if (typeof responseData === 'string') {
        errorMessage = responseData;
      } else if (Object.keys(responseData).length > 0) {
        errorMessage = Object.entries(responseData)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n');
      }

      throw new Error(errorMessage);
    }

    navigation.navigate('OtpVerification', {
      phone_number: payload.phone_number,
      device_id,
    });

  } catch (error) {
    console.error('Erreur:', error);
    Alert.alert(
      'Erreur',
      error instanceof Error ? error.message : 'Une erreur inconnue est survenue'
    );
  } finally {
    setIsLoading(false);
  }
};

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(text.replace(/\D/g, ''));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Créer un compte</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Numéro de téléphone</Text>
            <View style={styles.phoneContainer}>
              <Text style={styles.prefix}>+229 </Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="12345678"
                value={phone_number}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={8}
              />
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#F58320" style={styles.loader} />
          ) : (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleSendPhoneNumber}
              disabled={isLoading}
            >
              <Text style={styles.continueButtonText}>Continuer</Text>
            </TouchableOpacity>
          )}

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.registerLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  formContainer: {
    padding: 30,
    paddingTop: 50,
  }, loader: {
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F58320',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
  },
  prefix: {
    fontSize: 16,
    fontWeight: '500',
    paddingLeft: 15,
    color: '#333',
  },
  phoneInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: '#F58320',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#F58320',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#F58320',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default RegisterStep1Screen;