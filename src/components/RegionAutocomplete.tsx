import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface RegionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onEnter?: () => void;
  hideIcon?: boolean;
}

export default function RegionAutocomplete({ value, onChange, placeholder, className, onEnter, hideIcon }: RegionAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2 && query !== value) {
        searchRegions(query);
      } else {
        setSuggestions([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query, value]);

  const searchRegions = async (searchQuery: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&accept-language=en&limit=10&featuretype=settlement`);
      const data = await res.json();
      
      const formattedData = data.map((item: any) => {
        const address = item.address || {};
        const city = address.city || address.town || address.village || address.hamlet || address.municipality || address.county;
        const state = address.state || address.province || address.region;
        const country = address.country;
        
        const parts = [city, state, country].filter(Boolean);
        const uniqueParts = parts.filter((v, i, a) => a.indexOf(v) === i);
        
        const cleanName = uniqueParts.join(', ') || item.display_name;
        return { ...item, cleanName };
      });
      
      // Deduplicate by cleanName
      const unique = formattedData.filter((v: any, i: number, a: any[]) => a.findIndex(t => (t.cleanName === v.cleanName)) === i).slice(0, 5);
      
      setSuggestions(unique);
      setShowSuggestions(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (suggestion: any) => {
    setQuery(suggestion.cleanName);
    onChange(suggestion.cleanName);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        handleSelect(suggestions[0]);
      } else {
        onChange(query);
        if (onEnter) onEnter();
      }
    }
  };

  return (
    <div className={cn("relative", className)} ref={wrapperRef}>
      {!hideIcon && <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />}
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowSuggestions(true);
          if (e.target.value === '') {
            onChange('');
          }
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        className={cn(
          "w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pr-10 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all",
          !hideIcon ? "pl-11" : "pl-4"
        )}
      />
      {isSearching && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      )}
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800 text-sm text-slate-700 dark:text-zinc-300 transition-colors border-b border-slate-100 dark:border-zinc-800/50 last:border-0"
            >
              {suggestion.cleanName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
