/**
 * Ce fichier définit l'écran d'accueil de l'application.
 * Il affiche des informations sur l'utilisateur, l'objectif du jour, les progrès,
 * un article suggéré et la dernière notification.
 *
 * @module CustomerInfoScreen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';


type CustomerInfoScreenProps = {
  navigation: any;
};

const CustomerInfoScreen: React.FC<CustomerInfoScreenProps> = ({ navigation }) => {
  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  
    const { isDarkMode, toggleTheme } = useTheme();
  
    const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} >
              <Ionicons name="arrow-back-outline" size={24} color="black" style={styles.iconBack} />
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>Informations du client</Text>
          </View>
      <TextInput
        style={styles.input}
        placeholder="Nom"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Adresse"
        value={address}
        onChangeText={setAddress}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TouchableOpacity style={styles.nextButton} onPress={() => navigation.navigate('PaymentScreen')}>
        <Text style={styles.nextButtonText}>Suivant</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    paddingVertical: 50,
  },
  headerContainer: {
    flexDirection: "row",  
    alignItems: "center",  
    marginBottom: 10,  
  },
  iconBack: {
    marginRight: 10, // Espacement entre l'icône et le texte
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
  },

  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  nextButton: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    backgroundColor: '#F58320',
    alignSelf: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default CustomerInfoScreen;