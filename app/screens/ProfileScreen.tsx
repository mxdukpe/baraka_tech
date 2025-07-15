import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ProfileScreenProps = {
  navigation: any;
};

type UserProfile = {
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isDarkMode, toggleTheme } = useTheme();

  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) throw new Error('No authentication token');

        const response = await fetch('https://backend.barakasn.com/api/v0/merchants/detail/', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone_number: data.phone_number || '',
          email: data.email || ''
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleContactSupport = () => {
    Alert.alert('Service Client', 'Contactez-nous au support@example.com');
  };

  const handleSaveProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch('https://backend.barakasn.com/api/v0/merchants/complete-profile/', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone_number: profile.phone_number,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } catch (err) {
      Alert.alert('Erreur', 'Échec de la mise à jour du profil');
      console.error(err);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          onPress: async () => {
            await AsyncStorage.removeItem('access_token');
            navigation.navigate('Login');
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F58320" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.button.background }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.buttonText, { color: theme.button.text }]}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color="#F58320" />
      </TouchableOpacity>
      
      <Text style={[styles.header, { color: theme.text }]}>Profil</Text>
      
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: theme.text }]}>Prénom:</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.input.background,
              color: theme.input.text,
              borderColor: theme.input.border,
            },
          ]}
          value={profile.first_name}
          onChangeText={(text) => setProfile({...profile, first_name: text})}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: theme.text }]}>Nom:</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.input.background,
              color: theme.input.text,
              borderColor: theme.input.border,
            },
          ]}
          value={profile.last_name}
          onChangeText={(text) => setProfile({...profile, last_name: text})}
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: theme.text }]}>Téléphone:</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.input.background,
              color: theme.input.text,
              borderColor: theme.input.border,
            },
          ]}
          value={profile.phone_number}
          onChangeText={(text) => setProfile({...profile, phone_number: text})}
          keyboardType="phone-pad"
        />
      </View>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: theme.button.background }]}
        onPress={handleSaveProfile}
      >
        <Text style={[styles.buttonText, { color: theme.button.text }]}>
          Sauvegarder les modifications
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: theme.button.background }]}
        onPress={handleContactSupport}
      >
        <Text style={[styles.buttonText, { color: theme.button.text }]}>
          Contacter le service client
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: '#FF3B30' }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={24} color="white" />
        <Text style={styles.logoutButtonText}>
          Déconnexion
        </Text>
      </TouchableOpacity>

      <View style={styles.switchContainer}>
        <Text style={[styles.label, { color: theme.text }]}>Mode Sombre</Text>
        <Switch 
          value={isDarkMode} 
          onValueChange={toggleTheme}
          thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingVertical: 50,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    backgroundColor: '#FF3B30',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 5,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default ProfileScreen;