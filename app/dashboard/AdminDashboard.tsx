// AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet,
    ScrollView, 
    TouchableOpacity, 
    FlatList, 
    TextInput,
    Button } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';

const AdminDashboard = ({ navigation }) => {
  
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  const [activeTab, setActiveTab] = useState('commandes');
  const [stats, setStats] = useState({
    commandes: 0,
    produits: 0,
    utilisateurs: 0,
    revenus: 0
  });

  // Simuler le chargement des données
  useEffect(() => {
    // Ici vous ferez des appels API réels
    setStats({
      commandes: 125,
      produits: 342,
      utilisateurs: 89,
      revenus: 12500000
    });
  }, []);

  const renderContent = () => {
    switch(activeTab) {
      case 'commandes':
        return <OrdersTab />;
      case 'produits':
        return <ProductsTab />;
      case 'categories':
        return <CategoriesTab />;
      case 'messages':
        return <MessagesTab />;
      case 'promotions':
        return <PromotionsTab />;
      default:
        return <OrdersTab />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#f5f5f5' }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: isDarkMode ? '#fff' : '#000' }]}>Tableau de bord Admin</Text>
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <StatCard 
          icon="cart-outline" 
          title="Commandes" 
          value={stats.commandes} 
          color="#F58320" 
        />
        <StatCard 
          icon="cube-outline" 
          title="Produits" 
          value={stats.produits} 
          color="#4CAF50" 
        />
        <StatCard 
          icon="people-outline" 
          title="Utilisateurs" 
          value={stats.utilisateurs} 
          color="#2196F3" 
        />
        <StatCard 
          icon="cash-outline" 
          title="Revenus (FCFA)" 
          value={stats.revenus} 
          color="#9C27B0" 
          isCurrency 
        />
      </View>

      {/* Navigation tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.tabsContainer}
      >
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              activeTab === tab.id && styles.activeTab,
              { backgroundColor: isDarkMode ? '#333' : '#fff' }
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.id ? '#F58320' : (isDarkMode ? '#fff' : '#666')} 
            />
            <Text 
              style={[
                styles.tabText,
                { color: activeTab === tab.id ? '#F58320' : (isDarkMode ? '#fff' : '#666') }
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Contenu dynamique */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
    </View>
  );
};

// Composants pour chaque onglet
type Order = { id: string; client: string; montant: number; status: string; date: string; };

const OrdersTab = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  
  useEffect(() => {
    // Simuler des données de commandes
    setOrders([
      { id: '1', client: 'Client A', montant: 50000, status: 'En cours', date: '28/05/2023' },
      { id: '2', client: 'Client B', montant: 75000, status: 'Livré', date: '27/05/2023' },
      // ... autres commandes
    ]);
  }, []);

  return (
    <FlatList
      data={orders}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={styles.orderItem}>
          <Text>Commande #{item.id}</Text>
          <Text>Client: {item.client}</Text>
          <Text>Montant: {item.montant} FCFA</Text>
          <Text>Statut: {item.status}</Text>
          <Text>Date: {item.date}</Text>
        </View>
      )}
    />
  );
};

const ProductsTab = () => {
  // Implémentation similaire pour les produits
  return <Text>Gestion des produits</Text>;
};

const CategoriesTab = () => {
  // Implémentation similaire pour les catégories
  return <Text>Gestion des catégories</Text>;
};

const MessagesTab = () => {
  const [message, setMessage] = useState('');

  const sendToAllUsers = () => {
    // Logique pour envoyer le message à tous les utilisateurs
    alert(`Message envoyé à tous les utilisateurs: ${message}`);
    setMessage('');
  };

  return (
    <View>
      <Text>Envoyer un message à tous les utilisateurs:</Text>
      <TextInput
        placeholder="Votre message..."
        value={message}
        onChangeText={setMessage}
        multiline
      />
      <Button title="Envoyer" onPress={sendToAllUsers} />
    </View>
  );
};

const PromotionsTab = () => {
  // Implémentation pour les promotions et soldes
  return <Text>Gestion des promotions</Text>;
};

// Composant de carte de statistique
const StatCard = ({ icon, title, value, color, isCurrency = false }) => {
  
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  
  const formatValue = (val) => {
    if (isCurrency) {
      return new Intl.NumberFormat('fr-FR').format(val);
    }
    return val;
  };

  return (
    <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#333' : '#fff' }]}>
      <Ionicons name={icon} size={30} color={color} />
      <Text style={[styles.statTitle, { color: isDarkMode ? '#fff' : '#666' }]}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{formatValue(value)}{isCurrency ? ' FCFA' : ''}</Text>
    </View>
  );
};

// Données pour les onglets

const tabs: { id: string; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'commandes', title: 'Commandes', icon: 'cart-outline' },
  { id: 'produits', title: 'Produits', icon: 'cube-outline' },
  { id: 'categories', title: 'Catégories', icon: 'grid-outline' },
  { id: 'messages', title: 'Messages', icon: 'mail-outline' },
  { id: 'promotions', title: 'Promotions', icon: 'megaphone-outline' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  header: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 14,
    marginTop: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  tabsContainer: {
    marginBottom: 15,
  },
  tabButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#F58320',
  },
  tabText: {
    marginLeft: 5,
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
  },
  orderItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
});

export default AdminDashboard;