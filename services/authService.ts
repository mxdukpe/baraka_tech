import axios from 'axios';

const API_BASE_URL = 'https://backend.barakasn.com/api/v0/';

// Typage pour registerMerchant
interface RegisterMerchantData {
    phone_number: string;
    device_id: string;
}

export const registerMerchant = async (data: { phone_number: string; device_id: string }) => {
    const response = await fetch('https://backend.barakasn.com/api/v0/merchants/register/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  
    if (!response.ok) {
      throw new Error('Erreur lors de l\'enregistrement');
    }
  
    return response.json();
  };

// Typage pour activateMerchant
interface ActivateMerchantData {
    phone_number: string;
    firstName: string;
    lastName: string;
    device_id: string;
}

export const activateMerchant = async (data: {
  phone_number: string;
  activation_code: string; // Ajoutez le code OTP ici
  device_id: string;
}) => {
  try {
    const response = await fetch('https://backend.barakasn.com/api/v0/merchants/activate/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'activation du compte:', error);
    throw error;
  }
};

export const completeProfile = async (data: {
  phone_number: string;
  first_name: string;
  last_name: string;
  device_id: string;
}) => {
  try {
    const response = await fetch('https://backend.barakasn.com/api/v0/merchants/complete-profile/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json(); // Capturer les détails de l'erreur
      console.error('Erreur API:', errorData);
      throw new Error(errorData.message || 'Erreur lors de la complétion du profil');
    }

    return response.json();
  } catch (error) {
    console.error('Erreur:', error);
    throw error;
  }
};