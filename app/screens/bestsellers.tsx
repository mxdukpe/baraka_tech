/**
 * Ce fichier définit l'écran de gestion des objectifs.
 * Il permet à l'utilisateur de créer, suivre et supprimer des objectifs.
 *
 * @module bestsellers
 */
import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { goalsData, Goal, MiniTask } from '../../data/goalsData';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';

/**
 * Type pour les catégories d'objectifs.
 */
type Category = 'Ordinateurs' | 'Tablettes' | 'Télévisions' | 'Disques durs' | 'Casques' | 'Souris';

/**
 * Composant pour l'écran des objectifs.
 * @returns {JSX.Element} L'écran des objectifs.
 */
const bestsellers: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>(goalsData);
  const [newGoalTitle, setNewGoalTitle] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Tous'>('Tous');
  const [newGoalCategory, setNewGoalCategory] = useState<Category>('Ordinateurs');
const { isDarkMode, toggleTheme } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  // Fonction pour basculer l'état d'une mini-tâche
  const toggleMiniTaskCompletion = (goalId: number, miniTaskId: number) => {
    setGoals((prevGoals) =>
      prevGoals.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              miniTasks: goal.miniTasks.map((miniTask) =>
                miniTask.id === miniTaskId
                  ? { ...miniTask, completed: !miniTask.completed }
                  : miniTask
              ),
            }
          : goal
      )
    );
  };

  // Filtrer les objectifs par catégorie
  const filteredGoals = selectedCategory === 'Tous' 
    ? goals 
    : goals.filter((goal) => goal.category === selectedCategory);

  // Catégories disponibles
  const categories: Category[] = ['Ordinateurs', 'Tablettes', 'Télévisions', 'Disques durs', 'Casques', 'Souris'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Catégories */}
      <View style={styles.categories}>
        <Text style={styles.sectionTitle}>Catégories de produits</Text>
        <View style={styles.categoryGrid}>
          {/* Ordi bureau */}
          <View style={styles.category}>
            <Image
              source={require("../../assets/images/baraka_images/ordi_bureau.png")} // Exemple d'image
              style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Ordinateurs de bureau</Text>
          </View>

          {/* TV */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/télévision.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Télévisions</Text>
          </View>

          {/* Souris */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/souris.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Souris</Text>
          </View>

          {/* Casques */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/casque.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Casques audios</Text>
          </View>

          
          {/* Ordi bureau */}
          <View style={styles.category}>
            <Image
              source={require("../../assets/images/baraka_images/ordi_bureau.png")} // Exemple d'image
              style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Ordinateurs de bureau</Text>
          </View>

          {/* TV */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/télévision.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Télévisions</Text>
          </View>

          {/* Souris */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/souris.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Souris</Text>
          </View>

          {/* Casques */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/casque.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Casques audios</Text>
          </View>

          
          {/* Ordi bureau */}
          <View style={styles.category}>
            <Image
              source={require("../../assets/images/baraka_images/ordi_bureau.png")} // Exemple d'image
              style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Ordinateurs de bureau</Text>
          </View>

          {/* TV */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/télévision.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Télévisions</Text>
          </View>

          {/* Souris */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/souris.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Souris</Text>
          </View>

          {/* Casques */}
          <View style={styles.category}>
            <Image
            source={require("../../assets/images/baraka_images/casque.png")} // Exemple d'image
            style={styles.categoryImage}
            />
            <Text style={styles.categoryText}>Casques audios</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
    
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        paddingHorizontal: 10,
    paddingVertical: 50,
    },
    time: {
        fontSize: 16,
        fontWeight: "bold",
    },
    icons: {
        flexDirection: "row",
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        height: 27,
        width: 27,
        // marginHorizontal: 10, // Espacement entre les icônes
    },
    circle: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "black",
        marginHorizontal: 2,
    },
    newArrivals: {
        flexDirection: 'row', // Aligner le texte et les images horizontalement
        alignItems: 'center', // Centrer verticalement
        justifyContent: 'space-between', // Espacer le texte et les images
        padding: 10,
      },
      newArrivalsText: {
        color: '#FF6600', // Couleur orange du texte
        fontSize: 16,
        fontWeight: 'bold',
      },
      imageContainer: {
        flexDirection: 'row', // Empile les images horizontalement
        alignItems: 'center',
      },
      appareilsImage: {
        width: 180, // Ajuste la largeur pour correspondre à l’image
        height: 100, // Ajuste la hauteur
        resizeMode: 'contain', // Empêche la distorsion
      },
    categories: {
        marginVertical: 10,
    },
    sectionTitle: {
      marginTop: 20,
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
      color: '#2c3e50',
        // fontSize: 18,
        // fontWeight: "bold",
        // marginBottom: 10,
    },
    categoryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    category: {
        width: "48%",
        alignItems: "center",
        marginBottom: 10,
    },
    categoryImage: {
        width: 150,
        height: 100,
        marginBottom: 5,
        // borderWidth: 1, // Épaisseur de la bordure
        backgroundColor: "#f1f1f1", // Couleur grise claire
        borderRadius: 8,
    },
    categoryText: {
        textAlign: "center",
    },
    viewMore: {
        color: "blue",
        marginTop: 5,
        textAlign: "right",
    },
    featuredProducts: {
        marginVertical: 10,
    },
    productGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    product: {
        width: "48%",
        alignItems: "center",
        marginBottom: 10,
    },
    productImage: {
        width: 150,
        height: 100,
        marginBottom: 5,
        // borderWidth: 1, // Épaisseur de la bordure
        backgroundColor: "#f1f1f1", // Couleur grise claire
        borderRadius: 8,
    },
    productText: {
        textAlign: "center",
    },
    promo: {
        backgroundColor: "orange",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        marginVertical: 20,
    },
    promoText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "white",
    },
    promoDetails: {
        fontSize: 16,
        color: "white",
        textAlign: "center",
    },
});
export default bestsellers;