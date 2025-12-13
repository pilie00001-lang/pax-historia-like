import React, { useState } from 'react';
import { Search, Loader2, Navigation, MapPin } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  hasLocation: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading, hasLocation }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSearch(input.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center bg-white rounded-lg shadow-sm border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
        <div className="pl-3 text-gray-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Restaurants, musées..."
          className="w-full py-3 px-3 text-gray-800 bg-transparent border-none focus:outline-none placeholder-gray-400 text-sm font-medium"
          disabled={isLoading}
        />
        <div className="pr-2 flex items-center">
          {isLoading && (
            <Loader2 size={18} className="animate-spin text-blue-500 mr-2" />
          )}
          {hasLocation && !isLoading && (
             <Navigation size={14} className="text-green-500 mr-2" fill="currentColor" />
          )}
        </div>
      </div>
    </form>
  );
};