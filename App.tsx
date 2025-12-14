import React, { useState, useEffect } from 'react';
import { MessageCircle, Zap, Search, X, ChevronRight, Send, MapPin, AlertTriangle, Shield, Play, Clock, Menu, Wifi, WifiOff } from 'lucide-react';
import { Map } from './components/Map';
import { initializeGame, processTurn } from './services/gemini';
import { Place, Coordinates, GameState, MapEntity, GameEvent } from './types';

// Composant Modal de Sélection de Pays
const CountrySelector = ({ onSelect }: { onSelect: (c: string) => void }) => {
  const countries = [
    { name: 'France', color: 'bg-blue-600', desc: 'Défense de la démocratie' },
    { name: 'Allemagne', color: 'bg-gray-800', desc: 'Expansion militaire' },
    { name: 'Royaume-Uni', color: 'bg-red-700', desc: 'Maîtrise des mers' },
    { name: 'URSS', color: 'bg-red-900', desc: 'Révolution communiste' },
    { name: 'USA', color: 'bg-blue-500', desc: 'Arsenal de la démocratie' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-serif text-white mb-2 tracking-widest uppercase">Pax Historia AI</h1>
      <p className="text-gray-400 mb-8 italic">Choisissez votre destin - 1936</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
        {countries.map(c => (
          <button 
            key={c.name}
            onClick={() => onSelect(c.name)}
            className={`${c.color} group relative overflow-hidden p-6 rounded-lg border-2 border-white/20 hover:border-white transition-all shadow-xl hover:scale-105 text-left`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
               <Shield size={48} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{c.name}</h3>
            <p className="text-white/70 text-sm">{c.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// Composant Top Bar (Temps et Ressources)
const TopBar = ({ date, onNextTurn, isLoading, isOffline }: { date: string, onNextTurn: () => void, isLoading: boolean, isOffline?: boolean }) => (
  <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-gray-900 to-transparent z-40 flex items-center justify-between px-6 pt-2">
    <div className="flex items-center gap-4">
      <div className="bg-white/90 backdrop-blur text-gray-900 px-4 py-1 rounded shadow-lg border border-gray-400 font-serif font-bold text-lg flex items-center gap-2">
        <Clock size={18} />
        {date}
      </div>
      
      {/* Indicateur de Mode IA */}
      <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm border ${isOffline ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-green-100 text-green-700 border-green-300'}`}>
         {isOffline ? <WifiOff size={12} /> : <Wifi size={12} />}
         {isOffline ? 'IA LOCALE' : 'GEMINI CLOUD'}
      </div>
    </div>

    <button 
      onClick={onNextTurn}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-6 py-2 rounded shadow-lg border-2 border-yellow-500 font-bold tracking-wider uppercase transition-all
        ${isLoading ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-yellow-500 text-black hover:bg-yellow-400 hover:scale-105'}
      `}
    >
      {isLoading ? 'Calcul stratégique...' : 'Fin du Tour'}
      <Play size={18} fill="currentColor" />
    </button>
  </div>
);

const App: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<GameState>({
    date: '...',
    turn: 0,
    playerCountry: '',
    entities: [],
    events: [],
    isLoading: false,
    gameOver: false,
    isOffline: false
  });

  const [hasStarted, setHasStarted] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>(undefined);
  
  // UI State
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<Coordinates | undefined>(undefined);
  
  // Actions du joueur pour le tour en cours
  const [pendingActions, setPendingActions] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Initialisation du jeu
  const handleStartGame = async (country: string) => {
    setGameState(prev => ({ ...prev, isLoading: true, playerCountry: country }));
    try {
      const initData = await initializeGame(country);
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        date: initData.date,
        entities: initData.entities,
        isOffline: initData.isOffline,
        events: [{
          id: 'start',
          date: initData.date,
          title: 'Début de partie',
          description: initData.startMessage,
          sourceCountry: 'Jeu',
          type: 'info'
        }]
      }));
      setHasStarted(true);
      // Center map on player capital if found
      const capital = initData.entities.find(e => e.owner === country && e.type === 'city');
      if (capital) setMapCenter({ latitude: capital.latitude, longitude: capital.longitude });
    } catch (e) {
      console.error(e);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Passage du tour
  const handleNextTurn = async () => {
    if (gameState.isLoading) return;

    setGameState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // On envoie les actions et le dernier message de chat s'il y en a un
      const result = await processTurn(gameState, pendingActions, chatInput);
      
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        date: result.newDate,
        turn: prev.turn + 1,
        entities: result.entities,
        isOffline: result.isOffline,
        events: [...result.events, ...prev.events]
      }));
      
      // Reset actions
      setPendingActions([]);
      setChatInput('');
      
    } catch (e) {
      console.error(e);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleAddAction = (action: string) => {
    setPendingActions(prev => [...prev, action]);
    setIsActionMenuOpen(false);
  };

  const handleEntityClick = (id: string) => {
    setSelectedEntityId(id);
    setIsPanelOpen(true);
  };

  if (!hasStarted) {
    return <CountrySelector onSelect={handleStartGame} />;
  }

  // Conversion des MapEntities en Places pour le composant Map
  const mapPlaces: Place[] = gameState.entities.map(e => ({
    ...e,
    description: e.description || `${e.type} - ${e.owner}`,
    rating: e.owner, // Hack pour afficher la couleur
    address: gameState.date // Hack pour afficher la date dans la liste
  }));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-900 relative font-sans text-gray-900">
      
      {/* 0. Map Layer */}
      <div className="absolute inset-0 z-0">
        <Map 
          places={mapPlaces} 
          center={mapCenter} 
          selectedPlaceId={selectedEntityId}
          onMarkerClick={handleEntityClick}
        />
      </div>

      {/* 1. Top Bar */}
      <TopBar 
        date={gameState.date} 
        onNextTurn={handleNextTurn} 
        isLoading={gameState.isLoading} 
        isOffline={gameState.isOffline}
      />

      {/* 2. Left Panel - Diplomacy & Events */}
      {isPanelOpen && (
        <div className="absolute bottom-24 left-4 w-[400px] max-w-[90vw] max-h-[60vh] z-20 flex flex-col animate-in slide-in-from-left-10 duration-300">
          <div className="bg-[#fcfbf9] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-300 overflow-hidden flex flex-col h-full relative">
            
            {/* Texture papier */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]"></div>

            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/80 backdrop-blur z-10">
              <h2 className="font-serif font-bold text-xl text-gray-800">Rapports & Diplomatie</h2>
              <button onClick={() => setIsPanelOpen(false)}><X size={20} className="text-gray-500" /></button>
            </div>

            <div className="overflow-y-auto p-4 flex-grow custom-scrollbar space-y-4 z-10">
              {/* Liste des actions en attente */}
              {pendingActions.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
                  <h4 className="text-xs font-bold uppercase text-yellow-800 mb-2">Ordres en attente :</h4>
                  <ul className="list-disc list-inside text-sm text-yellow-900">
                    {pendingActions.map((act, i) => <li key={i}>{act}</li>)}
                  </ul>
                </div>
              )}

              {/* Liste des événements */}
              {gameState.events.map((evt) => (
                <div key={evt.id} className="bg-white p-3 rounded shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{evt.sourceCountry}</span>
                    <span className="text-[10px] text-gray-400">{evt.date}</span>
                  </div>
                  <h3 className="font-bold text-gray-800">{evt.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 font-serif leading-relaxed">{evt.description}</p>
                </div>
              ))}
            </div>

            {/* Zone de chat / ordre direct */}
            <div className="p-3 bg-white border-t border-gray-200 z-10">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Envoyer un message diplomatique ou un ordre spécial..."
                  className="flex-grow bg-gray-100 border-none rounded px-3 py-2 text-sm focus:ring-1 focus:ring-gray-400"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                       setPendingActions(prev => [...prev, `Diplomatie/Ordre: ${chatInput}`]);
                       setChatInput('');
                    }
                  }}
                />
                <button 
                  onClick={() => {
                     if (chatInput.trim()) {
                       setPendingActions(prev => [...prev, `Diplomatie/Ordre: ${chatInput}`]);
                       setChatInput('');
                     }
                  }}
                  className="bg-gray-800 text-white p-2 rounded hover:bg-black"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Actions Menu (Lightning Button) */}
      {isActionMenuOpen && (
        <div className="absolute bottom-24 left-20 w-64 bg-gray-800 text-white rounded-xl shadow-xl p-2 z-30 animate-in fade-in zoom-in duration-200">
          <h3 className="text-xs font-bold text-gray-400 uppercase p-2 border-b border-gray-700 mb-2">Ordres Militaires</h3>
          <button onClick={() => handleAddAction("Déplacer l'armée la plus proche vers la frontière ennemie")} className="w-full text-left p-2 hover:bg-gray-700 rounded text-sm flex items-center gap-2"><MapPin size={14}/> Déployer à la frontière</button>
          <button onClick={() => handleAddAction("Construire une base fortifiée")} className="w-full text-left p-2 hover:bg-gray-700 rounded text-sm flex items-center gap-2"><Shield size={14}/> Fortifier la position</button>
          <button onClick={() => handleAddAction("Déclarer la guerre à un voisin")} className="w-full text-left p-2 hover:bg-red-900/50 text-red-200 rounded text-sm flex items-center gap-2"><AlertTriangle size={14}/> Déclaration de guerre</button>
        </div>
      )}

      {/* 4. FABs (Bottom Left) */}
      <div className="absolute bottom-6 left-6 flex items-center gap-4 z-30">
        <button 
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="w-14 h-14 bg-white text-gray-800 rounded-full shadow-lg flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-all hover:scale-105 active:scale-95"
        >
          <MessageCircle size={24} />
          {gameState.events.length > 0 && !isPanelOpen && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>}
        </button>

        <button 
          onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center border-4 border-white transition-all hover:scale-105 active:scale-95 ${isActionMenuOpen ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-white'}`}
        >
          <Zap size={24} fill={isActionMenuOpen ? "black" : "none"} />
        </button>
      </div>

    </div>
  );
};

export default App;