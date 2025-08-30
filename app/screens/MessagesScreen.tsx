import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  TouchableWithoutFeedback,
  ImageBackground,
  Switch,
  Dimensions,
  Platform, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import { Icon, Badge } from 'react-native-elements';
import { useCart } from './useCart';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import { Product, Order, OrderItem } from '../../services/types';
import HeaderComponent from './HeaderComponent';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';

interface Message {
  id: number;
  title: string;
  message: string;
  created_at: string;
}

// Fonction pour obtenir les dimensions responsives
const getResponsiveDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isLargeScreen = width >= 1024;
  const isLandscape = width > height;
  
  return {
    width,
    height,
    isTablet,
    isLargeScreen,
    isLandscape,
    isSmallScreen: width < 375,
    // Padding adaptatif
    horizontalPadding: isTablet ? 30 : 20,
    verticalPadding: isTablet ? 25 : 15,
    // Tailles d'éléments
    headerHeight: isTablet ? 80 : 60,
    // Tailles de police
    titleFontSize: isTablet ? 22 : 18,
    subtitleFontSize: isTablet ? 18 : 16,
    bodyFontSize: isTablet ? 16 : 14,
    captionFontSize: isTablet ? 14 : 12,
    // Espacements
    sectionSpacing: isTablet ? 35 : 25,
    itemSpacing: isTablet ? 20 : 15,
  };
};

