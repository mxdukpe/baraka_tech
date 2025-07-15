export type Notification = {
  id: number;
  type: 'Arrivages' | 'Commandes' | 'Panier';
  message: string;
  timestamp: string;
};

export const notificationsData: Notification[] = [
  {
    id: 1,
    type: 'Arrivages',
    message: 'Découvrez les nouveaux produits ajoutés pour vous!',
    timestamp: '2025-01-21T08:00:00Z',
  },
  {
    id: 2,
    type: 'Commandes',
    message: 'Votre commande est en cours de préparation. 🚚',
    timestamp: '2025-01-21T09:00:00Z',
  },
  {
    id: 3,
    type: 'Panier',
    message: 'Faites un tour dans votre panier pour valider vos achats. 🛒',
    timestamp: '2025-01-21T10:00:00Z',
  },
  // Ajoutez plus de notifications ici
];
