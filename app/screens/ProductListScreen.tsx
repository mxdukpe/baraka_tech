import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { getProducts } from '../../services/apiService';
import { Product } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRef } from 'react-native-view-shot';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

type ProductListScreenProps = {
  navigation: any;
};

const ProductListScreen: React.FC<ProductListScreenProps> = ({ navigation }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);
  const viewRef = useRef(null);

  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!token) return;

      try {
        const data = await getProducts(token);
        setProducts(data);
        setIsLoading(false);
      } catch (error) {
        setError('Erreur lors du chargement des produits');
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [token]);

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };

  const generatePDF = async () => {
  try {
    setIsLoading(true); // Afficher un indicateur de chargement
    
    // Vérifier s'il y a des produits à exporter
    if (filteredProducts.length === 0) {
      Alert.alert('Aucun produit', 'Aucun produit à exporter en PDF');
      return;
    }

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial; margin: 20px; }
            h1 { color: #F58320; text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #F58320; color: white; padding: 12px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
          </style>
        </head>
        <body>
          <h1>Liste des Produits</h1>
          <div>Date d'export: ${new Date().toLocaleDateString('fr-FR')}</div>
          <div>Nombre de produits: ${filteredProducts.length}</div>
          
          <table>
            <tr>
              <th>Nom</th>
              <th>Prix (FCFA)</th>
            </tr>
            ${filteredProducts.map(product => `
              <tr>
                <td>${product.name}</td>
                <td>${formatPrice(product.prices[0]?.price)}</td>
              </tr>
            `).join('')}
          </table>
          
          <div class="footer">
            Généré par MyApp - ${new Date().getFullYear()}
          </div>
        </body>
      </html>
    `;

    // Options d'impression
    const { uri } = await Print.printToFileAsync({ 
      html,
      width: 842,  // A4 width in pixels (72dpi)
      height: 595, // A4 height
      base64: false
    });

    // Option 1: Proposer le partage
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Exporter les produits',
        UTI: 'com.adobe.pdf'
      });
    } 
    // Option 2: Sauvegarder localement si le partage n'est pas disponible
    else {
      const pdfName = `Produits_${new Date().toISOString().slice(0,10)}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${pdfName}`;
      
      await FileSystem.copyAsync({ from: uri, to: newUri });
      Alert.alert(
        'PDF sauvegardé', 
        `Le fichier a été enregistré dans vos documents.`,
        [{ text: 'OK', onPress: () => console.log('OK Pressed') }]
      );
    }
    
  } catch (error) {
    console.error('Erreur PDF:', error);
    Alert.alert(
      'Erreur', 
      'Une erreur est survenue lors de la génération du PDF',
      [{ text: 'OK', onPress: () => console.log('OK Pressed') }]
    );
  } finally {
    setIsLoading(false);
  }
};

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F58320" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: '#F58320' }]}
          onPress={() => {
            setError(null);
            setIsLoading(true);
          }}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#F58320" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Liste de produits</Text>
        <TouchableOpacity onPress={generatePDF}>
          <Ionicons name="download-outline" size={24} color="#F58320" />
        </TouchableOpacity>
      </View>

      

      <TextInput
        style={[
          styles.searchInput, 
          { 
            backgroundColor: theme.background,
            color: theme.text,
            borderColor: theme.header.background
          }
        ]}
        placeholder="Rechercher un produit..."
        placeholderTextColor={theme.text}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <View ref={viewRef} style={styles.tableContainer}>
        {/* En-tête du tableau */}
        <View style={[styles.tableHeader, { backgroundColor: theme.header.background }]}>
          <Text style={[styles.headerCell, styles.nameCell, { color: theme.header.text }]}>Nom</Text>
          {/* <Text style={[styles.headerCell, styles.categoryCell, { color: theme.header.text }]}>Catégorie</Text> */}
          <Text style={[styles.headerCell, styles.priceCell, { color: theme.header.text }]}>Prix (FCFA)</Text>
          {/* <Text style={[styles.headerCell, styles.descCell, { color: theme.header.text }]}>Description</Text> */}
        </View>

        {/* Corps du tableau */}
        <ScrollView>
          {filteredProducts.map((product) => (
            <View 
              key={product.id} 
              style={[styles.tableRow, { backgroundColor: theme.background }]}
            >
              <Text style={[styles.cell, styles.nameCell, { color: theme.text }]} numberOfLines={2}>
                {product.name}
              </Text>
              {/* <Text style={[styles.cell, styles.categoryCell, { color: theme.text }]}>
                {product.category.name}
              </Text> */}
              <Text style={[styles.cell, styles.priceCell, { color: '#F58320' }]}>
                {formatPrice(product.prices[0]?.price)}
              </Text>
              {/* <Text style={[styles.cell, styles.descCell, { color: theme.text }]} numberOfLines={2}>
                {product.description || 'N/A'}
              </Text> */}
            </View>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity 
        style={styles.exportButton}
        onPress={generatePDF}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="download-outline" size={20} color="white" />
            <Text style={styles.exportButtonText}>Exporter PDF</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={[styles.resultsCount, { color: theme.text }]}>
        {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} trouvé{filteredProducts.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingVertical: 50,
  },

  exportButton: {
  flexDirection: 'row',
  backgroundColor: '#F58320',
  paddingVertical: 10,
  paddingHorizontal: 15,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 10,
},
exportButtonText: {
  color: 'white',
  marginLeft: 8,
  fontWeight: 'bold',
},

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  tableContainer: {
    flex: 1,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  cell: {
    fontSize: 14,
    paddingHorizontal: 4,
  },
  nameCell: {
    flex: 2,
  },
  categoryCell: {
    flex: 1,
  },
  priceCell: {
    flex: 1,
    textAlign: 'right',
  },
  descCell: {
    flex: 2,
  },
  resultsCount: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ProductListScreen;