const MessagesScreen: React.FC<{ navigation: any, route: any }> = ({ navigation, route }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [responsive, setResponsive] = useState(getResponsiveDimensions());
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  // État pour le flou de sécurité
  const [isAppInBackground, setIsAppInBackground] = useState(false);

  useEffect(() => {
    // Empêcher les captures d'écran
    const enableScreenshotProtection = async () => {
      try {
        await ScreenshotPrevent.enabled(true);
        console.log('Protection contre les captures d\'écran activée');
      } catch (error) {
        console.warn('Erreur activation protection captures:', error);
      }
    };

    // Désactiver la protection quand le composant est détruit
    const disableScreenshotProtection = async () => {
      try {
        await ScreenshotPrevent.enabled(false);
      } catch (error) {
        console.warn('Erreur désactivation protection captures:', error);
      }
    };

    enableScreenshotProtection();

    // Écouter les changements d'état de l'app
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      disableScreenshotProtection();
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App passe en arrière-plan - activer le flou
      setIsAppInBackground(true);
    } else if (nextAppState === 'active') {
      // App revient au premier plan - désactiver le flou
      setIsAppInBackground(false);
    }
  };

  // Écouter les changements de dimensions d'écran avec une clé unique
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
      setResponsive(getResponsiveDimensions());
    });

    return () => subscription?.remove();
  }, []);
  
  const { addedProduct } = route.params || {};
  const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const allCartItems = [...localCartItems, ...orders];
  
  const { loadCart } = useCart();
  const { cartItems, totalCartItems, saveCart } = useCart();

  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    const loadCartItems = async () => {
      try {
        const localCart = await AsyncStorage.getItem('local_cart');
        if (localCart) {
          const cartItems = JSON.parse(localCart);
          const totalItems = cartItems.reduce((total, order) => {
            return total + order.items.reduce((sum, item) => sum + item.quantity, 0);
          }, 0);
          setCartItemsCount(totalItems);
        }
      } catch (error) {
        console.warn('Erreur lors du chargement du panier:', error);
      }
    };

    loadCartItems();
  }, []);

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('access_token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  const fetchAllMessages = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await axios.get('https://backend.barakasn.com/api/v0/messages/messages/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      setMessages(response.data.results || []);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMessages();
  }, [token]);

  const handleMessagePress = (message: Message) => {
    setSelectedMessage(message);
  };

  const handleBackPress = () => {
    setSelectedMessage(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Aujourd'hui";
    if (diffDays === 2) return "Hier";
    if (diffDays <= 7) return `Il y a ${diffDays} jours`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderMessageItem = ({ item, index }: { item: Message, index: number }) => (
    <TouchableOpacity
      style={[
        styles.messageItem,
        { 
          backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
          marginHorizontal: responsive.horizontalPadding,
          marginBottom: responsive.itemSpacing,
        }
      ]}
      onPress={() => handleMessagePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.messageHeader}>
        <View style={[styles.messageIcon, { backgroundColor: `hsl(${(index * 137) % 360}, 60%, 85%)` }]}>
          <Ionicons 
            name="mail" 
            size={20} 
            color={`hsl(${(index * 137) % 360}, 60%, 40%)`} 
          />
        </View>
        <View style={styles.messageInfo}>
          <Text style={[
            styles.messageTitle,
            { 
              color: isDarkMode ? '#FFFFFF' : '#1A1A1A',
              fontSize: responsive.subtitleFontSize 
            }
          ]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[
            styles.messageDate,
            { 
              color: isDarkMode ? '#888' : '#666',
              fontSize: responsive.captionFontSize 
            }
          ]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={isDarkMode ? '#666' : '#CCC'} 
        />
      </View>
      
      <Text style={[
        styles.messagePreview,
        { 
          color: isDarkMode ? '#CCC' : '#666',
          fontSize: responsive.bodyFontSize 
        }
      ]} numberOfLines={2}>
        {item.message}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={[styles.emptyState, { paddingHorizontal: responsive.horizontalPadding }]}>
      <View style={[styles.emptyIconContainer, { backgroundColor: isDarkMode ? '#2A2A2A' : '#F8F9FA' }]}>
        <Ionicons 
          name="mail-outline" 
          size={60} 
          color={isDarkMode ? '#666' : '#CCC'} 
        />
      </View>
      <Text style={[
        styles.emptyTitle,
        { 
          color: isDarkMode ? '#FFFFFF' : '#1A1A1A',
          fontSize: responsive.titleFontSize 
        }
      ]}>
        Aucun message
      </Text>
      <Text style={[
        styles.emptyText,
        { 
          color: isDarkMode ? '#888' : '#666',
          fontSize: responsive.bodyFontSize 
        }
      ]}>
        Vous n'avez pas encore reçu de messages.{'\n'}
        Ils apparaîtront ici une fois disponibles.
      </Text>
    </View>
  );

  // Fonction pour gérer la navigation avec fermeture du menu
  const handleNavigation = (screenName: string) => {
    closeMenu();
    navigation.navigate(screenName);
  };

  const closeMenu = () => {
    if (menuVisible) {
      setMenuVisible(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#1A1A1A' : '#F8F9FA' }]}>
        <HeaderComponent 
          navigation={navigation}
          title="Messages"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F58320" />
          <Text style={[
            styles.loadingText,
            { 
              color: isDarkMode ? '#CCC' : '#666',
              fontSize: responsive.bodyFontSize 
            }
          ]}>
            Chargement des messages...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedMessage) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#1A1A1A' : '#F8F9FA' }]}>
        <StatusBar 
          barStyle={isDarkMode ? "light-content" : "dark-content"} 
          backgroundColor={isDarkMode ? '#1A1A1A' : '#F8F9FA'}
        />
        
        <View style={[
          styles.detailHeader,
          { 
            backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
            paddingHorizontal: responsive.horizontalPadding,
            paddingVertical: responsive.verticalPadding,
          }
        ]}>
          <TouchableOpacity 
            onPress={handleBackPress}
            style={styles.backButtonContainer}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#F58320" />
            <Text style={[styles.backButton, { fontSize: responsive.bodyFontSize }]}>
              Retour
            </Text>
          </TouchableOpacity>
          <Text style={[
            styles.detailHeaderTitle,
            { 
              color: isDarkMode ? '#FFFFFF' : '#1A1A1A',
              fontSize: responsive.titleFontSize 
            }
          ]}>
            Message
          </Text>
        </View>

        <ScrollView 
          style={[styles.detailContainer, { backgroundColor: isDarkMode ? '#1A1A1A' : '#F8F9FA' }]}
          contentContainerStyle={{ paddingHorizontal: responsive.horizontalPadding }}
        >
          <View style={[
            styles.detailCard,
            { 
              backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
              marginBottom: responsive.sectionSpacing,
            }
          ]}>
            <View style={styles.detailCardHeader}>
              <Text style={[
                styles.detailTitle,
                { 
                  color: isDarkMode ? '#FFFFFF' : '#1A1A1A',
                  fontSize: responsive.titleFontSize 
                }
              ]}>
                {selectedMessage.title}
              </Text>
              <Text style={[
                styles.detailDate,
                { 
                  color: isDarkMode ? '#888' : '#666',
                  fontSize: responsive.captionFontSize 
                }
              ]}>
                {formatDate(selectedMessage.created_at)}
              </Text>
            </View>
            
            <View style={styles.detailDivider} />
            
            <Text style={[
              styles.detailContent,
              { 
                color: isDarkMode ? '#CCC' : '#444',
                fontSize: responsive.bodyFontSize 
              }
            ]}>
              {selectedMessage.message}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#1A1A1A' : '#F8F9FA' }]}>
      {isAppInBackground && Platform.OS === 'ios' && (
              <BlurView
                style={styles.securityBlur}
                blurType="light"
                blurAmount={25}
                reducedTransparencyFallbackColor="white"
              />
            )}
      
            {isAppInBackground && Platform.OS === 'android' && (
              <View style={styles.securityOverlay} />
            )}
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? '#1A1A1A' : '#F8F9FA'}
      />
      
      {/* Header */}
      <HeaderComponent 
        navigation={navigation}
        title="Messages"
      />
      
      {/* Stats Header */}
      <View style={[
        styles.statsContainer,
        { 
          backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF',
          marginHorizontal: responsive.horizontalPadding,
          marginBottom: responsive.sectionSpacing,
        }
      ]}>
        <View style={styles.statsContent}>
          <View>
            <Text style={[
              styles.statsNumber,
              { 
                color: '#F58320',
                fontSize: responsive.titleFontSize 
              }
            ]}>
              {messages.length}
            </Text>
            <Text style={[
              styles.statsLabel,
              { 
                color: isDarkMode ? '#CCC' : '#666',
                fontSize: responsive.captionFontSize 
              }
            ]}>
              Message{messages.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <View style={[styles.statsIcon, { backgroundColor: 'rgba(245, 131, 32, 0.1)' }]}>
            <Ionicons name="mail" size={24} color="#F58320" />
          </View>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        key={`messages-${responsive.width}-${responsive.height}`} // Clé unique pour éviter les erreurs de rotation
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessageItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: responsive.sectionSpacing }
        ]}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: isDarkMode ? '#1A1A1A' : '#F8F9FA' }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },

  // Stats styles
  statsContainer: {
    marginTop: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  statsNumber: {
    fontWeight: '700',
    marginBottom: 4,
  },
  statsLabel: {
    fontWeight: '500',
  },
  statsIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // List styles
  listContainer: {
    flexGrow: 1,
  },
  
  // Message item styles
  messageItem: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  messageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageInfo: {
    flex: 1,
  },
  messageTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  messageDate: {
    fontWeight: '500',
  },
  messagePreview: {
    lineHeight: 20,
  },

  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
  },

  // Detail view styles
  detailHeader: {
    marginTop: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    color: '#F58320',
    fontWeight: '500',
    marginLeft: 8,
  },
  detailHeaderTitle: {
    fontWeight: '700',
  },
  
  detailContainer: {
    flex: 1,
    paddingTop: 20,
  },
  detailCard: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailCardHeader: {
    marginBottom: 16,
  },
  detailTitle: {
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 28,
  },
  detailDate: {
    fontWeight: '500',
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginBottom: 20,
  },
  detailContent: {
    lineHeight: 24,
  },

  // Legacy styles (pour compatibilité)
  headerText: {
    padding: 16,
    top: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    top: 50,
    fontSize: 20,
    fontWeight: 'bold',
  },
  messageCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  profileContainer: { 
    justifyContent: "center",
    alignItems: "center",
  },
  profileText: {
    fontWeight: "bold",
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon1Container: {
    position: 'relative',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  menuDropdown: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: Math.min(550, Dimensions.get('window').width * 0.85),
    zIndex: 1000,
  },
  menuHeader: {
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },
  menuHeaderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 3,
  },
  menuScrollContainer: {
    paddingBottom: 30,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  menuIcon: {
    marginRight: 15,
    width: 24,
  },
  menuItemText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
    fontWeight: '500',
  },
  menuSwitch: {
    position: 'relative',
    right: 300,
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }]
  },
  messageBadge: {
    position: 'relative',
    right: 300,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  messageBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '600',
  },securityBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },

  securityOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
});

export default MessagesScreen;