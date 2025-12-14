export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type EntityType = 'city' | 'army' | 'base' | 'battle';

export interface MapEntity {
  id: string;
  name: string;
  type: EntityType;
  owner: string; // Country Name
  latitude: number;
  longitude: number;
  strength?: number; // Pour les armées
  description?: string;
}

export interface GameEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  sourceCountry: string; // Qui a causé l'événement
  type: 'diplomacy' | 'war' | 'construction' | 'info';
}

// Nouvelle structure pour les messages diplomatiques
export interface DiplomaticMessage {
  id: string;
  sender: string; // 'Player' ou Nom du pays
  content: string;
  timestamp: number;
}

// Une conversation peut impliquer plusieurs pays
export interface DiplomaticThread {
  id: string;
  participants: string[]; // Liste des pays (ex: ['Allemagne', 'Italie'])
  messages: DiplomaticMessage[];
  lastUpdated: number;
  unreadCount: number;
}

export interface PlayerAction {
  id: string;
  text: string;
}

export interface GameState {
  date: string;
  turn: number;
  playerCountry: string;
  entities: MapEntity[];
  events: GameEvent[];
  diplomacy: DiplomaticThread[]; // Liste des conversations actives
  plannedActions: PlayerAction[]; // Liste des ordres pour le tour
  isLoading: boolean;
  gameOver: boolean;
  isOffline?: boolean;
}

// Compatibilité avec l'ancien code (pour la Map)
export interface Place extends MapEntity {
  address?: string;
  rating?: string;
  sourceUri?: string;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  mapSources?: Place[];
}

declare global {
  interface Window {
    puter: any;
  }
}