export type MiniTask = {
  id: number;
  title: string;
  completed: boolean;
};

export type User = {
  id: number;
  name: string;
  email: string;
  password: string;
  number: number;
  avatar: string;
  profile: 'grossiste' | 'revendeur' | 'client'; // Ajoutez cette ligne
  createdAt: string;
  updatedAt: string;
};

export const usersData: User[] = [
  {
    id: 1,
    name: "Alice Dupont",
    email: "alice.dupont@example.com",
    password: "aaaaaaaa",
    number: 12345678,
    avatar: "https://example.com/avatar1.jpg",
    profile: 'grossiste', // Ajoutez cette ligne
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-21T00:00:00.000Z"
  },
  {
    id: 2,
    name: "Bob Martin",
    email: "bob.martin@example.com",
    password: "aaaaaaaa",
    number: 22222222,
    avatar: "https://example.com/avatar2.jpg",
    profile: 'revendeur', // Ajoutez cette ligne
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-21T00:00:00.000Z"
  },
  {
    id: 3,
    name: "Claire Bernard",
    email: "claire.bernard@example.com",
    password: "aaaaaaaa",
    number: 11111111,
    avatar: "https://example.com/avatar3.jpg",
    profile: 'client', // Ajoutez cette ligne
    createdAt: "2025-01-03T00:00:00.000Z",
    updatedAt: "2025-01-21T00:00:00.000Z"
  }
];