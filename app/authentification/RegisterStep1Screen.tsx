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
  FlatList,
  Modal,

  ActivityIndicator
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import { CountryCode, Country } from '../../services/types'; // Nous allons créer ce type
import countryData from './countryCodes.json'; // Fichier JSON avec les indicatifs

type RegisterStep1ScreenProps = {
  navigation: any;
  route: any;
};

const RegisterStep1Screen: React.FC<RegisterStep1ScreenProps> = ({ navigation, route }) => {
  const [device_id, setDeviceId] = useState<string>('');
    const [phone_number, setPhoneNumber] = useState(route.params?.phone_number || '');
    const [first_name, setFirstName] = useState(route.params?.first_name || '');
    const [last_name, setLastName] = useState(route.params?.last_name || '');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<Country>({
      code: 'CD',
      name: 'Sénégal',
      dial_code: '+221'
    });
    const [modalVisible, setModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');

  const filteredCountries = countryData.filter(country => 
    country.name.toLowerCase().includes(searchText.toLowerCase()) || 
    country.dial_code.includes(searchText)
  );

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

  
  
  // if (phone_number.length > 10 || phone_number.length < 8) {
  //   Alert.alert('Erreur', 'Veuillez entrer votre numéro de téléphone valide');
  //   return;
  // }

  // Combiner l'indicatif et le numéro
  const fullPhoneNumber = `${selectedCountry.dial_code}${phone_number.replace(/^0+/, '')}`;
  const handleSendPhoneNumber = async () => {


  setIsLoading(true);

  try {
    const payload = {
      phone_number: `${fullPhoneNumber}`,
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
      } else if (responseData.fullPhoneNumber) {
        errorMessage = responseData.fullPhoneNumber.join('\n');
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
    const renderCountryItem = ({ item }: { item: Country }) => (
      <TouchableOpacity
        style={styles.countryItem}
        onPress={() => {
          setSelectedCountry(item);
          setModalVisible(false);
          setSearchText('');
        }}
      >
        <Text style={styles.countryName}>{item.name}</Text>
        <Text style={styles.countryCode}>{item.dial_code}</Text>
      </TouchableOpacity>
    );
  

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Créer un compte</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Numéro de téléphone</Text>
            <View style={styles.phoneInputContainer}>
              <TouchableOpacity 
                style={styles.countryPickerButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.countryPickerText}>{selectedCountry.dial_code}</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                value={phone_number}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoCapitalize="none"
                placeholderTextColor="#999"
                placeholder="Numéro de téléphone"
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
      
            {/* Modal pour sélectionner le pays */}
            <Modal
              animationType="slide"
              transparent={false}
              visible={modalVisible}
              onRequestClose={() => setModalVisible(false)}
            >
              <SafeAreaView style={styles.modalContainer}>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher un pays..."
                    value={searchText}
                    onChangeText={setSearchText}
                    autoFocus={true}
                  />
                </View>
                <FlatList
                  data={filteredCountries}
                  renderItem={renderCountryItem}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                />
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setModalVisible(false);
                    setSearchText('');
                  }}
                >
                  <Text style={styles.closeButtonText}>Fermer</Text>
                </TouchableOpacity>
              </SafeAreaView>
            </Modal>
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
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  searchInput: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 16,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  countryName: {
    fontSize: 16,
    color: '#333',
  },
  countryCode: {
    fontSize: 16,
    color: '#666',
  },
  closeButton: {
    padding: 15,
    backgroundColor: '#F58320',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  countryPickerButton: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
  },
  countryPickerText: {
    fontSize: 16,
    color: '#333',
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