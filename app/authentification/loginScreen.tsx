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
    View
} from 'react-native';
import DeviceInfo from 'react-native-device-info'; // Importez la bibliothèque


const { width } = Dimensions.get('window');

type LoginScreenProps = {
  route: any;
  navigation: any;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const [device_id, setDeviceId] = useState<string>(''); // Stockez le Device ID ici
  const [phone_number, setPhoneNumber] = useState(route.params?.phone_number || ''); // Ajouter un état pour le numéro de téléphone
  const [first_name, setFirstName] = useState(route.params?.first_name || '');
  const [last_name, setLastName] = useState(route.params?.last_name || '');
  const [isLoading, setIsLoading] = useState(false); // Pour gérer l'état de chargement
  
  // Obtenez le Device ID au montage du composant
  useEffect(() => {
    const fetchDeviceId = async () => {
      try {
        const id = await DeviceInfo.getUniqueId(); // Obtenez l'ID unique de l'appareil
        setDeviceId(id);
      } catch (error) {
        console.error('Erreur lors de la récupération du device_id:', error);
        Alert.alert('Erreur', 'Impossible de récupérer l\'identifiant de l\'appareil.');
      }
    };
    
    fetchDeviceId();
  }, []);
  // console.log('Paramètres reçus:', { phone_number, device_id });

  const handleLogin = async () => {
  if (!phone_number) {
    Alert.alert('Erreur', 'Veuillez entrer votre numéro de téléphone');
    return;
  }

  setIsLoading(true);

  try {
    const requestBody = {
      first_name: first_name,
      last_name: last_name,
      phone_number: phone_number,
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

    // Gestion plus robuste de la réponse
    const responseData = await response.json().catch(() => ({})); // En cas d'échec du parse JSON

    if (!response.ok) {
      // Essayer d'extraire le message d'erreur de différentes manières
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
  
  

  return (
    <SafeAreaView style={[styles.container]}>
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
          <TextInput
            style={styles.input}
            value={phone_number}
            onChangeText={setPhoneNumber}
            // onChangeText={setPhoneNumber}
            keyboardType="phone-pad" // Utiliser le clavier numérique
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity 
          style={styles.forgotPassword}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.loginButton}
          onPress={handleLogin}
          activeOpacity={0.8}
          disabled={isLoading} // Désactiver le bouton pendant le chargement
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" /> // Afficher un indicateur de chargement
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
});

export default LoginScreen;