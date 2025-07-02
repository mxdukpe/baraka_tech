/**
 * Ce fichier définit l'écran d'accueil de l'application.
 * Il affiche des informations sur l'utilisateur, l'objectif du jour, les progrès,
 * un article suggéré et la dernière notification.
 *
 * @module ContactScreen
 */
import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';

type Contact = {
  id: string;
  name: string;
  phone: string;
};

const contacts: Contact[] = [
  { id: '1', name: 'Cheikhou (Responsable Commercial)', phone: '+221 776662001' },
  { id: '2', name: 'Ousseynou (Commercial)', phone: '+221 777920202' },
  { id: '3', name: 'Ass (Commercial)', phone: '+221 777119440' },
];

type ContactScreenProps = {
  navigation: any;
};

/**
 * Composant pour l'écran de contact.
 * @returns {JSX.Element} L'écran de contact.
 */
const ContactScreen: React.FC<ContactScreenProps> = ({ navigation }) => {
  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone: string) => {
    Linking.openURL(`whatsapp://send?phone=${phone}`);
  };
  
    const { isDarkMode, toggleTheme } = useTheme();
  
    const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#F58320" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: theme.header.text}]}>Contacts</Text>
      </View>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.contactItem, { backgroundColor: theme.header.backgroundColor }]}>
            <Text style={[styles.contactName, {color: theme.header.text}]}>{item.name}</Text>
            <Text style={[styles.contactPhone, {color: theme.text}]}>{item.phone}</Text>
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => handleCall(item.phone)}
              >
                <Ionicons name="call" size={24} color="green" />
                <Text style={styles.buttonText}>Appeler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => handleWhatsApp(item.phone)}
              >
                <Ionicons name="logo-whatsapp" size={24} color="green" />
                <Text style={styles.buttonText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
    paddingVertical: 50,
  },
  headerContainer: {
    flexDirection: "row",  
    alignItems: "center",  
    marginBottom: 10,  
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  iconBack: {
    marginRight: 10, // Espacement entre l'icône et le texte
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
  },

  // headerContainer: {
  //   flexDirection: "row",  
  //   alignItems: "center",  
  //   marginBottom: 10,  
  // },
  // iconBack: {
  //   marginRight: 10, // Espacement entre l'icône et le texte
  // },
  // sectionTitle: {
  //   fontSize: 24,
  //   fontWeight: "bold",
  //   color: "#2c3e50",
  // },

  contactItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  contactPhone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F58320',
    borderRadius: 4,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
});

export default ContactScreen;