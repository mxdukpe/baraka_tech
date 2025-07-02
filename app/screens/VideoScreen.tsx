/**
 * Ce fichier définit l'écran de gestion des objectifs.
 * Il permet à l'utilisateur de créer, suivre et supprimer des objectifs.
 *
 * @module VideoScreen
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';


type VideoScreenProps = {
  navigation: any;
};

// Définition du type pour une vidéo tutorielle
type Tutorial = {
  id: string;
  title: string;
  duration: string;
  thumbnail: any;
  description: string;
};

// Données des tutoriels
const tutorials: Tutorial[] = [
  {
    id: '1',
    title: 'Comment parcourir le catalogue',
    duration: '2:30',
    thumbnail: require('../../assets/images/baraka_images/appareils.png'),
    description: 'Découvrez comment naviguer dans notre catalogue de produits.'
  },
  {
    id: '2',
    title: 'Effectuer un achat',
    duration: '3:45',
    thumbnail: require('../../assets/images/baraka_images/appareils.png'),
    description: 'Guide étape par étape pour réaliser votre premier achat.'
  },
  {
    id: '3',
    title: 'Gérer votre panier',
    duration: '1:55',
    thumbnail: require('../../assets/images/baraka_images/appareils.png'),
    description: 'Apprenez à ajouter, modifier et supprimer des articles de votre panier.'
  },
  {
    id: '4',
    title: 'Processus de paiement',
    duration: '4:15',
    thumbnail: require('../../assets/images/baraka_images/appareils.png'),
    description: 'Comprendre les différentes options de paiement disponibles.'
  }
];

const VideoScreen: React.FC<VideoScreenProps> = ({ navigation }) => {
  
    const { isDarkMode, toggleTheme } = useTheme();
  
    const theme = isDarkMode ? darkTheme : lightTheme;
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#F58320" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: theme.header.text}]}>Tutoriels vidéo</Text>
        <Text style={[styles.subTitle, {color: theme.header.text}]}>Apprenez à utiliser l'application</Text>
      </View>

      <View style={styles.tutorialsGrid}>
        {tutorials.map((tutorial) => (
          <TouchableOpacity key={tutorial.id} style={[styles.tutorialCard, { backgroundColor: theme.header.backgroundColor }]}>
            <View style={styles.thumbnailContainer}>
              <Image source={tutorial.thumbnail} style={styles.thumbnail} />
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{tutorial.duration}</Text>
              </View>
              <View style={styles.playButton}>
                <Ionicons name="play-circle" size={40} color="#fff" />
              </View>
            </View>
            <View style={styles.tutorialInfo}>
              <Text style={[styles.tutorialTitle, {color: theme.header.text}]}>{tutorial.title}</Text>
              <Text style={[styles.tutorialDescription, {color: theme.header.text}]}>{tutorial.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  header: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  tutorialsGrid: {
    flex: 1,
  },
  tutorialCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailContainer: {
    position: 'relative',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -20 },
      { translateY: -20 }
    ],
  },
  tutorialInfo: {
    padding: 15,
  },
  tutorialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  tutorialDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
});

export default VideoScreen;