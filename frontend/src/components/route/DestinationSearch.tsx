import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { GeocodingService } from '../../services/geocodingService';
import type { RouteCoordinates } from '../../types';

interface DestinationSearchProps {
  label?: string;
  placeholder?: string;
  value?: RouteCoordinates | null;
  onSelect: (coords: RouteCoordinates) => void;
  className?: string;
  initialText?: string;
}

export const DestinationSearch: React.FC<DestinationSearchProps> = ({
  label = 'Destination',
  placeholder = 'Search street, landmark, or place name...',
  value,
  onSelect,
  className = '',
  initialText = '',
}) => {
  const [query, setQuery] = useState(initialText || value?.label || '');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync if external value changes
  useEffect(() => {
    if (value?.label && value.label !== query) {
      setQuery(value.label);
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    // If query matches current selected label exactly, don't trigger search
    if (value?.label && value.label === query) {
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const matches = await GeocodingService.searchLocation(query);
        setResults(matches);
        setIsOpen(true);
      } catch (err) {
        console.warn('Geocoding search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [query, value]);

  const handleSelectResult = (item: any) => {
    const shortLabel = item.name || item.displayName.split(',')[0];
    setQuery(shortLabel);
    setIsOpen(false);
    onSelect({
      latitude: item.latitude,
      longitude: item.longitude,
      label: item.displayName || shortLabel,
    });
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden max-h-64 overflow-y-auto">
          <div className="p-1.5 space-y-0.5">
            {results.map((item, idx) => (
              <button
                key={`${item.latitude}-${item.longitude}-${idx}`}
                type="button"
                onClick={() => handleSelectResult(item)}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 flex items-start gap-2.5 text-xs transition group"
              >
                <div className="mt-0.5 p-1 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-200 group-hover:text-white truncate">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.displayName}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 p-3.5 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-xl backdrop-blur-md text-center text-xs text-slate-400">
          No matching locations found for "{query}". Try entering a nearby landmark or street name.
        </div>
      )}
    </div>
  );
};

export default DestinationSearch;
