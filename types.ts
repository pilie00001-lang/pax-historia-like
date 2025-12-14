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

export interface GameState {
  date: string;
  turn: number;
  playerCountry: string;
  entities: MapEntity[];
  events: GameEvent[];
  isLoading: boolean;
  gameOver: boolean;
  isOffline?: boolean; // Indicateur si on utilise l'IA Locale
}

// Compatibilité avec l'ancien code (pour la Map)
export interface Place extends MapEntity {
  address?: string; // Utilisé pour la date dans l'UI
  rating?: string; // Utilisé pour le pays dans l'UI
  sourceUri?: string;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  mapSources?: Place[];
}

export type ChatMessage = Message;

// Déclaration pour Puter.js
declare global {
  interface Window {
    puter: any;
  }
}