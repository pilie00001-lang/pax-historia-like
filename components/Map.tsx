import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapEntity, Place } from '../types';

interface MapProps {
  places: Place[]; // On garde le nom "places" pour compatibilité, mais ce sont des MapEntities
  center?: { latitude: number; longitude: number };
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
      const initialLat = center?.latitude || 48.8566;
      const initialLng = center?.longitude || 2.3522;

      const map = L.map(mapContainerRef.current, {
        minZoom: 3,
        maxZoom: 10, // Zoom restreint pour effet "Carte d'État-Major"
        zoomControl: false,
        attributionControl: false
      }).setView([initialLat, initialLng], 5);
      
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Fond de carte "Papier / Historique" (Esri National Geographic ou similaire)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16
      }).addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  // Update View Center
  useEffect(() => {
    if (mapInstanceRef.current && center) {
        mapInstanceRef.current.flyTo([center.latitude, center.longitude], 6, { duration: 1.5 });
    }
  }, [center]);

  // Render Entities
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    places.forEach((entity: any) => { // Cast as any to access entity specific props if needed
      const isSelected = entity.id === selectedPlaceId;
      
      // Determine Color based on Owner (Simple Hash or logic)
      let colorClass = 'bg-gray-700';
      if (['France', 'USA', 'UK', 'Alliés'].includes(entity.owner)) colorClass = 'bg-blue-600';
      else if (['Allemagne', 'Italie', 'Japon', 'Axe'].includes(entity.owner)) colorClass = 'bg-red-700';
      else if (['URSS', 'Soviétiques'].includes(entity.owner)) colorClass = 'bg-red-900';
      else colorClass = 'bg-yellow-600'; // Neutre

      // Icon Shape based on Type
      let iconHtml = '';
      if (entity.type === 'army') {
        // NATO Style Unit Symbol (Rectangle)
        iconHtml = `
          <div class="relative group cursor-pointer">
            <div class="w-8 h-6 ${colorClass} border-2 border-white shadow-md flex items-center justify-center transform transition-transform hover:scale-110 ${isSelected ? 'ring-2 ring-yellow-400 scale-110' : ''}">
              <span class="text-[10px] font-bold text-white">XX</span> 
            </div>
            <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[8px] px-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100">
              ${entity.name} (${entity.owner})
            </div>
          </div>
        `;
      } else if (entity.type === 'base') {
        // Triangle for Base
        iconHtml = `
          <div class="relative group cursor-pointer">
             <div class="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-${colorClass.replace('bg-', '')} filter drop-shadow-md ${isSelected ? 'scale-125' : ''}"></div>
             <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[8px] px-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100">
               ${entity.name}
             </div>
          </div>
        `;
      } else {
        // Circle for Cities (Default)
        iconHtml = `
          <div class="relative group flex flex-col items-center justify-center">
            <div class="w-4 h-4 ${colorClass} border-2 border-white rounded-full shadow-md ${isSelected ? 'ring-4 ring-white/50 scale-125' : ''}"></div>
            <div class="mt-1">
               <span class="font-serif font-bold text-[10px] text-black bg-white/80 px-1 rounded shadow-sm" style="text-shadow: none;">
                 ${entity.name}
               </span>
            </div>
          </div>
        `;
      }

      const icon = L.divIcon({
        className: 'bg-transparent border-none',
        html: iconHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([entity.latitude, entity.longitude], { icon })
        .addTo(map)
        .on('click', () => onMarkerClick(entity.id));

      markersRef.current[entity.id] = marker;
    });

  }, [places, selectedPlaceId, onMarkerClick]);

  return <div ref={mapContainerRef} className="w-full h-full bg-[#A5BFDD]" />;
};