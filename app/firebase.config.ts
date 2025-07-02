import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Configuration Firebase - À remplacer avec vos propres valeurs
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optionnel pour Analytics
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Obtenir l'instance de messagerie de manière asynchrone avec vérification de support
const getFirebaseMessaging = async () => {
  try {
    const isSupportedBrowser = await isSupported();
    if (isSupportedBrowser) {
      return getMessaging(app);
    }
    console.warn('Firebase Messaging not supported in this environment');
    return null;
  } catch (error) {
    console.error('Error initializing Firebase Messaging', error);
    return null;
  }
};

// Obtenir le token FCM
export const getFcmToken = async () => {
  try {
    const messaging = await getFirebaseMessaging();
    
    if (!messaging) {
      throw new Error('Messaging not available');
    }

    // Demander la permission (nécessaire pour iOS)
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: "YOUR_VAPID_KEY" // Clé WebPush (optionnelle)
      });
      console.log('FCM Token:', token);
      return token;
    } else {
      console.warn('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token', error);
    return null;
  }
};

// Écouter les messages en foreground
export const onForegroundMessage = async (callback: (payload: any) => void) => {
  const messaging = await getFirebaseMessaging();
  
  if (messaging) {
    return onMessage(messaging, (payload) => {
      console.log('Message received in foreground', payload);
      callback(payload);
    });
  }
};

// Vérifier si la messagerie est supportée
export const isMessagingSupported = async () => {
  return await isSupported();
};

export default app;