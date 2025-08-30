import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
    FlatList,
    
  Platform, AppState, ScrollView
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { CountryCode, Country } from '../../services/types'; // Nous allons créer ce type
import countryData from './countryCodes.json'; // Fichier JSON avec les indicatifs

const { width } = Dimensions.get('window');

type LoginScreenProps = {
  route: any;
  navigation: any;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const [device_id, setDeviceId] = useState<string>('');
  const [phone_number, setPhoneNumber] = useState(route.params?.phone_number || '');
  const [first_name, setFirstName] = useState(route.params?.first_name || '');
  const [last_name, setLastName] = useState(route.params?.last_name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>({
    code: 'BN',
    name: 'Bénin',
    dial_code: '+229'
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const fetchDeviceId = async () => {
      try {
        const id = await DeviceInfo.getUniqueId();
        setDeviceId(id);
      } catch (error) {
        console.error('Erreur lors de la récupération du device_id:', error);
        Alert.alert('Erreur', 'Impossible de récupérer l\'identifiant de l\'appareil.');
      }
    };
    
    fetchDeviceId();
  }, []);

  const handleLogin = async () => {
    if (!phone_number) {
      Alert.alert('Erreur', 'Veuillez entrer votre numéro de téléphone');
      return;
    }

    if (phone_number.length > 10 || phone_number.length < 8) {
      Alert.alert('Erreur', 'Veuillez entrer votre numéro de téléphone valide');
      return;
    }

    // Combiner l'indicatif et le numéro
    const fullPhoneNumber = `${selectedCountry.dial_code}${phone_number.replace(/^0+/, '')}`;

    setIsLoading(true);

    try {
      const requestBody = {
        first_name: first_name,
        last_name: last_name,
        phone_number: fullPhoneNumber,
        device_id: device_id
      };

      const response = await fetch('https://backend.barakasn.com/api/v0/merchants/login/', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = 
          responseData.detail || 
          responseData.message || 
          responseData.error || 
          Object.values(responseData).join('\n') || 
          `Erreur ${response.status}: ${response.statusText}`;
        
        throw new Error(errorMessage);
      }

      if (responseData.access) {
        await AsyncStorage.setItem('access_token', responseData.access);
        navigation.navigate('HomeStack');
      } else {
        throw new Error('Token d\'accès non reçu dans la réponse');
      }
      
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      Alert.alert(
        'Erreur', 
        error instanceof Error ? error.message : 'Une erreur inconnue s\'est produite'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCountries = countryData.filter(country => 
    country.name.toLowerCase().includes(searchText.toLowerCase()) || 
    country.dial_code.includes(searchText)
  );

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
    <SafeAreaView style={[styles.container]}>

      {/* Contenu principal avec ScrollView */}
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/baraka_icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Bienvenue</Text>
          <Text style={styles.subtitle}>Connectez-vous pour continuer</Text>

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

          {/* <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
          </TouchableOpacity> */}

          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Vous n'avez pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("RegisterStep1Screen")}>
              <Text style={styles.registerLink}>Inscrivez-vous</Text>
            </TouchableOpacity>
          </View>
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  // Contenu principal avec marge pour éviter le chevauchement
  scrollContent: {
    flexGrow: 1,
    // paddingTop: Platform.OS === 'ios' ? 110 : 90, // Marge pour éviter le header
    // paddingBottom: 6,
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
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  phoneInput: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#F58320',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#F58320',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#F58320',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  loginButtonText: {
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
});

export default LoginScreen;