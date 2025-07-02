// navigation/types.ts
import { StackNavigationProp } from '@react-navigation/stack';

export type RootStackParamList = {
  BulkUpload: undefined;
  // Ajoutez d'autres écrans ici
  HomeStack: undefined;
  CategoriesTab: undefined;
  NotificationsTab: undefined;
  // ...
};

export type BulkUploadScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BulkUpload'>;