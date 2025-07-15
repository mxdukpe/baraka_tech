/**
 * Ce fichier définit l'écran de partage en lot de produits amélioré avec intégration d'images.
 * Il permet de sélectionner plusieurs produits, modifier leurs prix et les partager avec images.
 *
 * @module BulkUploadScreen
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    FlatList, 
    StyleSheet, 
    SafeAreaView,
    ScrollView,
    Share,
    Alert,
    Modal,
    TextInput,
    Image,
    ActivityIndicator,
    Dimensions,
    Linking,
    Platform
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { getProductsPage } from '../../services/apiService';
import { Product } from '../../services/types';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
// import { captureRef } from 'react-native-view-shot';

type SearchScreenProps = {
    navigation: any;
};

const { width: screenWidth } = Dimensions.get('window');
const { width, height } = Dimensions.get('window');


const BulkUploadScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [token, setToken] = useState<string | null>(null);
    const [customPrices, setCustomPrices] = useState<Record<string, string>>({});
    
    // États pour la modal de partage
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [shareWithPrice, setShareWithPrice] = useState(true);
    const [shareWithDescription, setShareWithDescription] = useState(true);
    const [shareWithImage, setShareWithImage] = useState(true);
    const [useCustomPrice, setUseCustomPrice] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [shareMethod, setShareMethod] = useState<'whatsapp' | 'general'>('general');
    const [isProcessingImages, setIsProcessingImages] = useState(false);
    
    // États pour la sélection
    const [selectAll, setSelectAll] = useState(false);

    // Référence pour la capture de vue
    const shareViewRef = useRef<View>(null);

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
            if (!token) return;

            try {
                setIsLoading(true);
                setError(null);
                
                let currentPage = 1;
                let hasMore = true;
                const products: Product[] = [];

                while (hasMore) {
                    try {
                        const response = await getProductsPage(token, currentPage);
                        
                        if (!response.results || response.results.length === 0) {
                            break;
                        }

                        products.push(...response.results);
                        hasMore = response.next !== null;
                        currentPage++;
                    } catch (error) {
                        console.error(`Erreur page ${currentPage}:`, error);
                        hasMore = false;
                        throw error;
                    }
                }

                setAllProducts(products);
                setFilteredProducts(products);
                
                // Initialiser les prix personnalisés
                const initialPrices: Record<string, string> = {};
                products.forEach(product => {
                    if (product.prices && product.prices.length > 0) {
                        initialPrices[product.id] = product.prices[0].price;
                    }
                });
                setCustomPrices(initialPrices);
                
            } catch (error) {
                console.error('Erreur globale:', error);
                setError('Échec du chargement des produits');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllProducts();
    }, [token]);

    // Filtrage des produits par recherche
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredProducts(allProducts);
        } else {
            const filtered = allProducts.filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            setFilteredProducts(filtered);
        }
    }, [searchQuery, allProducts]);

    const formatPrice = (price: string) => {
        return parseInt(price).toLocaleString('fr-FR');
    };

    const toggleProductSelection = (productId: string) => {
        setSelectedProducts((prevSelected) => {
            const newSelected = prevSelected.includes(productId)
                ? prevSelected.filter((id) => id !== productId)
                : [...prevSelected, productId];
            
            // Mettre à jour l'état selectAll
            setSelectAll(newSelected.length === filteredProducts.length);
            
            return newSelected;
        });
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(filteredProducts.map(product => product.id.toString()));
        }
        setSelectAll(!selectAll);
    };

    const updateCustomPrice = (productId: string, newPrice: string) => {
        setCustomPrices(prev => ({
            ...prev,
            [productId]: newPrice
        }));
    };

    const getSelectedProductsData = () => {
        return selectedProducts.map(id => {
            const product = allProducts.find(p => p.id.toString() === id);
            if (!product) return null;
            
            const originalPrice = product.prices && product.prices.length > 0 
                ? product.prices[0].price 
                : '0';
            const customPrice = customPrices[id] || originalPrice;
            
            return {
                ...product,
                originalPrice,
                customPrice
            };
        }).filter(Boolean);
    };

    // Fonction pour télécharger une image depuis une URL
    const downloadImage = async (imageUrl: string, filename: string) => {
        try {
            const fileUri = FileSystem.documentDirectory + filename;
            const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
            
            if (downloadResult.status === 200) {
                return downloadResult.uri;
            }
            return null;
        } catch (error) {
            console.error('Erreur lors du téléchargement de l\'image:', error);
            return null;
        }
    };

    // Fonction pour préparer les images pour le partage
    const prepareImagesForSharing = async (selectedProductsData: any[]) => {
        const imageUris: string[] = [];
        
        for (const product of selectedProductsData) {
            if (product?.images?.[0]?.image) {
                const imageUrl = `https://backend.barakasn.com${product.images[0].image}`;
                const filename = `product_${product.id}_${Date.now()}.jpg`;
                
                const localUri = await downloadImage(imageUrl, filename);
                if (localUri) {
                    imageUris.push(localUri);
                }
            }
        }
        
        return imageUris;
    };

    // Fonction pour créer une image composite avec les informations des produits
    const createProductCard = (product: any) => {
        const priceToUse = useCustomPrice ? product.customPrice : product.originalPrice;
        
        return (
            <View style={styles.shareProductCard} key={product.id}>
                <View style={styles.shareProductHeader}>
                    <Text style={styles.shareProductName}>{product.name}</Text>
                    {shareWithPrice && (
                        <Text style={styles.shareProductPrice}>
                            {formatPrice(priceToUse)} FCFA
                        </Text>
                    )}
                </View>
                
                {shareWithImage && product.images?.[0]?.image && (
                    <Image
                        source={{ uri: `https://backend.barakasn.com${product.images[0].image}` }}
                        style={styles.shareProductImage}
                        resizeMode="contain"
                    />
                )}
                
                {shareWithDescription && product.description && (
                    <Text style={styles.shareProductDescription}>
                        {product.description}
                    </Text>
                )}
                
                <View style={styles.shareProductFooter}>
                    <Text style={styles.shareProductContact}>
                        📱 Contactez-nous pour commander
                    </Text>
                </View>
            </View>
        );
    };

    // Fonction pour créer une vue composite de tous les produits sélectionnés
    const createCompositeShareView = (selectedProductsData: any[]) => {
        return (
            <View style={styles.compositeShareView}>
                <View style={styles.shareHeader}>
                    <Text style={styles.shareHeaderTitle}>Nos Produits</Text>
                    <Text style={styles.shareHeaderSubtitle}>
                        {selectedProductsData.length} produit(s) sélectionné(s)
                    </Text>
                </View>
                
                <ScrollView style={styles.shareProductsList}>
                    {selectedProductsData.map((product, index) => {
                        if (!product) return null;
                        return createProductCard(product);
                    })}
                </ScrollView>
                
                <View style={styles.shareFooter}>
                    <Text style={styles.shareFooterText}>
                        🛒 Commandez maintenant !
                    </Text>
                </View>
            </View>
        );
    };

    const generateShareMessage = () => {
        const selectedProductsData = getSelectedProductsData();
        
        if (selectedProductsData.length === 0) return '';

        let message = `🛍️ Découvrez nos produits :\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        selectedProductsData.forEach((product, index) => {
            if (!product) return;
            message += `${index + 1}. *${product.name}*\n`;
            
            if (shareWithPrice) {
                const priceToUse = useCustomPrice ? product.customPrice : product.originalPrice;
                message += `   💰 Prix: ${formatPrice(priceToUse)} FCFA\n`;
            }
            
            if (shareWithDescription && product.description) {
                message += `   📝 ${product.description.substring(0, 100)}${product.description.length > 100 ? '...' : ''}\n`;
            }
            
            message += `\n`;
        });
        
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `📱 *Contactez-nous pour plus d'informations !*\n`;
        message += `🛒 *Commandez maintenant !*`;
        
        return message;
    };

    // Fonction pour partager avec images et données combinées
    const shareWithCombinedData = async () => {
        const selectedProductsData = getSelectedProductsData();
        const message = generateShareMessage();
        
        try {
            if (shareWithImage) {
                setIsProcessingImages(true);
                
                // Méthode 1: Partager les images individuellement avec leurs informations
                if (shareMethod === 'whatsapp') {
                    // Pour WhatsApp, envoyer chaque produit individuellement
                    for (const product of selectedProductsData) {
                        if (!product) continue;
                        
                        const priceToUse = useCustomPrice ? product.customPrice : product.originalPrice;
                        let productMessage = `🛍️ *${product.name}*\n`;
                        
                        if (shareWithPrice) {
                            productMessage += `💰 Prix: ${formatPrice(priceToUse)} FCFA\n`;
                        }
                        
                        if (shareWithDescription && product.description) {
                            productMessage += `📝 ${product.description}\n`;
                        }
                        
                        productMessage += `\n📱 Contactez-nous pour commander !`;
                        
                        if (product.images?.[0]?.image) {
                            const imageUrl = `https://backend.barakasn.com${product.images[0].image}`;
                            const filename = `product_${product.id}_${Date.now()}.jpg`;
                            const localUri = await downloadImage(imageUrl, filename);
                            
                            if (localUri) {
                                await shareViaWhatsApp(productMessage, localUri);
                                // Attendre un peu entre chaque partage
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        } else {
                            await shareViaWhatsApp(productMessage);
                        }
                    }
                } else {
                    // Pour le partage général, créer une image composite
                    const imageUris = await prepareImagesForSharing(selectedProductsData);
                    
                    if (imageUris.length > 0) {
                        // Partager la première image avec le message complet
                        await Share.share({
                            message: message,
                            url: imageUris[0],
                            title: `Partage de ${selectedProducts.length} produit(s)`
                        });
                        
                        // Partager les autres images si disponibles
                        if (imageUris.length > 1) {
                            for (let i = 1; i < imageUris.length; i++) {
                                await Share.share({
                                    url: imageUris[i],
                                    title: `Produit ${i + 1}`
                                });
                            }
                        }
                    } else {
                        // Pas d'image disponible, partager seulement le texte
                        await Share.share({
                            message: message,
                            title: `Partage de ${selectedProducts.length} produit(s)`
                        });
                    }
                }
                
                setIsProcessingImages(false);
            } else {
                // Partager seulement le texte
                await Share.share({
                    message: message,
                    title: `Partage de ${selectedProducts.length} produit(s)`
                });
            }
            
        } catch (error) {
            console.error('Erreur lors du partage:', error);
            throw error;
        }
    };

    const handleShare = async () => {
        if (selectedProducts.length === 0) {
            Alert.alert('Attention', 'Veuillez sélectionner au moins un produit à partager.');
            return;
        }

        setIsSharing(true);
        
        try {
            await shareWithCombinedData();
            setShareModalVisible(false);
            
        } catch (error) {
            console.error('Erreur lors du partage:', error);
            Alert.alert('Erreur', 'Impossible de partager les produits.');
        } finally {
            setIsSharing(false);
            setIsProcessingImages(false);
        }
    };

    const shareViaWhatsApp = async (message: string, imageUri?: string) => {
        try {
            if (imageUri && await Sharing.isAvailableAsync()) {
                // Partager avec image via Expo Sharing
                await Sharing.shareAsync(imageUri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: 'Partager via WhatsApp',
                    UTI: 'public.jpeg'
                });
                
                // Ensuite partager le message texte
                const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
                await Linking.openURL(whatsappUrl);
            } else {
                // Partager seulement le texte via WhatsApp
                const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
                await Linking.openURL(whatsappUrl);
            }
        } catch (error) {
            console.error('Erreur WhatsApp:', error);
            // Fallback vers le partage général
            await Share.share({ message });
        }
    };

    const openShareModal = () => {
        if (selectedProducts.length === 0) {
            Alert.alert('Attention', 'Veuillez sélectionner au moins un produit à partager.');
            return;
        }
        setShareModalVisible(true);
    };

    const renderShareModal = () => {
        const selectedProductsData = getSelectedProductsData();
        
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={shareModalVisible}
                onRequestClose={() => setShareModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>
                                Partager les produits
                            </Text>
                            <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {/* Méthode de partage */}
                            <View style={styles.shareMethodSection}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                                    Méthode de partage
                                </Text>
                                
                                <TouchableOpacity 
                                    style={[styles.methodButton, shareMethod === 'general' && styles.selectedMethod]}
                                    onPress={() => setShareMethod('general')}
                                >
                                    <Ionicons name="share" size={20} color={shareMethod === 'general' ? '#F58320' : theme.text} />
                                    <Text style={[styles.methodText, { color: shareMethod === 'general' ? '#F58320' : theme.text }]}>
                                        Partage général
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.methodButton, shareMethod === 'whatsapp' && styles.selectedMethod]}
                                    onPress={() => setShareMethod('whatsapp')}
                                >
                                    <Ionicons name="logo-whatsapp" size={20} color={shareMethod === 'whatsapp' ? '#F58320' : theme.text} />
                                    <Text style={[styles.methodText, { color: shareMethod === 'whatsapp' ? '#F58320' : theme.text }]}>
                                        WhatsApp (produit par produit)
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Options de partage */}
                            <View style={styles.shareOptions}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                                    Options de partage
                                </Text>
                                
                                <TouchableOpacity 
                                    style={styles.optionRow}
                                    onPress={() => setShareWithPrice(!shareWithPrice)}
                                >
                                    <Ionicons 
                                        name={shareWithPrice ? "checkbox" : "square-outline"} 
                                        size={20} 
                                        color="#F58320" 
                                    />
                                    <Text style={[styles.optionText, { color: theme.text }]}>
                                        Inclure les prix
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.optionRow}
                                    onPress={() => setShareWithDescription(!shareWithDescription)}
                                >
                                    <Ionicons 
                                        name={shareWithDescription ? "checkbox" : "square-outline"} 
                                        size={20} 
                                        color="#F58320" 
                                    />
                                    <Text style={[styles.optionText, { color: theme.text }]}>
                                        Inclure les descriptions
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.optionRow}
                                    onPress={() => setShareWithImage(!shareWithImage)}
                                >
                                    <Ionicons 
                                        name={shareWithImage ? "checkbox" : "square-outline"} 
                                        size={20} 
                                        color="#F58320" 
                                    />
                                    <Text style={[styles.optionText, { color: theme.text }]}>
                                        Inclure les images
                                    </Text>
                                </TouchableOpacity>

                                {shareWithPrice && (
                                    <TouchableOpacity 
                                        style={styles.optionRow}
                                        onPress={() => setUseCustomPrice(!useCustomPrice)}
                                    >
                                        <Ionicons 
                                            name={useCustomPrice ? "checkbox" : "square-outline"} 
                                            size={20} 
                                            color="#F58320" 
                                        />
                                        <Text style={[styles.optionText, { color: theme.text }]}>
                                            Utiliser des prix personnalisés
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Liste des produits sélectionnés */}
                            <View style={styles.selectedProductsList}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                                    Produits sélectionnés ({selectedProductsData.length})
                                </Text>
                                
                                {selectedProductsData.map((product) => 
                                    product && (
                                        <View key={product.id} style={[styles.selectedProductItem, { backgroundColor: theme.background, borderColor: theme.text + '20' }]}>
                                            <View style={styles.selectedProductHeader}>
                                                {shareWithImage && product.images?.[0]?.image && (
                                                    <Image
                                                        source={{ uri: `https://backend.barakasn.com${product.images[0].image}` }}
                                                        style={styles.selectedProductImage}
                                                        resizeMode="contain"
                                                    />
                                                )}
                                                <View style={styles.selectedProductInfo}>
                                                    <Text style={[styles.selectedProductName, { color: theme.text }]} numberOfLines={2}>
                                                        {product.name}
                                                    </Text>
                                                    <Text style={[styles.originalPrice, { color: '#666' }]}>
                                                        Prix original: {formatPrice(product.originalPrice)} FCFA
                                                    </Text>
                                                </View>
                                            </View>
                                            
                                            {shareWithPrice && useCustomPrice && (
                                                <View style={styles.priceInput}>
                                                    <TextInput
                                                        style={[styles.customPriceInput, { color: theme.text, borderColor: theme.text + '40' }]}
                                                        value={customPrices[product.id] || ''}
                                                        onChangeText={(text) => updateCustomPrice(product.id.toString(), text)}
                                                        placeholder="Prix personnalisé"
                                                        keyboardType="numeric"
                                                        placeholderTextColor={theme.text + '60'}
                                                    />
                                                    <Text style={[styles.currencyLabel, { color: theme.text }]}>FCFA</Text>
                                                </View>
                                            )}
                                        </View>
                                    )
                                )}
                            </View>

                            {/* Aperçu du message */}
                            <View style={styles.previewSection}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                                    Aperçu du message
                                </Text>
                                <ScrollView style={[styles.previewBox, { backgroundColor: theme.background, borderColor: theme.text + '20' }]}>
                                    <Text style={[styles.previewText, { color: theme.text }]}>
                                        {generateShareMessage()}
                                    </Text>
                                </ScrollView>
                            </View>

                            {/* Indicateur de traitement des images */}
                            {isProcessingImages && (
                                <View style={styles.processingIndicator}>
                                    <ActivityIndicator size="small" color="#F58320" />
                                    <Text style={[styles.processingText, { color: theme.text }]}>
                                        Préparation des images...
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={[styles.cancelButton, { borderColor: theme.text + '40' }]}
                                onPress={() => setShareModalVisible(false)}
                            >
                                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                                    Annuler
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.shareButton, (isSharing || isProcessingImages) && styles.disabledButton]}
                                onPress={handleShare}
                                disabled={isSharing || isProcessingImages}
                            >
                                {isSharing || isProcessingImages ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Ionicons name="share" size={20} color="white" />
                                )}
                                <Text style={styles.shareButtonText}>
                                    {isProcessingImages ? 'Préparation...' : isSharing ? 'Partage...' : 'Partager'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderProduct = ({ item }: { item: Product }) => {
        const isSelected = selectedProducts.includes(item.id.toString());
        const originalPrice = item.prices && item.prices.length > 0 ? item.prices[0].price : '0';
        const productImage = item.images?.[0]?.image;

        return (
            <TouchableOpacity 
                style={[
                    styles.productCard,
                    { backgroundColor: theme.background },
                    isSelected && styles.selectedProductCard
                ]}
                onPress={() => toggleProductSelection(item.id.toString())}
            >
                <View style={styles.productContent}>
                    <View style={styles.productHeader}>
                        {productImage && (
                            <Image
                                source={{ uri: `https://backend.barakasn.com${productImage}` }}
                                style={styles.productImage}
                                resizeMode="contain"
                            />
                        )}
                        
                        <View style={styles.productInfo}>
                            <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
                                {item.name}
                            </Text>
                            <Text style={[styles.productPrice, { color: '#F58320' }]}>
                                {formatPrice(originalPrice)} FCFA
                            </Text>
                            {item.description && (
                                <Text style={[styles.productDescription, { color: theme.text + '80' }]} numberOfLines={2}>
                                    {item.description}
                                </Text>
                            )}
                        </View>
                        
                        <View style={styles.selectionIndicator}>
                            {isSelected ? (
                                <Ionicons name="checkbox" size={24} color="#4CAF50" />
                            ) : (
                                <Ionicons name="square-outline" size={24} color="#ccc" />
                            )}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
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
                    style={styles.retryButton}
                    onPress={() => window.location.reload()}
                >
                    <Text style={styles.retryButtonText}>Réessayer</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={28} color="#F58320" />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                    Sélection multiple
                </Text>
                <View style={styles.headerRight}>
                    <Text style={[styles.selectedCount, { color: 'white' }]}>
                        {selectedProducts.length}
                    </Text>
                </View>
            </View>

            {/* Barre de recherche */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Rechercher des produits..."
                    placeholderTextColor="#666"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#666" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Boutons d'action */}
            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={[styles.selectAllButton, { borderColor: theme.text + '40' }]}
                    onPress={toggleSelectAll}
                >
                    <Ionicons 
                        name={selectAll ? "checkbox" : "square-outline"} 
                        size={20} 
                        color="#F58320" 
                    />
                    <Text style={[styles.selectAllText, { color: theme.text }]}>
                        {selectAll ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.clearButton, { borderColor: '#ff4444' }]}
                    onPress={() => {
                        setSelectedProducts([]);
                        setSelectAll(false);
                    }}
                    disabled={selectedProducts.length === 0}
                >
                    <Ionicons name="trash" size={20} color="#ff4444" />
                    <Text style={[styles.clearButtonText, { color: '#ff4444' }]}>
                        Effacer
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredProducts}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.productList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: theme.text }]}>
                            {searchQuery ? 'Aucun produit trouvé' : 'Aucun produit disponible'}
                        </Text>
                    </View>
                }
            />

            <TouchableOpacity 
                style={[
                    styles.shareActionButton,
                    selectedProducts.length === 0 && styles.disabledButton
                ]}
                onPress={openShareModal}
                disabled={selectedProducts.length === 0}
            >
                <Ionicons name="share" size={20} color="white" />
                <Text style={styles.shareActionButtonText}>
                    Partager ({selectedProducts.length})
                </Text>
            </TouchableOpacity>

            {renderShareModal()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        paddingTop: 50,
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
        textAlign: 'center',
        marginBottom: 20,
    },// Indicateur de traitement des images
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF5E6',
    borderRadius: 8,
    marginVertical: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F58320',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  processingText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    textAlign: 'center',
  },// En-tête du produit sélectionné
  selectedProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  
  selectedProductImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
    retryButton: {
        backgroundColor: '#F58320',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerRight: {
        backgroundColor: '#F58320',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedCount: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginBottom: 15,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    selectAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        flex: 1,
        marginRight: 10,
        justifyContent: 'center',
    },
    selectAllText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        justifyContent: 'center',
    },
    clearButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
    },
    productList: {
        paddingBottom: 100,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
    productCard: {
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedProductCard: {
        borderColor: '#4CAF50',
        backgroundColor: '#E8F5E8',
    },
    productContent: {
        flex: 1,
    },
    productHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    productImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 15,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 5,
    },
    productPrice: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 5,
    },
    productDescription: {
        fontSize: 12,
        lineHeight: 16,
    },
    selectionIndicator: {
        marginLeft: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shareActionButton: {
        backgroundColor: '#F58320',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 12,
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    shareActionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    // Styles pour la modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxHeight: '80%',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    shareCard: {
        width: 300,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    shareImage: {
        width: 200,
        height: 200,
        marginBottom: 15,
    },
    shareTextContainer: {
        marginBottom: 15,
        alignItems: 'center',
    },
    shareTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    shareDescription: {
        fontSize: 14,
        marginBottom: 12,
        textAlign: 'center',
    },
    sharePrice: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    logo: {
        width: 30,
        height: 30,
        marginRight: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalBody: {
        maxHeight: '70%',
    },
    shareOptions: {
        marginBottom: 20,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    optionText: {
        fontSize: 16,
        marginLeft: 10,
    },
    selectedProductsList: {
        marginBottom: 20,
    },
    selectedProductItem: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
    },
    selectedProductInfo: {
        marginBottom: 8,
    },
    selectedProductName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    originalPrice: {
        fontSize: 12,
    },
    priceInput: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    customPriceInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
    },
    currencyLabel: {
        marginLeft: 8,
        fontSize: 14,
    },
    previewSection: {
        marginBottom: 20,
    },
    previewBox: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
    },
    previewText: {
        fontSize: 14,
        lineHeight: 20,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    cancelButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginRight: 10,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    shareButton: {
        flex: 1,
        backgroundColor: '#F58320',
        borderRadius: 8,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    shareButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },

    
  imageContainer: {
    width: screenWidth - 40, // Largeur de l'écran moins les paddings
    height: 300,
    // backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  
  imageScrollView: {
    width: '100%',
    height: '100%',
  },

  
  // Conteneur des indicateurs de pagination
  pagination: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Style des points de pagination
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: '#ccc',
  },
  
  // Conteneur du compteur d'images
  imageCounter: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  // Texte du compteur d'images
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  shareModalButton: {
    flex: 1,
    backgroundColor: '#F58320',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    minHeight: 50,
  },
  shareModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },


  shareMethodSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'left',
  },
  
  shareMethodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  
  shareMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  
  shareMethodButtonActive: {
    backgroundColor: '#F58320',
    borderColor: '#F58320',
  },
  
  shareMethodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  
  shareMethodButtonTextActive: {
    color: '#FFFFFF',
  },methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    minHeight: 48,
  },
  
  selectedMethod: {
    borderColor: '#F58320',
    backgroundColor: '#FFF8F4',
  },
  
  methodText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  shareView: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    
    shareHeader: {
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#F58320',
        paddingBottom: 15,
    },
    
    shareHeaderTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F58320',
        marginBottom: 5,
    },
    
    shareHeaderSubtitle: {
        fontSize: 16,
        color: '#666',
    },
    
    shareProductsList: {
        marginBottom: 20,
    },
    
    shareProductItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        padding: 12,
        backgroundColor: '#F8F8F8',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#F58320',
    },
    
    shareProductNumber: {
        backgroundColor: '#F58320',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    
    shareProductNumberText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    
    shareProductImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    
    shareProductInfo: {
        flex: 1,
    },
    
    shareProductName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    
    shareProductPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F58320',
        marginBottom: 4,
    },
    
    shareProductDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 18,
    },
    
    shareFooter: {
        alignItems: 'center',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    
    shareFooterText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 5,
        textAlign: 'center',
    },
    
    previewImageContainer: {
        backgroundColor: '#F0F0F0',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
    },
    
    hiddenCaptureView: {
        position: 'absolute',
        top: -9999,
        left: -9999,
        opacity: 0,
    },
    // Styles pour shareProductCard
  shareProductCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  
  shareProductCardImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  
  shareProductCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 24,
  },
  
  shareProductCardPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E7D32',
    marginBottom: 12,
  },
  
  shareProductCardDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },

  // Styles pour shareProductHeader
  shareProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  
  shareProductHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
  },
  
  shareProductHeaderButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  shareProductHeaderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  
  shareProductHeaderLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  // Styles pour shareProductFooter
  shareProductFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  
  shareProductFooterButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  
  shareProductFooterButtonSecondary: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  
  shareProductFooterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  shareProductFooterButtonTextSecondary: {
    color: '#2196F3',
  },
  
  shareProductFooterIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  
  shareProductFooterSocialButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  shareProductFooterSocialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  // Styles pour shareProductContact
  shareProductContact: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  
  shareProductContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  shareProductContactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#E8E8E8',
  },
  
  shareProductContactInfo: {
    flex: 1,
  },
  
  shareProductContactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  
  shareProductContactTitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  
  shareProductContactRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  shareProductContactRatingText: {
    fontSize: 12,
    color: '#888888',
    marginLeft: 4,
  },
  
  shareProductContactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  
  shareProductContactButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  shareProductContactButtonSecondary: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  
  shareProductContactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  shareProductContactButtonTextSecondary: {
    color: '#2196F3',
  },
  
  shareProductContactBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  
  shareProductContactBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Styles pour compositeShareView
  compositeShareView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  
  compositeShareViewContainer: {
    flex: 1,
    paddingTop: 20,
  },
  
  compositeShareViewContent: {
    flex: 1,
    paddingBottom: 20,
  },
  
  compositeShareViewScrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  
  compositeShareViewSection: {
    marginBottom: 20,
  },
  
  compositeShareViewSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  
  compositeShareViewDivider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 20,
    marginHorizontal: 16,
  },
  
  compositeShareViewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  compositeShareViewModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: width * 0.9,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  
  compositeShareViewModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  
  compositeShareViewModalContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  
  compositeShareViewModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  
  compositeShareViewModalButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  compositeShareViewModalButtonSecondary: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  
  compositeShareViewModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  compositeShareViewModalButtonTextSecondary: {
    color: '#2196F3',
  },
  
  compositeShareViewFloatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  
  compositeShareViewFloatingButtonIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
});

export default BulkUploadScreen;