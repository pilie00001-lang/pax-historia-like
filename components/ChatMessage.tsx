import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Map as MapIcon } from 'lucide-react';
import { Message } from '../types';
import { PlaceCard } from './PlaceCard';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 p-6 ${isUser ? 'bg-white' : 'bg-gray-50'} border-b border-gray-100`}>
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        isUser ? 'bg-gray-200 text-gray-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
      }`}>
        {isUser ? <User size={20} /> : <Bot size={20} />}
      </div>
      
      <div className="flex-grow min-w-0 space-y-4">
        <div className="prose prose-blue max-w-none text-gray-800 leading-relaxed">
           {isUser ? (
             <p className="text-lg font-medium">{message.content}</p>
           ) : (
             <ReactMarkdown>{message.content}</ReactMarkdown>
           )}
        </div>

        {/* Display Maps Cards if available */}
        {!isUser && message.mapSources && message.mapSources.length > 0 && (
          <div className="mt-6">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              <MapIcon size={16} />
              Lieux trouvés ({message.mapSources.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {message.mapSources.map((place, idx) => (
                <PlaceCard 
                  key={place.id || idx} 
                  place={place}
                  isSelected={false}
                  onClick={() => {}}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};