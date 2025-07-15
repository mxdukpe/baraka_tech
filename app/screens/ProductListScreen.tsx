import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { getProducts, getProductsPage } from '../../services/apiService';
import { Product } from '../../services/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { captureRef } from 'react-native-view-shot';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

type ProductListScreenProps = {
  navigation: any;
};

const ProductListScreen: React.FC<ProductListScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);
  const viewRef = useRef(null);

  // Supprimez les variables inutilisées et gardez seulement allProducts
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
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
    const fetchAllProducts = async () => {
      console.log('Début du chargement des produits');
      if (!token) {
        console.log('Token non disponible');
        return;
      }

      try {
        setIsLoading(true);
        setLoadingError(null);
        
        let currentPage = 1;
        let hasMore = true;
        const products: Product[] = [];
        console.log('Initialisation chargement');

        while (hasMore) {
          try {
            // console.log(`Chargement page ${currentPage}`);
            const response = await getProductsPage(token, currentPage);
            // console.log('Réponse API:', response);
            
            if (!response.results || response.results.length === 0) {
              console.warn('Page vide reçue');
              break;
            }

            products.push(...response.results);
            hasMore = response.next !== null;
            currentPage++;

            // console.log(`${products.length} produits chargés`);
          } catch (error) {
            console.error(`Erreur page ${currentPage}:`, error);
            hasMore = false;
            throw error;
          }
        }

        console.log('Total produits chargés:', products.length);
        setAllProducts(products);
        
        // Vérifiez si les produits ont bien des prix
        console.log('Premier produit:', products[0]);
        
      } catch (error) {
        console.error('Erreur globale:', error);
        setLoadingError('Échec du chargement des produits');
        setError('Échec du chargement des produits');
      } finally {
        console.log('Chargement terminé');
        setIsLoading(false);
      }
    };

    fetchAllProducts();
  }, [token]);

  // Correction : filtrer allProducts au lieu de products
  const filteredProducts = allProducts.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPrice = (price: string) => {
    return parseInt(price).toLocaleString('fr-FR');
  };

  const generatePDF = async () => {
    try {
      setIsLoading(true);
      
      // Utilisez filteredProducts pour respecter la recherche
      const productsToExport = searchQuery ? filteredProducts : allProducts;
      
      console.log('Produits à exporter:', productsToExport.length);
      
      if (productsToExport.length === 0) {
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
            <div>Nombre de produits: ${productsToExport.length}</div>
            
            <table>
              <tr>
                <th>Nom</th>
                <th>Prix (FCFA)</th>
              </tr>
              ${productsToExport.map(product => {
                // Vérification de sécurité pour les prix
                const price = product.prices && product.prices.length > 0 
                  ? product.prices[0].price 
                  : '0';
                
                return `
                  <tr>
                    <td>${product.name || 'Nom non disponible'}</td>
                    <td>${formatPrice(price)}</td>
                  </tr>
                `;
              }).join('')}
            </table>
            
            <div class="footer">
              Généré par BARAKA - ${new Date().getFullYear()}
            </div>
          </body>
        </html>
      `;

      console.log('HTML généré, longueur:', html.length);

      const { uri } = await Print.printToFileAsync({ 
        html,
        width: 842,
        height: 595,
        base64: false
      });

      console.log('PDF généré à:', uri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Exporter les produits',
          UTI: 'com.adobe.pdf'
        });
      } else {
        const pdfName = `Produits_${new Date().toISOString().slice(0,10)}.pdf`;
        const newUri = `${FileSystem.documentDirectory}${pdfName}`;
        
        await FileSystem.copyAsync({ from: uri, to: newUri });
        Alert.alert(
          'PDF sauvegardé', 
          `Le fichier a été enregistré dans vos documents.`
        );
      }
      
    } catch (error) {
      console.error('Erreur PDF:', error);
      Alert.alert(
        'Erreur', 
        'Une erreur est survenue lors de la génération du PDF'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F58320" />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Chargement des produits...
        </Text>
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
        <View style={[styles.tableHeader, { backgroundColor: theme.header.background }]}>
          <Text style={[styles.headerCell, styles.nameCell, { color: theme.header.text }]}>Nom</Text>
          <Text style={[styles.headerCell, styles.priceCell, { color: theme.header.text }]}>Prix</Text>
        </View>

        <ScrollView>
          {filteredProducts.map((product) => (
            <View 
              key={product.id} 
              style={[styles.tableRow, { backgroundColor: theme.background }]}
            >
              <Text style={[styles.cell, styles.nameCell, { color: theme.text }]} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={[styles.cell, styles.priceCell, { color: '#F58320' }]}>
                {product.prices && product.prices.length > 0 
                  ? formatPrice(product.prices[0].price) 
                  : 'N/A'
                } FCFA
              </Text>
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
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
  priceCell: {
    flex: 1,
    textAlign: 'right',
  },
  resultsCount: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ProductListScreen;