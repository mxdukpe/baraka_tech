/**
 * Ce fichier définit l'écran de gestion des objectifs.
 * Il permet à l'utilisateur de créer, suivre et supprimer des objectifs.
 *
 * @module SaleScreen
 */
import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';


type SaleScreenProps = {
  navigation: any;
};

type Promotion = {
  id: string;
  title: string;
  subtitle: string;
  image: any;
};

const promotions: Promotion[] = [
  {
    id: '1',
    title: 'Promotion spéciale',
    subtitle: 'Jusqu’à -50% sur les smartphones',
    image: require('../../assets/images/baraka_images/lenovo.png'),
  },
  {
    id: '2',
    title: 'Soldes d’été',
    subtitle: 'Profitez des offres exclusives',
    image: require('../../assets/images/baraka_images/lenovo2.png'),
  },
  {
    id: '3',
    title: 'Nouveaux produits',
    subtitle: 'Découvrez les dernières nouveautés',
    image: require('../../assets/images/baraka_images/lenovo3.png'),
  },
];

const SaleScreen: React.FC<SaleScreenProps> = ({ navigation }) => {
  const renderPromotion = ({ item }: { item: Promotion }) => (
    <TouchableOpacity style={[styles.promotionCard, { backgroundColor: theme.header.backgroundColor }]}>
      <Image source={item.image} style={styles.promotionImage} />
      <View style={styles.promotionTextContainer}>
        <Text style={[styles.promotionTitle, {color: theme.header.text}]}>{item.title}</Text>
        <Text style={[styles.promotionSubtitle, {color: theme.header.text}]}>{item.subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
  
    const { isDarkMode, toggleTheme } = useTheme();
  
    const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#F58320" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: theme.header.text}]}>Promotions</Text>
        </View>
        <FlatList
          data={promotions}
          renderItem={renderPromotion}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.promotionList}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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

  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F58320',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  promotionList: {
    paddingHorizontal: 20,
  },
  promotionCard: {
    backgroundColor: '#FFF5EC',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  promotionImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  promotionTextContainer: {
    padding: 15,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  promotionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
});

export default SaleScreen;