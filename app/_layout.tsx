/**
 * Ce fichier définit la structure de navigation de l'application.
 * Il utilise `@react-navigation/native-stack` pour la navigation en pile
 * et `@react-navigation/bottom-tabs` pour la navigation par onglets.
 *
 * @module Navigation
 */
import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider } from "./appearence/ThemeContext";
import {
  Alert, Text, View, StyleSheet
} from 'react-native';

import { StatusBar } from 'expo-status-bar';


import LoginScreen from './authentification/loginScreen';
import RegisterStep1Screen from './authentification/RegisterStep1Screen';
import RegisterStep2Screen from './authentification/RegisterStep2Screen';
import OtpVerification from './authentification/OtpVerification';
import HomeScreen from "./screens/homescreen";
import CategorieScreen from "./screens/CategorieScreen";
import NotificationsScreen from "./screens/notificationsscreen";
import SearchScreen from "./screens/SearchScreen";
import SaleScreen from "./screens/SaleScreen";
import CartScreen from './screens/CartScreen';
import ProfileScreen from './screens/ProfileScreen';
import CatalogueScreen from "./screens/CatalogueScreen";
import NewArrivals from "./screens/NewArrivals"
import ProductDetailScreen from "./screens/ProductDetailScreen"
import VideoScreen from "./screens/VideoScreen"
import ContactScreen from "./screens/ContactScreen"
import AppUsageGuideScreen from "./screens/AppUsageGuideScreen"
import OrderValidationScreen from './screens/OrderValidationScreen';
import CustomerInfoScreen from './screens/CustomerInfoScreen';
import PaymentScreen from './screens/PaymentScreen';
import OrderConfirmationScreen from './screens/OrderConfirmationScreen';
import ProductListScreen from './screens/ProductListScreen';
import BulkUploadScreen from './screens/BulkUploadScreen';
import OrderStatusScreen from './screens/OrderStatusScreen';
import AdminDashboard from './dashboard/AdminDashboard';
import CategoryProductsScreen from './screens/CategoryProductsScreen';
import PaiementValidationScreen from './screens/PaiementValidationScreen';
import MessagesScreen from './screens/MessagesScreen';
import HeaderWithCart from './screens/HeaderWithCart';
import BrandsScreen from './screens/BrandsScreen';

import { RootStackParamList } from '../services/types'; // Assurez-vous d'avoir défini RootStackParamList

// import { getMessaging, getToken, onMessage } from 'firebase/messaging';
// import { getFcmToken, onForegroundMessage } from './firebase.config';
// import { initializeApp } from 'firebase/app';
// import messaging from '@react-native-firebase/messaging';


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Type pour les noms d'icônes valides.
 */
type IconName = 'home' | 'home-outline' | 'sparkles' | 'sparkles-outline' | 'pricetag' | 'pricetag-outline' | 'call' |  'call-outline' | 'tv' |  'tv-outline' | 'notifications' | 'notifications-outline' | 'flag-outline' | 'notifications' | 'notifications-outline' | 'search' | 'search-outline' | 'stats-chart' | 'stats-chart-outline' | 'person' | 'person-outline' | 'receipt' | 'receipt-outline';

/**
 * Composant pour la navigation par onglets.
 * @returns {JSX.Element} La navigation par onglets.
 */
