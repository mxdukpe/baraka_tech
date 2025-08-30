// authService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthService {
  constructor() {
    this.baseURL = 'https://backend.barakasn.com/api/v0';
    this.isRefreshing = false;
    this.refreshSubscribers = [];
  }

  // Vérifier si le token est expiré
  isTokenExpired(token) {
    if (!token) return true;
    
    try {
      // Décoder le JWT pour vérifier l'expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Vérifier si le token expire dans les 5 prochaines minutes
      return payload.exp < (currentTime + 300);
    } catch (error) {
      console.error('Erreur lors du décodage du token:', error);
      return true;
    }
  }

  // Obtenir un nouveau token via refresh token
  async refreshToken() {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.baseURL}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      // Sauvegarder le nouveau token
      await AsyncStorage.setItem('access_token', data.access);
      
      // Optionnel : sauvegarder le nouveau refresh token si fourni
      if (data.refresh) {
        await AsyncStorage.setItem('refresh_token', data.refresh);
      }

      return data.access;
    } catch (error) {
      console.error('Erreur lors du refresh du token:', error);
      // Supprimer les tokens invalides
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      throw error;
    }
  }

  // Obtenir un token valide (avec refresh automatique)
  async getValidToken() {
    let token = await AsyncStorage.getItem('access_token');
    
    if (!token || this.isTokenExpired(token)) {
      try {
        token = await this.refreshToken();
      } catch (error) {
        // Rediriger vers la page de connexion
        throw new Error('Authentication required');
      }
    }
    
    return token;
  }

  // Ajouter un abonné pour le refresh
  addRefreshSubscriber(callback) {
    this.refreshSubscribers.push(callback);
  }

  // Notifier tous les abonnés qu'un nouveau token est disponible
  onRefreshed(token) {
    this.refreshSubscribers.map(callback => callback(token));
    this.refreshSubscribers = [];
  }

  // Faire une requête API avec gestion automatique des tokens
  async apiRequest(url, options = {}) {
    try {
      const token = await this.getValidToken();
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Si le token est invalide malgré le refresh
      if (response.status === 401) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          
          try {
            const newToken = await this.refreshToken();
            this.isRefreshing = false;
            this.onRefreshed(newToken);
            
            // Rejouer la requête avec le nouveau token
            return fetch(url, {
              ...options,
              headers: {
                'Authorization': `Bearer ${newToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
              },
            });
          } catch (refreshError) {
            this.isRefreshing = false;
            throw new Error('Authentication required');
          }
        } else {
          // Si un refresh est déjà en cours, attendre
          return new Promise((resolve) => {
            this.addRefreshSubscriber((token) => {
              resolve(fetch(url, {
                ...options,
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                  ...options.headers,
                },
              }));
            });
          });
        }
      }

      return response;
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  }

  // Déconnexion
  async logout() {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
  }
}

// Export singleton
export default new AuthService();