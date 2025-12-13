import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Place, Coordinates } from '../types';

interface MapProps {
  places: Place[];
  center?: Coordinates;
  selectedPlaceId?: string;
  onMarkerClick: (placeId: string) => void;
}

export const Map: React.FC<MapProps> = ({ places, center, selectedPlaceId, onMarkerClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current) {
      const initialLat = center?.latitude || 48.8566; // Paris default
      const initialLng = center?.longitude || 2.3522;

      // Configuration du zoom : 
      // maxZoom: 12 pour garder l'aspect "Carte du monde/Région" et éviter de voir les rues.
      const map = L.map(mapContainerRef.current, {
        minZoom: 3,
        maxZoom: 12, 
        zoomControl: false,
        attributionControl: false // On recrée notre propre attribution plus discrète si besoin ou on laisse clean
      }).setView([initialLat, initialLng], 6);
      
      // Ajout du contrôle de zoom
      L.control.zoom({ position: 'topright' }).addTo(map);
      
      // Ajout de l'attribution manuelle en bas à droite pour rester légal mais discret
      L.control.attribution({ position: 'bottomright', prefix: false }).addAttribution('Esri, National Geographic').addTo(map);

      // Utilisation de Esri National Geographic World Map
      // C'est le style qui ressemble le plus à une carte d'Atlas ou de jeu de stratégie (Pax Historia).
      // Police Serif, couleurs "papier", pas de routes urbaines moches, frontières claires.
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup on unmount if needed
    };
  }, []);

  // Update View Center
  useEffect(() => {
    if (mapInstanceRef.current && center) {
        // Smooth fly to new center
        mapInstanceRef.current.flyTo([center.latitude, center.longitude], 8, { duration: 1.5 });
    }
  }, [center]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    const bounds = L.latLngBounds([]);

    places.forEach(place => {
      // Style Pax Historia :
      // - Forme : Losange (Diamant)
      // - Couleur : Sombre avec bordure blanche
      // - Label : Police Serif (avec empattement), halo blanc autour du texte pour lisibilité sur la carte
      
      const isSelected = place.id === selectedPlaceId;
      
      const iconHtml = `
        <div class="relative group flex flex-col items-center justify-center pointer-events-none">
          <!-- Diamond Marker (Clickable area handled by Leaflet icon size but visual is here) -->
          <div class="w-4 h-4 pointer-events-auto cursor-pointer ${isSelected ? 'bg-red-700 scale-125 z-50' : 'bg-gray-800'} border-2 border-white transform rotate-45 shadow-md transition-all duration-200 hover:scale-125 hover:bg-black"></div>
          
          <!-- Label style "Carte d'État-Major" -->
          <div class="absolute top-5 mt-1 pointer-events-none z-40 whitespace-nowrap">
             <span class="font-serif font-bold text-xs text-black tracking-wide" 
                   style="text-shadow: 2px 0 #fff, -2px 0 #fff, 0 2px #fff, 0 -2px #fff, 1px 1px #fff, -1px -1px #fff, 1px -1px #fff, -1px 1px #fff;">
               ${place.name}
             </span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'bg-transparent border-none', // Reset default leaflet styles
        html: iconHtml,
        iconSize: [40, 40], // Size of the container
        iconAnchor: [20, 20], // Center of the container
      });

      const marker = L.marker([place.latitude, place.longitude], { icon })
        .addTo(map)
        .on('click', () => onMarkerClick(place.id));

      markersRef.current[place.id] = marker;
      bounds.extend([place.latitude, place.longitude]);
    });

    // Fit bounds
    if (places.length > 0) {
      map.fitBounds(bounds, { padding: [100, 100], maxZoom: 10 });
    }

  }, [places, selectedPlaceId, onMarkerClick]);

  // Fond bleu "Mer" pour matcher les tuiles pendant le chargement
  return <div ref={mapContainerRef} className="w-full h-full bg-[#A5BFDD]" />;
};