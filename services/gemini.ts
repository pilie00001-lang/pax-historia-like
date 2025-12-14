import { GameState, MapEntity, GameEvent, DiplomaticThread, DiplomaticMessage } from "../types";

// Note: On utilise window.puter qui est chargé via le script dans index.html
const MODEL_ID = 'gpt-4o-mini';

// --- UTILS ---
const cleanJson = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text;

  // 1. Si Markdown code block, on essaie de nettoyer
  if (cleaned.includes('```json')) {
    cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '');
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/```/g, '');
  }

  // 2. EXTRACTION BRUTE : On cherche le premier '{' et le dernier '}'
  // C'est la méthode la plus robuste contre le "blabla" de l'IA
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
};

export const loginToPuter = async () => {
  if (window.puter) {
    try {
      await window.puter.auth.signIn();
      return true;
    } catch (e) {
      console.error("Puter Login Failed", e);
      return false;
    }
  }
  return false;
};

// --- API FUNCTIONS ---

export const initializeGame = async (playerCountry: string): Promise<{ entities: MapEntity[], date: string, startMessage: string, isOffline: boolean }> => {
  try {
    if (!window.puter) throw new Error("Puter.js not loaded");

    const prompt = `
      Tu es le moteur du jeu "Pax Historia". Initialise une carte en 1936.
      Joueur : ${playerCountry}.
      
      Génère un JSON valide (SANS TEXTE AUTOUR) :
      {
        "date": "1 Jan 1936",
        "message": "Contexte historique...",
        "entities": [
           { "id": "city-1", "name": "Paris", "type": "city", "owner": "France", "latitude": 48.85, "longitude": 2.35, "description": "Capitale" },
           { "id": "army-1", "name": "1ère Armée", "type": "army", "owner": "France", "latitude": 49.0, "longitude": 4.0, "strength": 100 },
           { "id": "city-2", "name": "Berlin", "type": "city", "owner": "Allemagne", "latitude": 52.52, "longitude": 13.40 },
           { "id": "army-2", "name": "Wehrmacht A", "type": "army", "owner": "Allemagne", "latitude": 51.0, "longitude": 12.0, "strength": 120 }
        ]
      }
      Important: Ajoute au moins 8 villes clés en Europe/Asie et 6 armées.
    `;

    const response = await window.puter.ai.chat(prompt, { model: MODEL_ID });
    
    if (response && (response.status === 401 || response.error)) throw new Error("Puter Unauthorized");

    const textContent = typeof response === 'string' ? response : (response?.message?.content || JSON.stringify(response));
    const data = JSON.parse(cleanJson(textContent));

    return {
      entities: data.entities || [],
      date: data.date || "1 Janvier 1936",
      startMessage: data.message || "L'histoire est en marche...",
      isOffline: false
    };
  } catch (e: any) {
    console.warn("Init Error (Fallback):", e);
    
    // FALLBACK DATA
    const mockEntities: MapEntity[] = [
        { id: 'city-paris', name: 'Paris', type: 'city', owner: 'France', latitude: 48.8566, longitude: 2.3522 },
        { id: 'city-berlin', name: 'Berlin', type: 'city', owner: 'Allemagne', latitude: 52.5200, longitude: 13.4050 },
        { id: 'city-moscow', name: 'Moscou', type: 'city', owner: 'URSS', latitude: 55.7558, longitude: 37.6173 },
        { id: 'city-tokyo', name: 'Tokyo', type: 'city', owner: 'Japon', latitude: 35.6762, longitude: 139.6503 },
        { id: 'city-london', name: 'Londres', type: 'city', owner: 'Royaume-Uni', latitude: 51.5074, longitude: -0.1278 },
        { id: 'city-rome', name: 'Rome', type: 'city', owner: 'Italie', latitude: 41.9028, longitude: 12.4964 },
        { id: 'army-fr-1', name: 'Armée des Alpes', type: 'army', owner: 'France', latitude: 46.0, longitude: 6.0, strength: 100 },
        { id: 'army-de-1', name: 'Panzer Group', type: 'army', owner: 'Allemagne', latitude: 50.0, longitude: 10.0, strength: 120 }
    ];

    return {
      entities: mockEntities,
      date: "1 Janvier 1936",
      startMessage: "Mode Hors Ligne / Simulation (Erreur IA détectée).",
      isOffline: true
    };
  }
};

export const processTurn = async (
  currentState: GameState
): Promise<{ 
  entities: MapEntity[], 
  events: GameEvent[], 
  newDate: string, 
  updatedDiplomacy: DiplomaticThread[],
  isOffline: boolean 
}> => {
  try {
    if (!window.puter) throw new Error("Puter.js not loaded");

    // Préparation du contexte pour l'IA
    const diplomacyContext = currentState.diplomacy.map(thread => {
      const recentMessages = thread.messages.slice(-4); 
      return `Conversation avec [${thread.participants.join(', ')}]: ${JSON.stringify(recentMessages)}`;
    }).join('\n');

    const actionsContext = currentState.plannedActions.map(a => a.text).join(', ');

    const context = `
      Jeu Pax Historia. 
      Date: ${currentState.date}. Joueur: ${currentState.playerCountry}.
      
      ACTIONS DU JOUEUR CE TOUR :
      ${actionsContext || "Aucune action spécifique, maintenir les positions."}

      DIPLOMATIE (Derniers échanges) :
      ${diplomacyContext}
      
      ENTITÉS ACTUELLES (Positions) :
      ${JSON.stringify(currentState.entities.map(e => ({id: e.id, type: e.type, owner: e.owner, lat: e.latitude, lon: e.longitude})))}
    `;

    const prompt = `
      Simule le mois suivant.
      
      1. MOUVEMENTS & COMBATS : Déplace les armées. Si une armée arrive sur une ville ennemie, change le propriétaire.
      2. DIPLOMATIE : Réponds aux questions du joueur si nécessaire.
      
      Retourne JSON UNIQUEMENT :
      {
        "newDate": "Mois Suivant 1936",
        "events": [ { "title": "...", "description": "...", "sourceCountry": "...", "type": "war" } ],
        "updatedEntities": [ { "id": "...", "latitude": 0.0, "longitude": 0.0, "owner": "..." } ],
        "diplomaticResponses": [
           { "participants": ["Allemagne"], "response": "Nous acceptons votre offre." }
        ]
      }
    `;

    const response = await window.puter.ai.chat(context + "\n" + prompt, { model: MODEL_ID });
    
    if (response && (response.status === 401 || response.error)) throw new Error("Puter Unauthorized");
    
    const textContent = typeof response === 'string' ? response : (response?.message?.content || JSON.stringify(response));
    const data = JSON.parse(cleanJson(textContent));

    // Mise à jour des entités
    let mergedEntities = [...currentState.entities];
    if (data.updatedEntities) {
       data.updatedEntities.forEach((update: MapEntity) => {
          if (typeof update.latitude !== 'number' || typeof update.longitude !== 'number') return;
          const index = mergedEntities.findIndex(e => e.id === update.id);
          if (index !== -1) {
             mergedEntities[index] = { ...mergedEntities[index], ...update };
          } else {
             mergedEntities.push(update);
          }
       });
    }

    // Mise à jour de la diplomatie (Ajout des réponses de l'IA)
    let updatedDiplomacy = [...currentState.diplomacy];
    if (data.diplomaticResponses) {
      data.diplomaticResponses.forEach((resp: any) => {
        const targetParticipants = resp.participants.sort().join(',');
        let threadIndex = updatedDiplomacy.findIndex(t => t.participants.sort().join(',') === targetParticipants);
        
        if (threadIndex === -1) {
             threadIndex = updatedDiplomacy.findIndex(t => t.participants.some(p => resp.participants.includes(p)));
        }

        if (threadIndex !== -1) {
          updatedDiplomacy[threadIndex].messages.push({
            id: `msg-${Date.now()}`,
            sender: resp.participants[0],
            content: resp.response,
            timestamp: Date.now()
          });
          updatedDiplomacy[threadIndex].unreadCount += 1;
        } else {
           updatedDiplomacy.push({
             id: `thread-${Date.now()}`,
             participants: resp.participants,
             messages: [{
                id: `msg-${Date.now()}`,
                sender: resp.participants[0],
                content: resp.response,
                timestamp: Date.now()
             }],
             lastUpdated: Date.now(),
             unreadCount: 1
           });
        }
      });
    }

    return {
      entities: mergedEntities,
      events: (data.events || []).map((e: any, i: number) => ({...e, id: `evt-${Date.now()}-${i}`, date: data.newDate})),
      newDate: data.newDate || currentState.date,
      updatedDiplomacy,
      isOffline: false
    };

  } catch (e) {
    console.warn("Turn Process failed (Puter), local fallback", e);
    return {
        entities: currentState.entities,
        events: [{id: 'err', date: currentState.date, title: "Rapport manquant", description: "Problème de communication avec le QG (Erreur IA).", sourceCountry: "QG", type: "info"}],
        newDate: currentState.date,
        updatedDiplomacy: currentState.diplomacy,
        isOffline: true
    };
  }
};