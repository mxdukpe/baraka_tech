import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { completeProfile } from '../../services/authService'; // Assurez-vous que cette fonction est définie

type RegisterStep2ScreenProps = {
  route: any;
  navigation: any;
};

const RegisterStep2Screen: React.FC<RegisterStep2ScreenProps> = ({ route, navigation }) => {
  const { phone_number, device_id } = route.params; // Récupérez phone_number et device_id depuis les paramètres de route
  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');

  const handleCompleteProfile = async () => {
  if (!first_name || !last_name) {
    Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
    return;
  }

  try {
    const response = await fetch('https://backend.barakasn.com/api/v0/merchants/complete-profile/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number,
        first_name,
        last_name,
        device_id
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      let errorMessage = 'Erreur lors de la complétion du profil';
      
      if (responseData.detail) {
        errorMessage = responseData.detail;
      } else if (responseData.first_name) {
        errorMessage = `Prénom: ${responseData.first_name.join(', ')}`;
      } else if (responseData.last_name) {
        errorMessage = `Nom: ${responseData.last_name.join(', ')}`;
      } else if (typeof responseData === 'string') {
        errorMessage = responseData;
      }

      throw new Error(errorMessage);
    }

    Alert.alert('Succès', 'Profil complété avec succès!');
    navigation.navigate('Login', { phone_number });

  } catch (error) {
    console.error('Erreur:', error);
    Alert.alert(
      'Erreur',
      error instanceof Error ? error.message : 'Erreur lors de la mise à jour du profil'
    );
  }
};

  return (
    <SafeAreaView style={[styles.container]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Confirmez la création du compte</Text>
          <Text style={styles.subtitle}>Étape 3: Informations de connexion</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Prénom(s)</Text>
            <TextInput
              style={styles.input}
              placeholder="Entrez votre/vos prénom(s)..."
              value={first_name}
              onChangeText={setFirstName}
              autoCapitalize="words"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom(s)</Text>
            <TextInput
              style={styles.input}
              placeholder="Entrez votre/vos nom(s)..."
              value={last_name}
              onChangeText={setLastName}
              autoCapitalize="words"
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleCompleteProfile}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>Créer le compte</Text>
          </TouchableOpacity>
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
  registerButton: {
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
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }, 
});

export default RegisterStep2Screen;