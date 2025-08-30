/**
 * Ce fichier définit l'écran d'accueil de l'application adaptatif.
 * Il s'adapte automatiquement aux différentes tailles d'écran.
 *
 * @module HeaderWithCart
 */


import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, 
  StyleSheet, Text, Dimensions, TouchableWithoutFeedback, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from 'react-native-elements';
import { useCart } from './useCart';
import { useTheme } from '../appearence/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';

// Fonction pour obtenir les dimensions responsives
const getResponsiveDimensions = () => {
  const { width, height } = Dimensions.get('window');
  const isTablet = width >= 768;
  const isLargeScreen = width >= 1024;
  
  return {
    width,
    height,
    isTablet,
    isLargeScreen,
    isSmallScreen: width < 375,
    // Colonnes adaptatives - ajustez en fonction de la largeurproductColumns: 2,
    categoryColumns: width > 600 ? (width > 900 ? 6 : 5) : 4,
    // Padding adaptatif
    horizontalPadding: isTablet ? 30 : 20,
    verticalPadding: isTablet ? 25 : 15,
    // Tailles d'éléments
    cardWidth: isLargeScreen ? (width - 80) / 4 : isTablet ? (width - 70) / 3 : (width - 50) / 2,
    headerHeight: isTablet ? 80 : 60,
    bannerHeight: isTablet ? 200 : 180,
    productImageHeight: isTablet ? 150 : 120,
    categoryImageSize: isTablet ? 80 : 60,
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


const HeaderWithCart: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { totalCartItems } = useCart(); // Récupère le nombre d'articles
    const responsive = getResponsiveDimensions();
    const { isDarkMode, toggleTheme } = useTheme();
    const [showPrices, setShowPrices] = useState(true);
    const theme = isDarkMode ? darkTheme : lightTheme;
    const [menuVisible, setMenuVisible] = useState(false);

    
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


  return (
    <View style={[
        styles.header,
        { 
        height: responsive.headerHeight,
        paddingHorizontal: responsive.horizontalPadding
        }
    ]}>
        <TouchableOpacity 
        onPress={(e) => {
            e.stopPropagation();
            setMenuVisible(!menuVisible);
        }}>
        <Ionicons name="menu" size={28} color="#F58320" />
        </TouchableOpacity>
    
        <View style={styles.profileContainer}>
        <Text style={[
            styles.profileText,
            {
            color: theme.header.text,
            fontSize: responsive.subtitleFontSize
            }
        ]}>
            Baraka Electronique
        </Text>
        </View>

         <TouchableOpacity onPress={() => navigation.navigate("CartTab")} style={styles.cartIcon}>
        <Ionicons name="cart-outline" size={28} color="#F58320" />
        {totalCartItems > 0 && (
          <Badge
            value={totalCartItems.toString()}
            status="error"
            containerStyle={styles.badgeContainer}
            textStyle={styles.badgeText}
          />
        )}
      </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("SearchScreen")}>
        <Ionicons name="search-outline" size={28} color="#F58320" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("OrderStatusScreen")} style={styles.icon1Container}>
        <Ionicons name="bag-outline" size={28} color="#F58320" />
        <Badge
            // value={orders.length}
            status="error"
            containerStyle={{ position: 'absolute', top: -4, right: -4 }}
        />
        </TouchableOpacity>

        {/* Menu dropdown - Style exact de l'image */}
        {menuVisible && (
            <View style={[
            styles.menuDropdown, 
            {
                position: 'absolute',
                top: 70,
                left: 0,
                height: 850,
                width: 310,
                backgroundColor: '#F8F9FA',
                borderTopRightRadius: 25,
                borderBottomRightRadius: 25,
                shadowColor: '#000',
                shadowOffset: {
                width: 3,
                height: 0,
                },
                shadowOpacity: 0.2,
                shadowRadius: 5,
                elevation: 8,
                zIndex: 1000,
            }
            ]}>

            {/* Bouton de fermeture - Croix rouge */}
            {/* <TouchableWithoutFeedback onPress={closeMenu}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                }}>
                    <View style={{
                    width: 24,
                    height: 24,
                    marginLeft: 200,
                    marginTop: 50,
                    justifyContent: 'center',
                    alignItems: 'center',
                    }}>
                    <Ionicons name="close-outline" size={20} color="#6B7280" />
                    </View>
                </View>
                </TouchableWithoutFeedback> */}
            
            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                paddingBottom: 30,
                }}
                bounces={false}
            >
                
                {/* Accueil */}
                <TouchableWithoutFeedback onPress={() => handleNavigation('HomeStack')}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                }}>
                    <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                    }}>
                    <Ionicons name="home-outline" size={20} color="#6B7280" />
                    </View>
                    <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                    }}>Accueil</Text>
                </View>
                </TouchableWithoutFeedback>

                {/* Catégories */}
                <TouchableWithoutFeedback onPress={() => handleNavigation('CategoriesTab')}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                }}>
                    <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                    }}>
                    <Ionicons name="grid-outline" size={20} color="#6B7280" />
                    </View>
                    <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                    }}>Catégories</Text>
                </View>
                </TouchableWithoutFeedback>

                {/* Notifications */}
                <TouchableWithoutFeedback onPress={() => handleNavigation('NotificationsScreen')}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                }}>
                    <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                    }}>
                    <Ionicons name="notifications-outline" size={20} color="#6B7280" />
                    </View>
                    <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                    }}>Notifications</Text>
                </View>
                </TouchableWithoutFeedback>

                {/* Contacts */}
                <TouchableWithoutFeedback onPress={() => handleNavigation('ContactScreen')}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                }}>
                    <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                    }}>
                    <Ionicons name="people-outline" size={20} color="#6B7280" />
                    </View>
                    <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                    }}>Contacts</Text>
                </View>
                </TouchableWithoutFeedback>

                {/* Produits en solde */}
                <TouchableWithoutFeedback onPress={() => handleNavigation('ProductsOnSaleScreen')}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                }}>
                    <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                    }}>
                    <Ionicons name="pricetag-outline" size={20} color="#6B7280" />
                    </View>
                    <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                    }}>Produits en solde</Text>
                </View>
                </TouchableWithoutFeedback>

                {/* Promouvoir */}
                <TouchableWithoutFeedback onPress={() => handleNavigation('PromotionsScreen')}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                }}>
                    <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                    }}>
                    <Ionicons name="diamond-outline" size={20} color="#6B7280" />
                    </View>
                    <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                    }}>Promouvoir</Text>
                </View>
                </TouchableWithoutFeedback>

                {/* Message avec badge "new" */}
                <TouchableWithoutFeedback onPress={() => handleNavigation('MessagesScreen')}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                }}>
                    <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                    }}>
                    <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
                    </View>
                    <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                    }}>Message</Text>
                    <View style={{
                    backgroundColor: '#EF4444',
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    marginRight: 5,
                    }}>
                    <Text style={{
                        color: '#FFFFFF',
                        fontSize: 10,
                        fontWeight: '600',
                    }}>new</Text>
                    </View>
                </View>
                </TouchableWithoutFeedback>

                {/* Mon profil */}
                <TouchableWithoutFeedback onPress={() => handleNavigation('ProfileTab')}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                }}>
                    <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                    }}>
                    <Ionicons name="person-outline" size={20} color="#6B7280" />
                    </View>
                    <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                    }}>Mon profil</Text>
                </View>
                </TouchableWithoutFeedback>

                {/* Mode avec switch */}
                <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
                }}>
                <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <Ionicons name="contrast-outline" size={20} color="#6B7280" />
                </View>
                <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                }}>Mode</Text>
                <Switch 
                    value={isDarkMode} 
                    onValueChange={toggleTheme}
                    trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                    thumbColor={isDarkMode ? '#FFFFFF' : '#FFFFFF'}
                    ios_backgroundColor="#D1D5DB"
                    style={{
                    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }]
                    }}
                />
                </View>

                {/* Masquer/Afficher les prix */}
