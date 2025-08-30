import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Order, OrderItem } from '../../services/types';

export const useCart = () => {
  const [cartItems, setCartItems] = useState<Order[]>([]);

  // Charger le panier au démarrage
  const loadCart = async () => {
    try {
      const savedCart = await AsyncStorage.getItem('cart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  // Sauvegarder le panier quand il change
  const saveCart = async (items: Order[]) => {
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(items));
      setCartItems(items);
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  // Calculer le nombre total d'articles
  const totalItems = cartItems.reduce((total, order) => {
    return total + order.items.reduce((sum, item) => sum + item.quantity, 0);
  }, 0);

  return { 
    cartItems,
    totalCartItems: totalItems,
    loadCart,
    saveCart
  };
};