/**
 * Ce fichier définit le contexte d'authentification de l'application.
 * Il gère l'état de connexion de l'utilisateur et fournit des méthodes pour se connecter et se déconnecter.
 *
 * @module AuthContext
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../data/userData';

/**
 * Type pour le contexte d'authentification.
 */
type AuthContextType = {
  user: User | null;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean; // Pour gérer l'état de chargement initial
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Fournisseur de contexte d'authentification.
 * @param {Object} props - Les props du composant.
 * @param {ReactNode} props.children - Les enfants du composant.
 * @returns {JSX.Element} Le fournisseur de contexte.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // État de chargement initial

  // Vérifier si un utilisateur est déjà connecté au démarrage de l'application
  useEffect(() => {
    const checkLoggedInUser = async () => {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false); // Fin du chargement
    };

    checkLoggedInUser();
  }, []);

  /**
   * Connecte l'utilisateur.
   * @param {User} user - L'utilisateur à connecter.
   */
  const login = async (user: User) => {
    await AsyncStorage.setItem('user', JSON.stringify(user)); // Enregistrer l'utilisateur dans AsyncStorage
    setUser(user);
  };

  /**
   * Déconnecte l'utilisateur.
   */
  const logout = async () => {
    await AsyncStorage.removeItem('user'); // Supprimer l'utilisateur de AsyncStorage
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook pour utiliser le contexte d'authentification.
 * @returns {AuthContextType} Le contexte d'authentification.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};