/**
 * Ce fichier définit l'écran du guide d'utilisation de l'application.
 * Il fournit des instructions complètes sur toutes les fonctionnalités de l'application.
 *
 * @module AppUsageGuideScreen
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';

type VideoScreenProps = {
  navigation: any;
};

const AppUsageGuideScreen: React.FC<VideoScreenProps> = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#F58320" />
      </TouchableOpacity>
      
      <Text style={[styles.headerTitle, {color: theme.text}]}>Guide d'Utilisation</Text>
      
      {/* Section Navigation */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.text}]}>1. Navigation Principale</Text>
        <Text style={[styles.text, {color: theme.text}]}>
          L'application comprend plusieurs sections accessibles via le menu de navigation :
        </Text>
        
        <View style={styles.featureItem}>
          <Ionicons name="home-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            <Text style={styles.bold}>Accueil</Text> - Découvrez les produits phares et promotions
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="grid-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            <Text style={styles.bold}>Produits</Text> - Parcourez notre catalogue complet
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="search-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            <Text style={styles.bold}>Recherche</Text> - Trouvez des produits spécifiques
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="cart-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            <Text style={styles.bold}>Panier</Text> - Gérez vos articles avant paiement
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="person-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            <Text style={styles.bold}>Profil</Text> - Accédez à vos commandes et paramètres
          </Text>
        </View>
      </View>

      {/* Section Recherche */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.text}]}>2. Recherche Avancée</Text>
        <Text style={[styles.text, {color: theme.text}]}>
          Utilisez la loupe en haut de l'écran pour :
        </Text>
        
        <View style={styles.featureItem}>
          <Ionicons name="options-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            Filtrer par <Text style={styles.bold}>catégorie, prix ou marque</Text>
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="time-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            Accéder à votre <Text style={styles.bold}>historique de recherche</Text>
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="star-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            Découvrir les <Text style={styles.bold}>produits tendance</Text>
          </Text>
        </View>
      </View>

      {/* Section Produits */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.text}]}>3. Détails Produits</Text>
        <Text style={[styles.text, {color: theme.text}]}>
          En cliquant sur un produit, accédez à :
        </Text>
        
        <View style={styles.featureItem}>
          <Ionicons name="images-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            <Text style={styles.bold}>Galerie photo</Text> - Visualisez sous tous les angles
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="document-text-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            <Text style={styles.bold}>Fiche technique</Text> - Caractéristiques détaillées
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="chatbubble-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            <Text style={styles.bold}>Avis clients</Text> - Lisez les expériences d'achat
          </Text>
        </View>
      </View>

      {/* Section Panier */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.text}]}>4. Gestion du Panier</Text>
        
        <View style={styles.featureItem}>
          <Ionicons name="add-circle-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            <Text style={styles.bold}>Ajout</Text> - Cliquez sur "+" pour augmenter la quantité
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="remove-circle-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            <Text style={styles.bold}>Réduction</Text> - Cliquez sur "-" pour diminuer
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="trash-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            <Text style={styles.bold}>Suppression</Text> - Retirez un article définitivement
          </Text>
        </View>
      </View>

      {/* Section Profil */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.text}]}>5. Votre Profil</Text>
        
        <View style={styles.featureItem}>
          <Ionicons name="list-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            <Text style={styles.bold}>Commandes</Text> - Historique et suivi en temps réel
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="settings-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            <Text style={styles.bold}>Paramètres</Text> - Personnalisez votre expérience
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="moon-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            <Text style={styles.bold}>Mode sombre</Text> - Activez le confort visuel nocturne
          </Text>
        </View>
      </View>

      {/* Section Contact */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.text}]}>6. Assistance</Text>
        <Text style={[styles.text, {color: theme.text}]}>
          Besoin d'aide ? Contactez notre service client :
        </Text>
        
        <View style={styles.featureItem}>
          <Ionicons name="mail-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            Par email : <Text style={styles.bold}>support@example.com</Text>
          </Text>
        </View>
        
        <View style={styles.featureItem}>
          <Ionicons name="call-outline" size={24} color="#F58320" />
          <Text style={[styles.featureText, {color: theme.text}]}>
            Par téléphone : <Text style={styles.bold}>+229 XX XX XX XX</Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 50,
  },
  backButton: {
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 25,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#F58320',
  },
  text: {
    fontSize: 16,
    marginBottom: 15,
    lineHeight: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 10,
    flexShrink: 1,
  },
  bold: {
    fontWeight: 'bold',
  },
});

export default AppUsageGuideScreen;