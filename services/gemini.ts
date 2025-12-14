import { GoogleGenAI } from "@google/genai";
import { GameState, MapEntity, GameEvent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_ID = 'gemini-2.5-flash';

// --- LOCAL AI ENGINE (FALLBACK GRATUIT) ---

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
};

const runLocalSimulation = (currentState: GameState): { entities: MapEntity[], events: GameEvent[], newDate: string } => {
  const newEntities = currentState.entities.map(e => ({ ...e })); // Deep copy simple
  const events: GameEvent[] = [];
  const MOVEMENT_SPEED = 0.5; // Degrés par tour
  
  // 1. Logique de Mouvement et Conquête
  newEntities.forEach(entity => {
    if (entity.type === 'army') {
      // Trouver la ville ennemie la plus proche
      let target: MapEntity | null = null;
      let minDist = Infinity;

      newEntities.forEach(other => {
        if (other.type === 'city' && other.owner !== entity.owner) {
          const dist = calculateDistance(entity.latitude, entity.longitude, other.latitude, other.longitude);
          if (dist < minDist) {
            minDist = dist;
            target = other;
          }
        }
      });

      if (target) {
        const t = target as MapEntity;
        // Déplacement vers la cible
        const angle = Math.atan2(t.latitude - entity.latitude, t.longitude - entity.longitude);
        entity.latitude += Math.sin(angle) * MOVEMENT_SPEED;
        entity.longitude += Math.cos(angle) * MOVEMENT_SPEED;

        // Conquête si très proche
        if (minDist < 0.8) {
           t.owner = entity.owner;
           events.push({
             id: `battle-${Date.now()}-${t.id}`,
             date: "Simulation",
             title: `Chute de ${t.name}`,
             description: `Les forces de ${entity.owner} ont capturé ${t.name} !`,
             sourceCountry: entity.owner,
             type: 'war'
           });
        }
      }
    }
  });

  // 2. Avancer la date
  const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aou", "Sep", "Oct", "Nov", "Dec"];
  const currentMonthParts = currentState.date.split(' ');
  let nextDate = currentState.date;
  
  if (currentMonthParts.length >= 2) {
    const currentMonthIndex = months.findIndex(m => currentMonthParts[1].startsWith(m));
    if (currentMonthIndex !== -1) {
        const nextIndex = (currentMonthIndex + 1) % 12;
        const year = parseInt(currentMonthParts[2] || "1936") + (nextIndex === 0 ? 1 : 0);
        nextDate = `1 ${months[nextIndex]} ${year}`;
    }
  } else {
      nextDate = "Tour Suivant";
  }

  return {
    entities: newEntities,
    events: events.length > 0 ? events : [{
        id: `move-${Date.now()}`,
        date: nextDate,
        title: "Manœuvres Stratégiques",
        description: "Les armées se repositionnent sur le front.",
        sourceCountry: "Renseignement",
        type: 'info'
    }],
    newDate: nextDate
  };
};

const MOCK_SCENARIO_1936: { [key: string]: MapEntity[] } = {
  'France': [
    { id: 'city-paris', name: 'Paris', type: 'city', owner: 'France', latitude: 48.8566, longitude: 2.3522, description: 'Capitale' },
    { id: 'city-lyon', name: 'Lyon', type: 'city', owner: 'France', latitude: 45.7640, longitude: 4.8357 },
    { id: 'army-fr-1', name: '1ère Armée', type: 'army', owner: 'France', latitude: 49.5, longitude: 5.5, strength: 100 }, 
    { id: 'city-berlin', name: 'Berlin', type: 'city', owner: 'Allemagne', latitude: 52.5200, longitude: 13.4050 },
    { id: 'army-de-1', name: 'Wehrmacht A', type: 'army', owner: 'Allemagne', latitude: 50.0, longitude: 6.5, strength: 120 },
    { id: 'city-london', name: 'Londres', type: 'city', owner: 'Royaume-Uni', latitude: 51.5074, longitude: -0.1278 },
    { id: 'city-madrid', name: 'Madrid', type: 'city', owner: 'Espagne', latitude: 40.4168, longitude: -3.7038 },
    { id: 'city-rome', name: 'Rome', type: 'city', owner: 'Italie', latitude: 41.9028, longitude: 12.4964 },
  ],
  'default': [
    { id: 'city-paris', name: 'Paris', type: 'city', owner: 'France', latitude: 48.8566, longitude: 2.3522 },
    { id: 'city-berlin', name: 'Berlin', type: 'city', owner: 'Allemagne', latitude: 52.5200, longitude: 13.4050 },
    { id: 'city-moscow', name: 'Moscou', type: 'city', owner: 'URSS', latitude: 55.7558, longitude: 37.6173 },
  ]
};

// --- API FUNCTIONS ---

export const initializeGame = async (playerCountry: string): Promise<{ entities: MapEntity[], date: string, startMessage: string, isOffline: boolean }> => {
  try {
    const prompt = `
      Initialise une partie de stratégie en 1936 pour le pays : ${playerCountry}.
      JSON uniquement.
      {
        "date": "1 Jan 1936",
        "message": "Contexte historique...",
        "entities": [ ...liste de villes et armées... ]
      }
    `;

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const data = JSON.parse(response.text || "{}");
    return {
      entities: data.entities || [],
      date: data.date || "1 Janvier 1936",
      startMessage: data.message || "La guerre est proche.",
      isOffline: false
    };
  } catch (e: any) {
    console.warn("Switching to Local AI (Quota exceeded or Error)");
    const entities = MOCK_SCENARIO_1936[playerCountry] || MOCK_SCENARIO_1936['default'];
    return {
      entities: entities.map((e, i) => ({...e, id: `mock-${i}`})),
      date: "1 Janvier 1936",
      startMessage: "⚠ Connexion Satellite Perdue. Passage en mode IA LOCALE (Simulation Tactique).",
      isOffline: true
    };
  }
};

export const processTurn = async (
  currentState: GameState,
  playerActions: string[],
  userMessage?: string
): Promise<{ entities: MapEntity[], events: GameEvent[], newDate: string, isOffline: boolean }> => {
  try {
    // Si on est déjà détecté comme "Offline" (ou pour économiser), on peut forcer le local, 
    // mais ici on réessaie l'API au cas où le quota revient, sauf si c'est une 429 persistante.
    
    const context = `
      Date: ${currentState.date}. Pays: ${currentState.playerCountry}.
      Actions: ${JSON.stringify(playerActions)}.
      Fais avancer d'un mois. Bouge les armées.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: context,
      config: { responseMimeType: "application/json" }
    });

    const data = JSON.parse(response.text || "{}");
    return {
      entities: data.updatedEntities || currentState.entities, // Attention: l'IA doit renvoyer tout l'état idéalement, ou on merge.
      events: (data.events || []).map((e: any, i: number) => ({...e, id: `evt-${Date.now()}-${i}`})),
      newDate: data.newDate || currentState.date,
      isOffline: false
    };

  } catch (e) {
    console.warn("Turn Process failed, running Local Simulation.");
    const simResult = runLocalSimulation(currentState);
    return { ...simResult, isOffline: true };
  }
};