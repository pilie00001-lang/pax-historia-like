import React, { useState, useEffect } from 'react';
import { MessageCircle, Zap, Search, X, ChevronRight, Send, MapPin, AlertTriangle } from 'lucide-react';
import { Map } from './components/Map';
import { searchPlaces } from './services/gemini';
import { Place, Coordinates } from './types';

const App: React.FC = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | undefined>(undefined);
  
  // États de l'interface Pax Historia
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [mapCenter, setMapCenter] = useState<Coordinates | undefined>(undefined);
  const [inputQuery, setInputQuery] = useState('');
  const [showInput, setShowInput] = useState(false);

  // Exemple de données initiales pour le look "Jeu"
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setUserLocation(coords);
        setMapCenter(coords);
      }
    );
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const results = await searchPlaces(inputQuery, userLocation);
      setPlaces(prev => [...results, ...prev]);
      if (results.length > 0) {
        setMapCenter({ latitude: results[0].latitude, longitude: results[0].longitude });
        setSelectedPlaceId(results[0].id);
      }
      setShowInput(false);
      setInputQuery('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Échec de la communication diplomatique.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkerClick = (id: string) => {
    setSelectedPlaceId(id);
    setIsPanelOpen(true);
  };

  // Fonction pour générer une couleur basée sur le nom du pays (hash simple)
  const getCountryColor = (name: string = "") => {
    const colors = ['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-yellow-500', 'bg-purple-600', 'bg-gray-800'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-900 relative font-sans">
      
      {/* Map Area */}
      <div className="absolute inset-0 z-0">
        <Map 
          places={places} 
          center={mapCenter} 
          selectedPlaceId={selectedPlaceId}
          onMarkerClick={handleMarkerClick}
        />
      </div>

      {/* --- PAX HISTORIA UI LAYER --- */}

      {/* 1. Panel "Discussions diplomatiques" (Bottom Left) */}
      {isPanelOpen && (
        <div className="absolute bottom-20 left-4 w-[400px] max-w-[90vw] max-h-[70vh] flex flex-col z-20 animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <h2 className="font-bold text-gray-900 text-lg">Discussions diplomatiques</h2>
              <button onClick={() => setIsPanelOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Timeline Content */}
            <div className="overflow-y-auto p-4 custom-scrollbar relative bg-gray-50/50 min-h-[300px]">
              
              {/* Vertical Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 z-0"></div>

              {places.length === 0 && !isLoading && !error && (
                <div className="text-center py-10 text-gray-500 relative z-10">
                  <p>Aucune activité diplomatique récente.</p>
                  <p className="text-sm mt-2">Utilisez le bouton "Nouvelle conversation".</p>
                </div>
              )}
              
              {isLoading && (
                 <div className="flex justify-center py-4 relative z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                 </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="relative z-10 mb-4 mx-2 p-3 bg-red-50 border-l-4 border-red-500 rounded shadow-sm flex gap-3 items-start">
                  <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-red-800 text-sm">Erreur Critique</h4>
                    <p className="text-xs text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {places.map((place, index) => (
                <div key={place.id} className="mb-6 relative z-10 group">
                  {/* Date Separator (Simulated) */}
                  <div className="flex justify-center mb-4">
                    <span className="bg-white px-3 py-1 text-xs font-medium text-gray-500 rounded-full border border-gray-200 shadow-sm">
                      {place.address || "Date inconnue"}
                    </span>
                  </div>

                  {/* Card */}
                  <div 
                    onClick={() => {
                        setSelectedPlaceId(place.id);
                        setMapCenter({ latitude: place.latitude, longitude: place.longitude });
                    }}
                    className={`bg-white rounded-xl p-4 shadow-sm border transition-all cursor-pointer hover:shadow-md ${selectedPlaceId === place.id ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Flags / Icons */}
                      <div className="flex flex-col -space-y-2 flex-shrink-0 mt-1">
                        <div className={`w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white text-[10px] font-bold ${getCountryColor(place.rating)} z-10`}>
                          {place.rating ? place.rating.substring(0, 2).toUpperCase() : "??"}
                        </div>
                        <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-gray-200 flex items-center justify-center text-gray-600 text-[10px] font-bold z-0">
                          MOI
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start">
                           <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">{place.name}</h3>
                           <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">À l'instant</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed font-serif">
                          {place.description}
                        </p>
                      </div>

                      {/* Chevron */}
                      <div className="flex-shrink-0 self-center text-gray-300">
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Action Button */}
            {!showInput ? (
              <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0 z-20">
                <button 
                  onClick={() => setShowInput(true)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Démarrer une nouvelle conversation
                </button>
              </div>
            ) : (
              <div className="p-3 bg-white border-t border-gray-100 sticky bottom-0 z-20">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="Ex: Déclarer la guerre à l'Italie..."
                      className="flex-grow bg-gray-100 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={inputQuery}
                      onChange={(e) => setInputQuery(e.target.value)}
                    />
                    <button 
                        type="submit"
                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </form>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* 2. Floating Action Buttons (Bottom Left) */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 z-30">
        
        {/* Main Chat Button (Blue) */}
        <button 
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="w-12 h-12 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl shadow-lg flex items-center justify-center border-2 border-white/20 transition-all"
          title="Discussions"
        >
          <MessageCircle size={24} fill="currentColor" className="text-white" />
          {/* Notification dot */}
          {!isPanelOpen && places.length > 0 && (
             <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-blue-600 rounded-full"></span>
          )}
        </button>

        {/* Action/Events Button (Grey/Orange) */}
        <button 
          className="w-12 h-12 bg-gray-200 hover:bg-gray-300 active:scale-95 text-gray-700 rounded-xl shadow-lg flex items-center justify-center border-2 border-white/50 transition-all"
          title="Actions"
          onClick={() => {
              // Quick action shortcut logic could go here
              setShowInput(true);
              setIsPanelOpen(true);
          }}
        >
          <Zap size={24} className="text-orange-500" fill="currentColor" />
        </button>

        {/* Search Button (White) */}
        <button 
          className="w-12 h-12 bg-white hover:bg-gray-50 active:scale-95 text-gray-800 rounded-xl shadow-lg flex items-center justify-center border border-gray-200 transition-all"
          title="Rechercher sur la carte"
        >
          <Search size={22} />
        </button>

      </div>

    </div>
  );
};

export default App;