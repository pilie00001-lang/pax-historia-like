import React from 'react';
import { MapPin, Star, ExternalLink, Navigation } from 'lucide-react';
import { Place } from '../types';

interface PlaceCardProps {
  place: Place;
  isSelected: boolean;
  onClick: () => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place, isSelected, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
        isSelected 
          ? 'bg-blue-50 border-blue-200 shadow-sm' 
          : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
      }`}
    >
      <div className="flex justify-between items-start">
        <h3 className={`font-semibold text-base ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
          {place.name}
        </h3>
        {place.rating && (
          <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded text-yellow-700 text-xs font-medium">
            <span>{place.rating}</span>
            <Star size={10} className="fill-current" />
          </div>
        )}
      </div>
      
      <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
        {place.description}
      </p>
      
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
        <MapPin size={12} />
        <span className="truncate max-w-[180px]">{place.address || "Adresse non disponible"}</span>
      </div>

      {place.sourceUri && (
        <a 
          href={place.sourceUri}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <ExternalLink size={10} />
          Voir sur Google Maps
        </a>
      )}
    </div>
  );
};