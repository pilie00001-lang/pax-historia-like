import { GameState, MapEntity, GameEvent } from "../types";

// Note: On utilise window.puter qui est chargé via le script dans index.html
// On retire l'import de @google/genai car on passe sur Puter (gratuit)

const MODEL_ID = 'gpt-4o-mini'; // Puter utilise souvent des alias comme gpt-4o-mini ou gpt-3.5-turbo

// --- UTILS ---
// Nettoyer la réponse de l'IA (souvent entourée de ```json ... ```)
const cleanJson = (text: string): string => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
  }
  return cleaned;
};

// --- LOCAL AI ENGINE (FALLBACK) ---
// Gardé au cas où Puter est lent ou down
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
};

const runLocalSimulation = (currentState: GameState): { entities: MapEntity[], events: GameEvent[], newDate: string } => {
  const newEntities = currentState.entities.map(e => ({ ...e }));
  const events: GameEvent[] = [];
  const MOVEMENT_SPEED = 0.5;
  
  newEntities.forEach(entity => {
    if (entity.type === 'army') {
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
        const angle = Math.atan2(t.latitude - entity.latitude, t.longitude - entity.longitude);
        entity.latitude += Math.sin(angle) * MOVEMENT_SPEED;
        entity.longitude += Math.cos(angle) * MOVEMENT_SPEED;

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

// --- API FUNCTIONS (VIA PUTER.JS) ---

export const initializeGame = async (playerCountry: string): Promise<{ entities: MapEntity[], date: string, startMessage: string, isOffline: boolean }> => {
  try {
    if (!window.puter) throw new Error("Puter.js not loaded");

    const prompt = `
      Tu es un moteur de jeu de stratégie historique.
      Initialise une partie en 1936 pour le pays : ${playerCountry}.
      
      Génère un JSON valide avec cette structure EXACTE :
      {
        "date": "1 Jan 1936",
        "message": "Texte d'ambiance...",
        "entities": [
           { "id": "1", "name": "Ville", "type": "city", "owner": "Pays", "latitude": 48.85, "longitude": 2.35, "description": "Desc" },
           { "id": "2", "name": "Armée", "type": "army", "owner": "Pays", "latitude": 49.0, "longitude": 2.5, "strength": 100 }
        ]
      }
      Génère au moins 5 villes majeures en Europe et 3 armées.
      IMPORTANT : Retourne UNIQUEMENT le JSON, sans markdown, sans explications.
    `;

    // Appel à Puter AI
    const response = await window.puter.ai.chat(prompt, { model: MODEL_ID });
    
    // Puter renvoie parfois un objet { message: { content: "..." } } ou direct le texte selon la version
    const textContent = typeof response === 'string' ? response : (response?.message?.content || JSON.stringify(response));
    const cleanText = cleanJson(textContent);
    
    const data = JSON.parse(cleanText);

    return {
      entities: data.entities || [],
      date: data.date || "1 Janvier 1936",
      startMessage: data.message || "L'Europe retient son souffle...",
      isOffline: false
    };
  } catch (e: any) {
    console.warn("Puter AI Error, switching to Local Simulation:", e);
    // Fallback Mock data
    const mockEntities: MapEntity[] = [
        { id: 'city-paris', name: 'Paris', type: 'city', owner: 'France', latitude: 48.8566, longitude: 2.3522 },
        { id: 'city-berlin', name: 'Berlin', type: 'city', owner: 'Allemagne', latitude: 52.5200, longitude: 13.4050 },
        { id: 'city-london', name: 'Londres', type: 'city', owner: 'Royaume-Uni', latitude: 51.5074, longitude: -0.1278 },
        { id: 'army-fr', name: 'Armée du Nord', type: 'army', owner: 'France', latitude: 49.5, longitude: 3.0, strength: 100 },
        { id: 'army-de', name: 'Panzer I', type: 'army', owner: 'Allemagne', latitude: 51.0, longitude: 10.0, strength: 100 }
    ];

    return {
      entities: mockEntities,
      date: "1 Janvier 1936",
      startMessage: "⚠ Connexion IA instable. Mode Simulation Locale activé.",
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
    if (!window.puter) throw new Error("Puter.js not loaded");

    const context = `
      Jeu de stratégie.
      Date actuelle: ${currentState.date}.
      Pays Joueur: ${currentState.playerCountry}.
      Actions du joueur: ${JSON.stringify(playerActions)}.
      Message diplomatique: "${userMessage || ""}".
      
      Liste actuelle des entités (simplifiée):
      ${JSON.stringify(currentState.entities.map(e => ({id: e.id, name: e.name, type: e.type, owner: e.owner, lat: e.latitude, lon: e.longitude})))}
    `;

    const prompt = `
      Simule le passage d'un mois (tour suivant).
      1. Bouge les armées (les armées ennemies avancent vers les villes du joueur).
      2. Résous les combats si une armée est sur une ville ennemie (distance < 0.5).
      3. Génère des événements.

      Retourne UNIQUEMENT un JSON valide :
      {
        "newDate": "Mois Suivant 1936",
        "events": [ { "title": "...", "description": "...", "sourceCountry": "...", "type": "war" } ],
        "updatedEntities": [ 
           // Liste COMPLÈTE ou PARTIELLE des entités avec leurs nouvelles positions/propriétaires.
           // IMPORTANT: Renvoie latitude/longitude valides (nombres).
        ]
      }
    `;

    const response = await window.puter.ai.chat(context + "\n" + prompt, { model: MODEL_ID });
    
    const textContent = typeof response === 'string' ? response : (response?.message?.content || JSON.stringify(response));
    const cleanText = cleanJson(textContent);
    const data = JSON.parse(cleanText);

    // Merge strategy: If AI returns partial list, merge. If complete, replace.
    // Pour simplifier ici, on suppose que l'IA renvoie les entités modifiées.
    let mergedEntities = [...currentState.entities];
    
    if (data.updatedEntities && Array.isArray(data.updatedEntities)) {
       // Update logic
       data.updatedEntities.forEach((update: MapEntity) => {
          const index = mergedEntities.findIndex(e => e.id === update.id);
          if (index !== -1) {
             mergedEntities[index] = { ...mergedEntities[index], ...update };
          } else {
             mergedEntities.push(update); // New entity spawn
          }
       });
    }

    return {
      entities: mergedEntities,
      events: (data.events || []).map((e: any, i: number) => ({...e, id: `evt-${Date.now()}-${i}`, date: data.newDate})),
      newDate: data.newDate || currentState.date,
      isOffline: false
    };

  } catch (e) {
    console.warn("Turn Process failed (Puter), running Local Simulation.", e);
    const simResult = runLocalSimulation(currentState);
    return { ...simResult, isOffline: true };
  }
};