<TouchableWithoutFeedback onPress={() => {
    setShowPrices(!showPrices);
    closeMenu();
}}>
    <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    }}>
    <View style={{
        width: 24,
        height: 24,
        marginRight: 15,
        justifyContent: 'center',
        alignItems: 'center',
    }}>
        <Ionicons name={showPrices ? "eye-outline" : "eye-off-outline"} size={20} color="#6B7280" />
    </View>
    <Text style={{
        fontSize: 16,
        color: '#374151',
        flex: 1,
    }}>{showPrices ? "Afficher les prix" : "Masquer les prix"}</Text>
    </View>
</TouchableWithoutFeedback>

                {/* Liste des produits */}
                <TouchableWithoutFeedback onPress={() => handleNavigation('ProductListScreen')}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                }}>
                    <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                    }}>
                    <Ionicons name="list-outline" size={20} color="#6B7280" />
                    </View>
                    <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                    }}>Liste des produits</Text>
                </View>
                </TouchableWithoutFeedback>

                {/* Envoyer plusieurs produits */}
                <TouchableWithoutFeedback onPress={() => handleNavigation('BulkUploadScreen')}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                }}>
                    <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                    }}>
                    <Ionicons name="cloud-upload-outline" size={20} color="#6B7280" />
                    </View>
                    <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                    }}>Envoyer plusieurs produits</Text>
                </View>
                </TouchableWithoutFeedback>

                {/* Catalogue */}
                <TouchableWithoutFeedback onPress={() => handleNavigation('CatalogueScreen')}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                }}>
                    <View style={{
                    width: 24,
                    height: 24,
                    marginRight: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                    }}>
                    <Ionicons name="library-outline" size={20} color="#6B7280" />
                    </View>
                    <Text style={{
                    fontSize: 16,
                    color: '#374151',
                    flex: 1,
                    }}>Catalogue</Text>
                </View>
                </TouchableWithoutFeedback>
                
                              {/* Guide*/}
                              <TouchableWithoutFeedback onPress={() => handleNavigation('AppUsageGuideScreen')}>
                                <View style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  paddingVertical: 16,
                                  paddingHorizontal: 20,
                                  borderBottomWidth: 1,
                                  borderBottomColor: '#F3F4F6',
                                }}>
                                  <View style={{
                                    width: 24,
                                    height: 24,
                                    marginRight: 15,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                  }}>
                                    <Ionicons name="sparkles-outline" size={20} color="#6B7280" />
                                  </View>
                                  <Text style={{
                                    fontSize: 16,
                                    color: '#374151',
                                    flex: 1,
                                  }}>Guide</Text>
                                </View>
                              </TouchableWithoutFeedback>

            </ScrollView>
            </View>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  
  userInfo: {
    marginBottom: 5,
  },
  userEmail: {
    marginBottom: 2,
  },
  notificationBadge: {
    backgroundColor: '#ff4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 'auto',
    marginRight: 10,
  },
  icon1Container: {
    position: 'relative',
  },
  
  profileContainer: { 
    justifyContent: "center",
    alignItems: "center",
  },
  profileText: {
    fontWeight: "bold",
  },
  
  
  header: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 0,
    // paddingVertical: 10, // Réduit de 15 à 10
    // backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
},

  title: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  cartIcon: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
  },
  badgeText: {
    fontSize: 10,
    color: 'white',
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
    height: Dimensions.get('window').height,
    width: 550,
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
  },
  

});

export default HeaderWithCart;