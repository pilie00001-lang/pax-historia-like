import { GameState, MapEntity, GameEvent, DiplomaticThread, DiplomaticMessage } from "../types";

// Note: On utilise window.puter qui est chargé via le script dans index.html
const MODEL_ID = 'gpt-4o-mini';

// --- UTILS ---
const cleanJson = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text;

  // 1. Nettoyage Markdown
  if (cleaned.includes('```json')) {
    cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '');
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/```/g, '');
  }

  // 2. Extraction délimitée par accolades
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else {
    // Si pas de JSON détecté, on retourne un objet vide pour éviter le crash
    console.warn("cleanJson: Aucun JSON valide trouvé dans la réponse IA.", text.substring(0, 100) + "...");
    return "{}";
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
      Tu es le moteur de jeu "Pax Historia". Initialise une carte de stratégie Grandeur Nature en 1936.
      Joueur : ${playerCountry}.
      
      Génère un JSON STRICT (pas de texte avant/après) :
      {
        "date": "1 Jan 1936",
        "message": "Court message d'ambiance (max 2 phrases).",
        "entities": [
           { "id": "city-paris", "name": "Paris", "type": "city", "owner": "France", "latitude": 48.85, "longitude": 2.35 },
           { "id": "army-fr-1", "name": "1ère Armée", "type": "army", "owner": "France", "latitude": 49.0, "longitude": 4.0 },
           { "id": "city-berlin", "name": "Berlin", "type": "city", "owner": "Allemagne", "latitude": 52.52, "longitude": 13.40 }
        ]
      }
      
      Instructions:
      1. Crée ~10 villes majeures (Capitales + Villes clés) en Europe, Asie, et Amérique.
      2. Crée ~8 armées positionnées aux frontières historiques.
      3. Utilise des noms de pays standards : "France", "Allemagne", "Italie", "Royaume-Uni", "URSS", "Japon", "USA", "Chine".
    `;

    const response = await window.puter.ai.chat(prompt, { model: MODEL_ID });
    
    if (response && (response.status === 401 || response.error)) throw new Error("Puter Unauthorized");

    const textContent = typeof response === 'string' ? response : (response?.message?.content || JSON.stringify(response));
    const data = JSON.parse(cleanJson(textContent));

    return {
      entities: data.entities || [],
      date: data.date || "1 Janvier 1936",
      startMessage: data.message || "L'Europe retient son souffle...",
      isOffline: false
    };
  } catch (e: any) {
    console.warn("Init Error (Fallback):", e);
    
    // FALLBACK DATA ROBUSTE
    const mockEntities: MapEntity[] = [
        { id: 'city-paris', name: 'Paris', type: 'city', owner: 'France', latitude: 48.8566, longitude: 2.3522 },
        { id: 'city-berlin', name: 'Berlin', type: 'city', owner: 'Allemagne', latitude: 52.5200, longitude: 13.4050 },
        { id: 'city-moscow', name: 'Moscou', type: 'city', owner: 'URSS', latitude: 55.7558, longitude: 37.6173 },
        { id: 'city-london', name: 'Londres', type: 'city', owner: 'Royaume-Uni', latitude: 51.5074, longitude: -0.1278 },
        { id: 'city-rome', name: 'Rome', type: 'city', owner: 'Italie', latitude: 41.9028, longitude: 12.4964 },
        { id: 'city-tokyo', name: 'Tokyo', type: 'city', owner: 'Japon', latitude: 35.6762, longitude: 139.6503 },
        { id: 'city-washington', name: 'Washington', type: 'city', owner: 'USA', latitude: 38.9072, longitude: -77.0369 },
        { id: 'city-nankin', name: 'Nankin', type: 'city', owner: 'Chine', latitude: 32.0603, longitude: 118.7969 },
        
        { id: 'army-fr-1', name: 'Armée du Nord', type: 'army', owner: 'France', latitude: 49.5, longitude: 3.0 },
        { id: 'army-de-1', name: 'Heeresgruppe A', type: 'army', owner: 'Allemagne', latitude: 50.5, longitude: 6.5 },
        { id: 'army-it-1', name: 'Armée des Alpes', type: 'army', owner: 'Italie', latitude: 45.0, longitude: 7.0 },
        { id: 'army-ru-1', name: 'Front Ouest', type: 'army', owner: 'URSS', latitude: 54.0, longitude: 30.0 }
    ];

    return {
      entities: mockEntities,
      date: "1 Janvier 1936",
      startMessage: "Mode Hors Ligne activé (Connexion IA instable). Le jeu utilise des données de simulation locales.",
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

    // Optimisation du contexte : on envoie des entités allégées pour économiser des tokens
    const simplifiedEntities = currentState.entities.map(e => ({
      id: e.id, type: e.type, owner: e.owner, lat: Number(e.latitude.toFixed(2)), lon: Number(e.longitude.toFixed(2))
    }));

    const diplomacyContext = currentState.diplomacy.map(thread => {
      const recentMessages = thread.messages.slice(-3); // Seulement les 3 derniers messages
      return `[Conversation avec ${thread.participants.join(', ')}]: ${JSON.stringify(recentMessages)}`;
    }).join('\n');

    const actionsContext = currentState.plannedActions.map(a => a.text).join(', ');

    const context = `
      Jeu Pax Historia. Date: ${currentState.date}. Joueur: ${currentState.playerCountry}.
      
      ORDRES DU JOUEUR : ${actionsContext || "Aucun ordre spécifique."}
      
      DISCUSSIONS DIPLOMATIQUES EN COURS :
      ${diplomacyContext}
      
      CARTE (Unités & Villes) :
      ${JSON.stringify(simplifiedEntities)}
    `;

    const prompt = `
      Génère le tour suivant (Mois +1).
      
      RÈGLES DE SIMULATION :
      1. MOUVEMENT : Déplace les armées ('army') de manière logique (vers le front ou les villes ennemies). Max 1-2 degrés de lat/lon par tour.
      2. CONQUÊTE : Si une armée arrive sur une ville ('city') ennemie (distance < 0.5), la ville PREND la nationalité de l'armée.
      3. DIPLOMATIE : Si le joueur a posé une question dans les discussions, tu DOIS générer une réponse de la part des pays concernés. Sois immersif.
      
      SORTIE JSON STRICTE :
      {
        "newDate": "Février 1936",
        "events": [ { "title": "Bataille de X", "description": "...", "sourceCountry": "Allemagne", "type": "war" } ],
        "updatedEntities": [ 
           { "id": "army-fr-1", "latitude": 49.2, "longitude": 3.5 },
           { "id": "city-berlin", "owner": "URSS" } // Exemple de conquête
        ],
        "diplomaticResponses": [
           { "participants": ["NomDuPays"], "response": "Texte de la réponse..." }
        ]
      }
    `;

    const response = await window.puter.ai.chat(context + "\n" + prompt, { model: MODEL_ID });
    
    if (response && (response.status === 401 || response.error)) throw new Error("Puter Unauthorized");
    
    const textContent = typeof response === 'string' ? response : (response?.message?.content || JSON.stringify(response));
    const data = JSON.parse(cleanJson(textContent));

    // Fusion des entités
    let mergedEntities = [...currentState.entities];
    if (data.updatedEntities && Array.isArray(data.updatedEntities)) {
       data.updatedEntities.forEach((update: Partial<MapEntity>) => {
          if (!update.id) return;
          const index = mergedEntities.findIndex(e => e.id === update.id);
          if (index !== -1) {
             // On merge soigneusement pour garder les champs non modifiés
             mergedEntities[index] = { 
               ...mergedEntities[index], 
               ...update,
               // Sécurité type number pour lat/lon
               latitude: update.latitude !== undefined ? Number(update.latitude) : mergedEntities[index].latitude,
               longitude: update.longitude !== undefined ? Number(update.longitude) : mergedEntities[index].longitude
             };
          }
       });
    }

    // Gestion de la diplomatie
    let updatedDiplomacy = [...currentState.diplomacy];
    if (data.diplomaticResponses && Array.isArray(data.diplomaticResponses)) {
      data.diplomaticResponses.forEach((resp: any) => {
        if (!resp.participants || !resp.response) return;
        
        // Trouver la conversation correspondante
        const targetParticipants = resp.participants.sort().join(',');
        let threadIndex = updatedDiplomacy.findIndex(t => t.participants.sort().join(',') === targetParticipants);
        
        // Recherche floue (subset)
        if (threadIndex === -1) {
             threadIndex = updatedDiplomacy.findIndex(t => t.participants.some(p => resp.participants.includes(p)));
        }

        const newMessage: DiplomaticMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            sender: resp.participants[0] || "Système",
            content: resp.response,
            timestamp: Date.now()
        };

        if (threadIndex !== -1) {
          updatedDiplomacy[threadIndex] = {
            ...updatedDiplomacy[threadIndex],
            messages: [...updatedDiplomacy[threadIndex].messages, newMessage],
            unreadCount: updatedDiplomacy[threadIndex].unreadCount + 1,
            lastUpdated: Date.now()
          };
        } else {
           // Nouvelle conversation initiée par l'IA
           updatedDiplomacy.unshift({
             id: `thread-${Date.now()}-${Math.random()}`,
             participants: resp.participants,
             messages: [newMessage],
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
    console.error("Turn Process Error:", e);
    // Simulation locale minimale en cas d'erreur
    return {
        entities: currentState.entities,
        events: [{id: `err-${Date.now()}`, date: currentState.date, title: "Silence Radio", description: "Problème de communication avec le QG (IA indisponible).", sourceCountry: "QG", type: "info"}],
        newDate: currentState.date,
        updatedDiplomacy: currentState.diplomacy,
        isOffline: true
    };
  }
};