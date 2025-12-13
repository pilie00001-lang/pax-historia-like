export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: string;
  sourceUri?: string; // Optional real Google Maps link if available
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  mapSources?: Place[];
}

export interface SearchState {
  isLoading: boolean;
  places: Place[];
  error?: string;
  selectedPlaceId?: string;
  query: string;
}