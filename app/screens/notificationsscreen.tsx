/**
 * Ce fichier définit l'écran des notifications.
 * Il permet à l'utilisateur de gérer les paramètres de notification
 * et affiche les notifications récentes.
 *
 * @module NotificationsScreen
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { notificationsData, Notification } from '../../data/notificationsData';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';

type NotificationType = 'Arrivages' | 'Commandes' | 'Panier' | 'Nouveaux produits' | 'Modification de prix' | 'Promotion' | 'Produits disponibles';

type NotificationScreenProps = {
  navigation: any;
};

const NotificationsScreen: React.FC<NotificationScreenProps> = ({ navigation }) => {
  const [notificationSettings, setNotificationSettings] = useState({
    Arrivages: true,
    Commandes: true,
    Panier: true,
    'Nouveaux produits': true,
    'Modification de prix': true,
    Promotion: true,
    'Produits disponibles': true,
  });

  const { isDarkMode, toggleTheme } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const toggleNotificationSetting = (type: NotificationType) => {
    setNotificationSettings((prevSettings) => ({
      ...prevSettings,
      [type]: !prevSettings[type],
    }));
  };

  // Filtrer les notifications en fonction des paramètres utilisateur
  const filteredNotifications = notificationsData.filter(
    (notification) => notificationSettings[notification.type]
  );

  const renderNotification = ({ item }: { item: Notification }) => (
    <View style={[[styles.notificationContainer, { backgroundColor: theme.header.backgroundColor }], styles[item.type]]}>
      <Text style={[styles.notificationMessage, { color: theme.text }]}>{item.message}</Text>
      <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#F58320" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.header.text }]}>Notifications</Text>
      </View>

      {/* Paramètres de notification */}
      <View style={[styles.settingsContainer, { backgroundColor: theme.header.backgroundColor }]}>
        {Object.keys(notificationSettings).map((type) => (
          <View key={type} style={styles.settingItem}>
            <Text style={[styles.settingText, { color: theme.text }]}>{type}</Text>
            <Switch
              value={notificationSettings[type as NotificationType]}
              onValueChange={() => toggleNotificationSetting(type as NotificationType)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={notificationSettings[type as NotificationType] ? '#F58320' : '#f4f3f4'}
            />
          </View>
        ))}
      </View>

      {/* Liste des notifications filtrées */}
      <Text style={[styles.subHeader, { color: theme.header.text }]}>Notifications Récentes</Text>
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderNotification}
        scrollEnabled={false}
      />
    </ScrollView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    paddingVertical: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
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
    marginTop: 20,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  subHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#2c3e50',
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingText: {
    fontSize: 16,
    color: '#34495e',
  },
  notificationContainer: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  Arrivages: {
    borderLeftWidth: 5,
    borderLeftColor: '#81b0ff',
  },
  Commandes: {
    borderLeftWidth: 5,
    borderLeftColor: '#F58320',
  },
  Panier: {
    borderLeftWidth: 5,
    borderLeftColor: '#f1c40f',
  },
  notificationMessage: {
    fontSize: 16,
    color: '#2c3e50',
  },
  timestamp: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
    textAlign: 'right',
  },

  'Nouveaux produits': {
    borderLeftWidth: 5,
    borderLeftColor: '#81b0ff',
  },
  'Modification de prix': {
    borderLeftWidth: 5,
    borderLeftColor: '#F58320',
  },
  Promotion: {
    borderLeftWidth: 5,
    borderLeftColor: '#f1c40f',
  },
  'Produits disponibles': {
    borderLeftWidth: 5,
    borderLeftColor: '#2ecc71',
  },
});

export default NotificationsScreen;