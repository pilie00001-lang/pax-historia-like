import { GoogleGenAI } from "@google/genai";
import { Coordinates, Place } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchPlaces = async (
  query: string,
  userLocation?: Coordinates
): Promise<Place[]> => {
  try {
    // Utilisation de gemini-2.5-flash (plus stable pour les tools que la version Lite)
    const model = 'gemini-2.5-flash';
    
    // Prompt orienté "Jeu de Grande Stratégie / Histoire"
    const prompt = `
      Tu es le moteur narratif d'un jeu de grande stratégie historique (style Hearts of Iron ou Pax Historia).
      L'utilisateur joue une nation et effectue l'action suivante : "${query}".

      Génère 1 à 3 événements diplomatiques ou militaires résultant de cette action.
      Si l'utilisateur demande une action générique (ex: "guerre"), invente un contexte plausible.
      
      Format de réponse attendu (JSON array strict) :
      [
        {
          "name": "Titre de l'événement (ex: Invasion de la Pologne)",
          "description": "Le texte diplomatique ou la déclaration (ex: 'Nous avons franchi la frontière...')",
          "latitude": 0.0,
          "longitude": 0.0,
          "address": "Date fictive ou historique (ex: 1er Septembre 1939)",
          "rating": "Nom du Pays cible (ex: Allemagne)"
        }
      ]
      
      Important:
      - Utilise le champ "address" pour la DATE.
      - Utilise le champ "rating" pour le NOM DU PAYS (cela servira à afficher le drapeau/couleur).
      - Place les coordonnées sur la capitale ou le lieu du conflit.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }], 
      },
    });

    const text = response.text || "[]";
    const jsonStr = text.replace(/```json\n?|```/g, '').trim();
    
    let places: Place[] = [];
    try {
      places = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Erreur parsing:", text);
      return [];
    }

    // On mappe les résultats pour s'assurer qu'ils ont des IDs uniques
    return places.map((p, index) => ({
        ...p,
        id: `diplomacy-${Date.now()}-${index}`,
        // Fallback si l'IA oublie le pays
        rating: p.rating || "Inconnu"
    }));

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Erreur de communication diplomatique.");
  }
};