import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Zap, Search, X, ChevronRight, Send, MapPin, AlertTriangle, Shield, Play, Clock, Menu, Wifi, WifiOff, LogIn, Plus, Users, Globe } from 'lucide-react';
import { Map } from './components/Map';
import { initializeGame, processTurn, loginToPuter } from './services/gemini';
import { Place, Coordinates, GameState, MapEntity, GameEvent, DiplomaticThread, PlayerAction } from './types';

// --- COMPONENTS ---

const CountrySelector = ({ onSelect }: { onSelect: (c: string) => void }) => {
  const countries = [
    { name: 'France', color: 'bg-blue-600', desc: 'Défense de la démocratie' },
    { name: 'Allemagne', color: 'bg-gray-800', desc: 'Expansion militaire' },
    { name: 'Royaume-Uni', color: 'bg-red-700', desc: 'Maîtrise des mers' },
    { name: 'URSS', color: 'bg-red-900', desc: 'Révolution communiste' },
    { name: 'USA', color: 'bg-blue-500', desc: 'Arsenal de la démocratie' },
    { name: 'Japon', color: 'bg-white text-red-600 border-red-600', desc: 'Sphère de co-prospérité' },
    { name: 'Italie', color: 'bg-green-700', desc: 'Mare Nostrum' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-serif text-white mb-2 tracking-widest uppercase">Pax Historia AI</h1>
      <p className="text-gray-400 mb-8 italic">Choisissez votre nation - 1936</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-5xl overflow-y-auto max-h-[80vh] p-2">
        {countries.map(c => (
          <button 
            key={c.name}
            onClick={() => onSelect(c.name)}
            className={`${c.color} group relative overflow-hidden p-6 rounded-lg border-2 border-white/20 hover:border-white transition-all shadow-xl hover:scale-105 text-left`}
          >
            <h3 className="text-2xl font-bold mb-1 drop-shadow-md">{c.name}</h3>
            <p className="opacity-80 text-sm font-medium">{c.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// Modal pour sélectionner des pays à contacter
const DiplomacyNewThreadModal = ({ onClose, onCreate }: { onClose: () => void, onCreate: (countries: string[]) => void }) => {
  const allCountries = ['Allemagne', 'Royaume-Uni', 'URSS', 'Italie', 'Japon', 'USA', 'Chine', 'Espagne', 'Pologne'];
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (c: string) => {
    if (selected.includes(c)) setSelected(selected.filter(x => x !== c));
    else setSelected([...selected, c]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg text-gray-800">Entamer une nouvelle conversation</h3>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="p-4 overflow-y-auto flex-grow">
          <p className="text-sm text-gray-500 mb-3">Sélectionnez les pays à inviter :</p>
          <div className="grid grid-cols-2 gap-2">
             {allCountries.map(c => (
               <button 
                 key={c} 
                 onClick={() => toggle(c)}
                 className={`p-3 rounded border flex items-center gap-2 transition-all ${selected.includes(c) ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-inner' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
               >
                 <Globe size={16} className={selected.includes(c) ? 'text-blue-500' : 'text-gray-400'} />
                 {c}
               </button>
             ))}
          </div>
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
           <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Annuler</button>
           <button 
             onClick={() => { if(selected.length > 0) onCreate(selected); }}
             disabled={selected.length === 0}
             className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
           >
             Discuter avec {selected.length} pays
           </button>
        </div>
      </div>
    </div>
  );
};

// Hub de Diplomatie (Liste des conversations)
const DiplomacyHub = ({ 
  threads, 
  onClose, 
  onOpenThread, 
  onNew 
}: { 
  threads: DiplomaticThread[], 
  onClose: () => void, 
  onOpenThread: (id: string) => void,
  onNew: () => void
}) => {
  return (
    <div className="absolute bottom-24 left-4 w-[380px] max-w-[90vw] max-h-[60vh] z-20 flex flex-col animate-in slide-in-from-left-10 duration-300">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="font-serif font-bold text-xl text-gray-800">Discussions diplomatiques</h2>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>
        
        <div className="overflow-y-auto flex-grow p-2 space-y-2 bg-gray-50">
          {threads.length === 0 && (
             <div className="text-center p-8 text-gray-400">
                <MessageCircle size={48} className="mx-auto mb-2 opacity-20" />
                <p>Aucune discussion en cours.</p>
             </div>
          )}
          
          {threads.map(thread => (
            <div 
              key={thread.id} 
              onClick={() => onOpenThread(thread.id)}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all relative group"
            >
               <div className="flex items-center gap-2 mb-1">
                 {thread.participants.slice(0, 3).map(p => (
                   <div key={p} className="w-6 h-6 rounded-full bg-gray-200 border border-white shadow-sm flex items-center justify-center text-[10px] font-bold overflow-hidden" title={p}>
                     {p.substring(0, 2).toUpperCase()}
                   </div>
                 ))}
                 {thread.participants.length > 3 && <span className="text-xs text-gray-500">+{thread.participants.length - 3}</span>}
                 <span className="text-sm font-bold ml-1 text-gray-800">{thread.participants.join(', ')}</span>
               </div>
               
               <p className="text-xs text-gray-500 line-clamp-1 mt-2">
                 {thread.messages.length > 0 
                    ? `${thread.messages[thread.messages.length-1].sender}: ${thread.messages[thread.messages.length-1].content}` 
                    : "Nouvelle conversation"}
               </p>

               {thread.unreadCount > 0 && (
                 <span className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                   {thread.unreadCount}
                 </span>
               )}
            </div>
          ))}
        </div>

        <div className="p-4 bg-white border-t">
          <button 
            onClick={onNew}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Démarrer une nouvelle conversation
          </button>
        </div>
      </div>
    </div>
  );
};

// Interface de Chat
const ChatRoom = ({ 
  thread, 
  onClose, 
  onSend,
  playerCountry
}: { 
  thread: DiplomaticThread, 
  onClose: () => void, 
  onSend: (msg: string) => void,
  playerCountry: string
}) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread.messages]);

  return (
     <div className="absolute bottom-24 left-4 w-[380px] max-w-[90vw] h-[500px] max-h-[60vh] z-30 flex flex-col animate-in zoom-in-95 duration-200 shadow-2xl rounded-xl overflow-hidden bg-white border border-gray-300">
        <div className="p-3 border-b bg-white flex justify-between items-center z-10 shadow-sm">
           <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={20} /></button>
           <div className="text-center">
              <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{thread.participants.join(', ')}</h3>
              <p className="text-[10px] text-gray-500">Canal sécurisé</p>
           </div>
           <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 bg-[#e5ddd5] space-y-3" ref={scrollRef}>
           {thread.messages.length === 0 && <p className="text-center text-gray-500 text-xs mt-4">Aucun message pour l'instant</p>}
           {thread.messages.map(msg => {
             const isMe = msg.sender === 'Player' || msg.sender === playerCountry;
             return (
               <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[80%] rounded-lg p-2 text-sm shadow-sm ${isMe ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}>
                   {!isMe && <p className="text-[10px] font-bold text-orange-800 mb-0.5">{msg.sender}</p>}
                   <p>{msg.content}</p>
                 </div>
               </div>
             );
           })}
        </div>

        <div className="p-2 bg-gray-100 flex gap-2 items-center">
           <input 
             value={input}
             onChange={e => setInput(e.target.value)}
             placeholder="Saisissez votre message ici..."
             className="flex-grow p-2 rounded-full border border-gray-300 text-sm focus:outline-none focus:border-blue-500"
             onKeyDown={e => {
                if (e.key === 'Enter' && input.trim()) {
                  onSend(input);
                  setInput('');
                }
             }}
           />
           <button 
             onClick={() => {
                if (input.trim()) {
                  onSend(input);
                  setInput('');
                }
             }}
             className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-sm"
           >
             <Send size={18} />
           </button>
        </div>
     </div>
  );
};

// Modal des Actes (Actions)
const ActionsModal = ({ 
  actions, 
  onAdd, 
  onRemove, 
  onClose 
}: { 
  actions: PlayerAction[], 
  onAdd: (txt: string) => void, 
  onRemove: (id: string) => void,
  onClose: () => void 
}) => {
  const [input, setInput] = useState('');
  const suggestions = [
    "Attaquer la région frontalière", 
    "Renforcer la ligne de défense", 
    "Construire une base aérienne", 
    "Mobiliser les réserves",
    "Lancer un raid de bombardement"
  ];

  return (
    <div className="absolute bottom-24 left-20 w-[350px] max-w-[80vw] z-30 flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
         <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Zap size={18} className="text-yellow-600"/> Actes & Ordres</h2>
            <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
         </div>
         
         <div className="p-4 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2">Soumettez vos actions pour ce tour. Elles seront exécutées lors de la résolution.</p>
            
            {/* Input Zone */}
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-4">
               <textarea 
                 value={input}
                 onChange={e => setInput(e.target.value)}
                 className="w-full text-sm resize-none focus:outline-none h-16"
                 placeholder="Ex: J'attaque la Mongolie avec la 3ème armée..."
               />
               <div className="flex justify-between items-center mt-2">
                 <button className="text-gray-400 hover:text-gray-600"><Users size={16} /></button>
                 <button 
                   onClick={() => {
                     if(input.trim()) { onAdd(input); setInput(''); }
                   }}
                   className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700"
                 >
                   Ajouter l'ordre
                 </button>
               </div>
            </div>

            {/* Suggestions */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
               {suggestions.map(s => (
                 <button key={s} onClick={() => onAdd(s)} className="whitespace-nowrap px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs hover:bg-purple-200 transition-colors">
                   {s}
                 </button>
               ))}
            </div>

            {/* List */}
            <div className="space-y-2">
               <h4 className="font-bold text-xs uppercase text-gray-400">Vos actions soumises ({actions.length})</h4>
               {actions.length === 0 && <p className="text-sm text-gray-400 italic">Aucune action planifiée.</p>}
               {actions.map(act => (
                 <div key={act.id} className="flex justify-between items-center bg-white p-3 rounded border-l-4 border-blue-500 shadow-sm">
                    <span className="text-sm text-gray-800 line-clamp-2">{act.text}</span>
                    <button onClick={() => onRemove(act.id)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};


// --- MAIN APP ---

const TopBar = ({ date, onNextTurn, isLoading, isOffline }: { date: string, onNextTurn: () => void, isLoading: boolean, isOffline?: boolean }) => {
  const handleLogin = async () => {
    if (isOffline) {
       await loginToPuter();
       alert("Tentative de connexion. L'IA s'activera au prochain tour.");
    }
  };

  return (
    <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-gray-900/80 to-transparent z-40 flex items-center justify-between px-6 pt-2 pointer-events-none">
      <div className="flex items-center gap-4 pointer-events-auto">
        <div className="bg-white/90 backdrop-blur text-gray-900 px-4 py-2 rounded-lg shadow-lg border border-gray-400 font-serif font-bold text-lg flex items-center gap-2">
          <Clock size={18} />
          {date}
        </div>
        
        <button 
          onClick={handleLogin}
          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm border transition-all ${
            isOffline 
            ? 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 cursor-pointer' 
            : 'bg-green-100 text-green-700 border-green-300 cursor-default'
          }`}
        >
           {isOffline ? <WifiOff size={12} /> : <Wifi size={12} />}
           {isOffline ? 'OFFLINE' : 'ONLINE'}
        </button>
      </div>

      <button 
        onClick={onNextTurn}
        disabled={isLoading}
        className={`pointer-events-auto flex items-center gap-2 px-8 py-3 rounded-lg shadow-xl border-2 border-yellow-500 font-bold tracking-wider uppercase transition-all transform hover:scale-105 active:scale-95 ${
          isLoading ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-yellow-500 text-black hover:bg-yellow-400'
        }`}
      >
        {isLoading ? 'Résolution...' : 'Fin du Tour'}
        <Play size={20} fill="currentColor" />
      </button>
    </div>
  );
};

const App: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<GameState>({
    date: '...',
    turn: 0,
    playerCountry: '',
    entities: [],
    events: [],
    diplomacy: [],
    plannedActions: [],
    isLoading: false,
    gameOver: false,
    isOffline: false
  });

  const [hasStarted, setHasStarted] = useState(false);
  
  // UI Modal State
  const [activeModal, setActiveModal] = useState<'none' | 'diplomacy_hub' | 'diplomacy_new' | 'chat' | 'actions'>('none');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates | undefined>(undefined);

  // Init
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
          title: 'Mobilisation Générale',
          description: initData.startMessage,
          sourceCountry: 'Jeu',
          type: 'info'
        }]
      }));
      setHasStarted(true);
      const capital = initData.entities.find(e => e.owner === country && e.type === 'city');
      if (capital) setMapCenter({ latitude: capital.latitude, longitude: capital.longitude });
    } catch (e) { console.error(e); setGameState(prev => ({ ...prev, isLoading: false })); }
  };

  // Next Turn
  const handleNextTurn = async () => {
    if (gameState.isLoading) return;
    setGameState(prev => ({ ...prev, isLoading: true }));
    setActiveModal('none'); // Close windows

    try {
      const result = await processTurn(gameState);
      
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        date: result.newDate,
        turn: prev.turn + 1,
        entities: result.entities,
        isOffline: result.isOffline,
        diplomacy: result.updatedDiplomacy,
        events: [...result.events, ...prev.events],
        plannedActions: [] // Clear actions after execution
      }));
    } catch (e) {
      console.error(e);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Diplomacy Logic
  const createThread = (participants: string[]) => {
     const newThread: DiplomaticThread = {
       id: `thread-${Date.now()}`,
       participants,
       messages: [],
       lastUpdated: Date.now(),
       unreadCount: 0
     };
     setGameState(prev => ({...prev, diplomacy: [newThread, ...prev.diplomacy]}));
     setActiveThreadId(newThread.id);
     setActiveModal('chat');
  };

  const sendMessage = (content: string) => {
    if (!activeThreadId) return;
    setGameState(prev => ({
      ...prev,
      diplomacy: prev.diplomacy.map(t => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            messages: [...t.messages, {
              id: `msg-${Date.now()}`,
              sender: prev.playerCountry, // ou 'Player'
              content,
              timestamp: Date.now()
            }],
            lastUpdated: Date.now()
          };
        }
        return t;
      })
    }));
  };

  // Actions Logic
  const addAction = (text: string) => {
    setGameState(prev => ({
      ...prev,
      plannedActions: [...prev.plannedActions, { id: `act-${Date.now()}`, text }]
    }));
  };

  const removeAction = (id: string) => {
    setGameState(prev => ({
      ...prev,
      plannedActions: prev.plannedActions.filter(a => a.id !== id)
    }));
  };

  if (!hasStarted) return <CountrySelector onSelect={handleStartGame} />;

  // Map Data
  const mapPlaces: Place[] = gameState.entities.map(e => ({
    ...e,
    description: e.description || `${e.type} - ${e.owner}`,
    rating: e.owner,
    address: gameState.date
  }));

  const activeThread = gameState.diplomacy.find(t => t.id === activeThreadId);
  const totalUnread = gameState.diplomacy.reduce((acc, t) => acc + t.unreadCount, 0);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-900 relative font-sans text-gray-900">
      
      {/* MAP */}
      <div className="absolute inset-0 z-0">
        <Map 
          places={mapPlaces} 
          center={mapCenter} 
          selectedPlaceId={undefined}
          onMarkerClick={(id) => { /* Optional: Open generic info modal */ }}
        />
      </div>

      {/* HUD */}
      <TopBar 
        date={gameState.date} 
        onNextTurn={handleNextTurn} 
        isLoading={gameState.isLoading} 
        isOffline={gameState.isOffline} 
      />

      {/* MODALS LAYERS */}
      {activeModal === 'diplomacy_hub' && (
        <DiplomacyHub 
          threads={gameState.diplomacy}
          onClose={() => setActiveModal('none')}
          onNew={() => setActiveModal('diplomacy_new')}
          onOpenThread={(id) => { setActiveThreadId(id); setActiveModal('chat'); }}
        />
      )}

      {activeModal === 'diplomacy_new' && (
        <DiplomacyNewThreadModal 
          onClose={() => setActiveModal('diplomacy_hub')}
          onCreate={createThread}
        />
      )}

      {activeModal === 'chat' && activeThread && (
        <ChatRoom 
          thread={activeThread}
          onClose={() => setActiveModal('diplomacy_hub')}
          onSend={sendMessage}
          playerCountry={gameState.playerCountry}
        />
      )}

      {activeModal === 'actions' && (
        <ActionsModal 
          actions={gameState.plannedActions}
          onAdd={addAction}
          onRemove={removeAction}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* FABs CONTROLS */}
      <div className="absolute bottom-6 left-6 flex items-center gap-4 z-30">
        <button 
          onClick={() => setActiveModal(activeModal === 'diplomacy_hub' || activeModal === 'chat' ? 'none' : 'diplomacy_hub')}
          className="w-14 h-14 bg-white text-gray-800 rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] flex items-center justify-center border-2 border-gray-100 hover:border-blue-400 hover:text-blue-600 transition-all hover:-translate-y-1 relative"
        >
          <MessageCircle size={26} />
          {totalUnread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{totalUnread}</span>}
        </button>

        <button 
          onClick={() => setActiveModal(activeModal === 'actions' ? 'none' : 'actions')}
          className={`w-14 h-14 rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] flex items-center justify-center border-4 border-white transition-all hover:-translate-y-1 ${
            activeModal === 'actions' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-white'
          }`}
        >
          <Zap size={26} fill={activeModal === 'actions' ? "black" : "none"} />
        </button>
      </div>

    </div>
  );
};

export default App;