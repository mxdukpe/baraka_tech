
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, TouchableWithoutFeedback,
  Dimensions, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,ImageBackground,
  StatusBar, ScrollView, KeyboardAvoidingView, 
  Platform, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderWithCart from './HeaderWithCart';
import AuthService from './authService';
import { useCart } from './useCart';
import { Order, OrderItem } from '../../services/types';
import { Icon, Badge } from 'react-native-elements';
import HeaderComponent from './HeaderComponent';
import ScreenshotPrevent from 'react-native-screenshot-prevent';
import { BlurView } from '@react-native-community/blur';

type ProfileScreenProps = {
  navigation: any;
  route: any;
};

type UserProfile = {
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
};

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
    isSmallScreen: width < 375,productColumns: 2,
    categoryColumns: width > 600 ? (width > 900 ? 6 : 5) : 4,
    horizontalPadding: isTablet ? 30 : 20,
    verticalPadding: isTablet ? 25 : 15,
    iconSpacing: isLandscape ? 15 : (isTablet ? 25 : 20),
    cardWidth: isLargeScreen ? (width - 80) / 4 : isTablet ? (width - 70) / 3 : (width - 50) / 2,
    headerHeight: isTablet ? 80 : 60,
    bannerHeight: isTablet ? 200 : 180,
    productImageHeight: isTablet ? 150 : 120,
    categoryImageSize: isTablet ? 80 : 60,
    titleFontSize: isTablet ? 22 : 18,
    subtitleFontSize: isTablet ? 18 : 16,
    bodyFontSize: isTablet ? 16 : 14,
    captionFontSize: isTablet ? 14 : 12,
    sectionSpacing: isTablet ? 35 : 25,
    itemSpacing: isTablet ? 20 : 15,
  };
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, route }) => {
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isDarkMode, toggleTheme } = useTheme();
  const [showPrices, setShowPrices] = useState(true);
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [responsive, setResponsive] = useState(getResponsiveDimensions());
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));

  // Écouter les changements de dimensions d'écran
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
      setResponsive(getResponsiveDimensions());
    });

    return () => subscription?.remove();
  }, []);  const [menuVisible, setMenuVisible] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const { cartItems, totalCartItems, saveCart } = useCart();
  const [localCartItems, setLocalCartItems] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
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
    const fetchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) throw new Error('No authentication token');

        const response = await AuthService.apiRequest('https://backend.barakasn.com/api/v0/merchants/detail/', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone_number: data.phone_number || '',
          email: data.email || ''
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleContactSupport = () => {
    Alert.alert('Service Client', 'Profil au support@example.com');
  };

  const handleSaveProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) throw new Error('No authentication token');

      const response = await AuthService.apiRequest('https://backend.barakasn.com/api/v0/merchants/complete-profile/', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone_number: profile.phone_number,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } catch (err) {
      Alert.alert('Erreur', 'Échec de la mise à jour du profil');
      console.error(err);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          onPress: async () => {
            await AsyncStorage.removeItem('access_token');
            navigation.navigate('Login');
          },
          style: 'destructive',
        },
      ]
    );
  };

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
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F58320" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
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
      <View>
        {/* Barre des tâches fixe en haut */}
        <HeaderComponent 
          navigation={navigation}
          title="Profil"
          // showCart={false} // Optionnel: masquer l'icône panier
        />

        {/* Profile Form */}
        <ScrollView 
        contentContainerStyle={[styles.scrollContainer, { backgroundColor: theme.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Informations personnelles</Text>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Prénom:</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.input.background,
                  color: theme.input.text,
                  borderColor: theme.input.border,
                },
              ]}
              value={profile.first_name}
              onChangeText={(text) => setProfile({...profile, first_name: text})}
              placeholder="Entrez votre prénom"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Nom:</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.input.background,
                  color: theme.input.text,
                  borderColor: theme.input.border,
                },
              ]}
              value={profile.last_name}
              onChangeText={(text) => setProfile({...profile, last_name: text})}
              placeholder="Entrez votre nom"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Téléphone:</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.input.background,
                  color: theme.input.text,
                  borderColor: theme.input.border,
                },
              ]}
              value={profile.phone_number}
              onChangeText={(text) => setProfile({...profile, phone_number: text})}
              keyboardType="phone-pad"
              placeholder="Entrez votre numéro de téléphone"
            />
          </View>

          {/* <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Email:</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.disabled.background,
                  color: theme.disabled.text,
                  borderColor: theme.disabled.background,
                },
              ]}
              value={profile.email}
              editable={false}
              placeholder="Votre email"
            />
          </View> */}

          {/* <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#F58320' }]}
            onPress={handleSaveProfile}
          >
            <Text style={[styles.buttonText, { color: 'white' }]}>
              Sauvegarder les modifications
            </Text>
          </TouchableOpacity> */}

          {/* <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 30 }]}>Préférences</Text>
          
          <View style={styles.switchContainer}>
            <View style={styles.switchLabelContainer}>
              <Ionicons name="moon-outline" size={20} color={theme.text} style={styles.switchIcon} />
              <Text style={[styles.label, { color: theme.text }]}>Mode Sombre</Text>
            </View>
            <Switch 
              value={isDarkMode} 
              onValueChange={toggleTheme}
              thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
            />
          </View> */}

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.button.background, marginTop: 15 }]}
            onPress={handleContactSupport}
          >
            <Text style={[styles.buttonText, { color: theme.button.text }]}>
              Contacter le service client
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: '#FF3B30', marginTop: 15 }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="white" />
            <Text style={styles.logoutButtonText}>
              Déconnexion
            </Text>
          </TouchableOpacity>
        </View></ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingVertical: 50,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 10,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchIcon: {
    marginRight: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Menu avec image de fond
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
    height: '100%', // Utilise 100% de la hauteur de l'écran
    width: Math.min(550, Dimensions.get('window').width * 0.85), // Largeur adaptive
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
    // borderBottomWidth: 1,
    // borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    // width: 50,
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

export default ProfileScreen;