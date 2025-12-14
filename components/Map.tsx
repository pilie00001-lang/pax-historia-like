import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Place } from '../types';

interface MapProps {
  places: Place[];
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
      const safeLat = (center?.latitude && !isNaN(center.latitude)) ? center.latitude : 48.8566;
      const safeLng = (center?.longitude && !isNaN(center.longitude)) ? center.longitude : 2.3522;

      const map = L.map(mapContainerRef.current, {
        minZoom: 3,
        maxZoom: 10,
        zoomControl: false,
        attributionControl: false
      }).setView([safeLat, safeLng], 5);
      
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Tiles &copy; Esri &mdash; National Geographic'
      }).addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  // Update View Center
  useEffect(() => {
    if (mapInstanceRef.current && center) {
        if (typeof center.latitude === 'number' && !isNaN(center.latitude) && 
            typeof center.longitude === 'number' && !isNaN(center.longitude)) {
            mapInstanceRef.current.flyTo([center.latitude, center.longitude], 6, { duration: 1.5 });
        }
    }
  }, [center]);

  // Render Entities
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old markers
    Object.values(markersRef.current).forEach((marker: L.Marker) => marker.remove());
    markersRef.current = {};

    places.forEach((entity: any) => {
      // SÉCURITÉ : Coordonnées valides
      if (typeof entity.latitude !== 'number' || isNaN(entity.latitude) || 
          typeof entity.longitude !== 'number' || isNaN(entity.longitude)) {
          return;
      }
      
      const isSelected = entity.id === selectedPlaceId;
      const owner = entity.owner ? entity.owner.toLowerCase() : 'unknown';
      
      // Determine Color based on country names (flexible matching)
      let colorClass = 'bg-gray-600'; // Default Neutral
      
      if (owner.includes('france') || owner.includes('alliés') || owner.includes('uk') || owner.includes('royaume-uni') || owner.includes('pologne')) {
          colorClass = 'bg-blue-600';
      } else if (owner.includes('allemagne') || owner.includes('reich') || owner.includes('axe') || owner.includes('italie') || owner.includes('hongrie')) {
          colorClass = 'bg-red-700';
      } else if (owner.includes('urss') || owner.includes('soviétique') || owner.includes('russie')) {
          colorClass = 'bg-red-900';
      } else if (owner.includes('usa') || owner.includes('amérique')) {
          colorClass = 'bg-blue-500';
      } else if (owner.includes('japon') || owner.includes('nippon')) {
          colorClass = 'bg-white border-2 border-red-600 text-red-600'; // Special Japan style
      } else if (owner.includes('chine')) {
          colorClass = 'bg-yellow-600';
      } else if (owner.includes('espagne')) {
          colorClass = 'bg-orange-600';
      }

      // Icon Shape Generation
      let iconHtml = '';
      
      // ARMY UNIT
      if (entity.type === 'army') {
        const isJapan = owner.includes('japon');
        const bgColor = isJapan ? 'bg-white' : colorClass;
        const textColor = isJapan ? 'text-red-600' : 'text-white';
        const borderColor = isJapan ? 'border-red-600' : 'border-white';

        iconHtml = `
          <div class="relative group cursor-pointer transition-transform hover:scale-110 ${isSelected ? 'scale-110 z-50' : 'z-10'}">
            <div class="w-10 h-7 ${bgColor} border-2 ${borderColor} shadow-lg flex items-center justify-center ${isSelected ? 'ring-2 ring-yellow-400' : ''}">
              <div class="w-full h-full flex flex-col items-center justify-center">
                 <div class="text-[8px] font-bold ${textColor} leading-none">XX</div>
                 <div class="text-[6px] ${textColor} opacity-80 leading-none mt-0.5">INF</div>
              </div>
            </div>
            <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
              ${entity.name} (${entity.owner})
            </div>
          </div>
        `;
      } 
      // CITY / BASE
      else {
        const isCapital = entity.description && entity.description.toLowerCase().includes('capitale');
        const size = isCapital ? 'w-5 h-5' : 'w-3 h-3';
        const ring = isSelected ? 'ring-4 ring-white/50 scale-125' : '';
        
        iconHtml = `
          <div class="relative group flex flex-col items-center justify-center cursor-pointer">
            <div class="${size} ${colorClass} border-2 border-white rounded-full shadow-md ${ring} transition-transform hover:scale-125"></div>
            ${(isCapital || isSelected) ? `
            <div class="mt-1">
               <span class="font-serif font-bold text-[10px] text-gray-900 bg-white/90 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap border border-gray-300">
                 ${entity.name}
               </span>
            </div>` : ''}
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

  return <div ref={mapContainerRef} className="w-full h-full bg-[#A5BFDD] z-0" />;
};