function HomeTabs() {
  return (
    <ThemeProvider>
      <Tab.Navigator
        initialRouteName="HomeTab"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: IconName = 'home'; // Valeur par défaut

            // Définir les icônes pour chaque onglet
            if (route.name === 'HomeTab') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'CategoriesTab') {
              iconName = focused ? 'tv' : 'tv-outline'; // Utilisez 'flag' pour les objectifs
            }else if (route.name === 'NotificationsScreen') {
              iconName = focused ? 'receipt' : 'receipt-outline'; // Utilisez 'flag' pour les objectifs
            } else if (route.name === 'SaleScreen') {
              iconName = focused ? 'pricetag' : 'pricetag-outline';
            } else if (route.name === 'ContactScreen') {
              iconName = focused ? 'call' : 'call-outline'; // Utilisez 'stats-chart' pour les progrès
            } else if (route.name === 'ProfileTab') {
              iconName = focused ? 'person' : 'person-outline';
            } else if (route.name === 'NewArrivals') {
              iconName = focused ? 'sparkles' : 'sparkles-outline';
            }

            // Retourner l'icône correspondante
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#F58320', // Couleur active (vert)
          tabBarInactiveTintColor: '#7f8c8d', // Couleur inactive (gris)
          tabBarStyle: {
            backgroundColor: '#2d2d2d', // Fond blanc pour la barre de navigation
            borderTopWidth: 0, // Supprimer la bordure supérieure
            elevation: 10, // Ombre pour un effet de profondeur
            borderTopRightRadius: 20,
            borderTopLeftRadius: 20,
          },
        })}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeScreen}
          options={{ tabBarLabel: 'Accueil', headerShown: false }}
        />
        <Tab.Screen
          name="CategoriesTab"
          component={CategorieScreen}
          options={{ tabBarLabel: 'Catégories', headerShown: false }}
        />
        <Tab.Screen
          name="NotificationsScreen"
          component={NotificationsScreen}
          options={{ tabBarLabel: 'Notifications', headerShown: false }}
        />
        <Tab.Screen
          name="SaleScreen"
          component={SaleScreen}
          options={{ tabBarLabel: 'Soldes', headerShown: false }}
        />
        <Tab.Screen
          name="ContactScreen"
          component={ContactScreen}
          options={{ tabBarLabel: 'Contact', headerShown: false }}
        />
        <Tab.Screen
          name="NewArrivals"
          component={NewArrivals}
          options={{ tabBarLabel: 'Nouveautés', headerShown: false }}
        />
      </Tab.Navigator>
    </ThemeProvider>
  );
}

/**
 * Composant racine de l'application.
 * @returns {JSX.Element} La structure de navigation de l'application.
 */

export default function RootLayout() {
  // useEffect(() => {
  //   const setupFirebaseMessaging = async () => {
  //     try {
  //       const authStatus = await messaging().requestPermission();
  //       const enabled =
  //         authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
  //         authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  //       if (enabled) {
  //         const fcmToken = await messaging().getToken();
  //         console.log('FCM Token:', fcmToken);
  //       }

  //       const unsubscribe = messaging().onMessage(async remoteMessage => {
  //         Alert.alert('Nouveau message', remoteMessage?.notification?.body || 'Message reçu');
  //       });

  //       return unsubscribe;
  //     } catch (error) {
  //       console.error('Erreur Firebase:', error);
  //     }
  //   };

  //   const unsubscribePromise = setupFirebaseMessaging();

  //   return () => {
  //     unsubscribePromise.then(unsubscribe => {
  //       if (unsubscribe) unsubscribe();
  //     });
  //   };
  // }, []);

  return (
    <ThemeProvider>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="HomeStack" component={HomeTabs} options={{ headerShown: false }}/>
        <Stack.Screen name="CartTab" component={CartScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="CategoriesTab" component={CategorieScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="NewArrivals" component={NewArrivals} options={{ headerShown: false }}/>
        <Stack.Screen name="SaleScreen" component={SaleScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="CatalogueScreen" component={CatalogueScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="RegisterStep1Screen" component={RegisterStep1Screen} options={{ headerShown: false }}/>
        <Stack.Screen name="RegisterStep2Screen" component={RegisterStep2Screen} options={{ headerShown: false }}/>
        <Stack.Screen name="OtpVerification" component={OtpVerification} options={{ headerShown: false }}/>
        <Stack.Screen name="ProductDetailScreen" component={ProductDetailScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="OrderStatusScreen" component={OrderStatusScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="ContactScreen" component={ContactScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="VideoScreen" component={VideoScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="AppUsageGuideScreen" component={AppUsageGuideScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="OrderValidationScreen" component={OrderValidationScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="CustomerInfoScreen" component={CustomerInfoScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="PaymentScreen" component={PaymentScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="OrderConfirmationScreen" component={OrderConfirmationScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="ProductListScreen" component={ProductListScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="BulkUploadScreen" component={BulkUploadScreen} options={{ headerShown: false }}/>
        {/* <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ headerShown: false }}/> */}
        {/* <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} options={{ headerShown: false }}/> */}
        <Stack.Screen name="CategoryProductsScreen" component={CategoryProductsScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="PaiementValidation" component={PaiementValidationScreen} options={{ title: 'Validation Paiement' }}/>
        <Stack.Screen name="MessagesScreen" component={MessagesScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="HeaderWithCart" component={HeaderWithCart} options={{ headerShown: false }}/>
        <Stack.Screen name="SearchScreen" component={SearchScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="BrandsScreen" component={BrandsScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ headerShown: false }}/>
      </Stack.Navigator>
    </ThemeProvider>
  );
}