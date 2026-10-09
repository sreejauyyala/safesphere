import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, X, AlertCircle } from 'lucide-react';
import GeocodingService from '../../services/geocodingService';
import type { SearchResultLocation } from '../../types';

interface MapSearchProps {
  onLocationSelect: (location: SearchResultLocation) => void;
  onClearSearch?: () => void;
  className?: string;
}

export const MapSearch: React.FC<MapSearchProps> = ({
  onLocationSelect,
  onClearSearch,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced geocoding search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const found = await GeocodingService.searchLocation(query);
        setResults(found);
        setIsOpen(true);
        if (found.length === 0) {
          setError('No locations found matching your search.');
        }
      } catch (err) {
        setError('Unable to search this location. Please try again.');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 450); // 450ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (loc: SearchResultLocation) => {
    onLocationSelect(loc);
    setQuery(loc.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setError(null);
    setIsOpen(false);
    if (onClearSearch) onClearSearch();
  };

  return (
    <div ref={containerRef} className={`relative z-[1500] ${className}`}>
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search location (e.g. Residency Road, Station)..."
          className="w-full pl-10 pr-9 py-2.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-400 shadow-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
        />

        {isLoading ? (
          <Loader2 className="w-4 h-4 text-blue-400 absolute right-3 animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && (results.length > 0 || error) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden py-1.5 animate-fade-in max-h-60 overflow-y-auto">
          {error && results.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            results.map((loc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(loc)}
                className="w-full px-3.5 py-2.5 text-left text-xs hover:bg-slate-800/80 transition flex items-start gap-2.5 border-b border-slate-800/40 last:border-0"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-semibold text-white block truncate">{loc.name}</span>
                  <span className="text-[11px] text-slate-400 block truncate leading-tight mt-0.5">
                    {loc.displayName}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MapSearch;
